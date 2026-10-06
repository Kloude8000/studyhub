const request = require("supertest");
const app = require("../app");
const db = require("../config/db");

const SEED_PASSWORD = "password123";

let studentToken;
let adminToken;
let lecturerToken;
let enrolledCourseId;
let unenrolledCourseId;
let seedReady = false;


const login = (email) =>
    request(app)
        .post("/api/auth/login")
        .send({ email, password: SEED_PASSWORD });


const requireSeed = () => {
    if (!seedReady) {
        throw new Error(
            "Seed data not loaded — run backend/schema.sql and backend/seed.sql"
        );
    }
};


beforeAll(async () => {

    const studentRes = await login("student@studyhub.test");

    if (studentRes.status !== 200) {
        console.warn(
            "Seed users unavailable — seed-dependent tests will fail. " +
            "Run schema.sql and seed.sql, then retry npm test."
        );
        return;
    }

    seedReady = true;
    studentToken = studentRes.body.token;

    const adminRes = await login("admin@studyhub.test");
    adminToken = adminRes.body.token;

    const lecturerRes = await login("lecturer@studyhub.test");
    lecturerToken = lecturerRes.body.token;

    const coursesRes = await request(app).get("/api/courses");
    enrolledCourseId = coursesRes.body.find(
        (course) => course.course_code === "CS101"
    )?.course_id;

    unenrolledCourseId = coursesRes.body.find(
        (course) => course.course_code === "CS201"
    )?.course_id;

});


afterAll((done) => {
    db.end(done);
});


describe("StudyHub API", () => {

    test("GET / returns health message", async () => {

        const res = await request(app).get("/");

        expect(res.status).toBe(200);
        expect(res.text).toBe("StudyHub API Running");

    });


    describe("Auth", () => {

        test("rejects elevated role on public registration", async () => {

            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    full_name: "Bad Actor",
                    email: `bad-${Date.now()}@studyhub.test`,
                    password: "password123",
                    role: "admin"
                });

            expect(res.status).toBe(400);

        });


        test("registers a student account", async () => {

            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    full_name: "New Student",
                    email: `student-${Date.now()}@studyhub.test`,
                    password: "password123"
                });

            expect(res.status).toBe(201);
            expect(res.body.userId).toBeDefined();

        });


        test("rejects unauthenticated profile access", async () => {

            const res = await request(app).get("/api/auth/profile");

            expect(res.status).toBe(401);

        });


        test("rejects non-admin lecturer creation", async () => {

            requireSeed();

            const res = await request(app)
                .post("/api/auth/users/lecturer")
                .set("Authorization", `Bearer ${studentToken}`)
                .send({
                    full_name: "Unauthorized Lecturer",
                    email: `unauth-${Date.now()}@studyhub.test`,
                    password: "password123"
                });

            expect(res.status).toBe(403);

        });


        test("allows admin to create a lecturer", async () => {

            requireSeed();

            const res = await request(app)
                .post("/api/auth/users/lecturer")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    full_name: "Extra Lecturer",
                    email: `lecturer-${Date.now()}@studyhub.test`,
                    password: "password123"
                });

            expect(res.status).toBe(201);
            expect(res.body.userId).toBeDefined();

        });

    });


    describe("Enrollments", () => {

        test("rejects duplicate enrollment", async () => {

            requireSeed();

            const res = await request(app)
                .post(`/api/enrollments/enroll/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/already enrolled/i);

        });


        test("allows course owner to view enrollments", async () => {

            requireSeed();

            const res = await request(app)
                .get(`/api/enrollments/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${lecturerToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);

        });


        test("denies other lecturers access to course enrollments", async () => {

            requireSeed();

            const otherEmail = `other-lecturer-${Date.now()}@studyhub.test`;

            const createRes = await request(app)
                .post("/api/auth/users/lecturer")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    full_name: "Other Lecturer",
                    email: otherEmail,
                    password: "password123"
                });

            expect(createRes.status).toBe(201);

            const otherLogin = await login(otherEmail);
            expect(otherLogin.status).toBe(200);

            const res = await request(app)
                .get(`/api/enrollments/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${otherLogin.body.token}`);

            expect(res.status).toBe(403);

        });


        test("allows student to unenroll from a course", async () => {

            requireSeed();

            const enrollRes = await request(app)
                .post(`/api/enrollments/enroll/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(enrollRes.status).toBe(201);

            const unenrollRes = await request(app)
                .delete(`/api/enrollments/unenroll/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(unenrollRes.status).toBe(200);
            expect(unenrollRes.body.message).toMatch(/unenrolled/i);

            const myEnrollmentsRes = await request(app)
                .get("/api/enrollments/my-enrollments")
                .set("Authorization", `Bearer ${studentToken}`);

            const stillEnrolled = myEnrollmentsRes.body.some(
                (course) => course.course_id === unenrolledCourseId
            );
            expect(stillEnrolled).toBe(false);

        });


        test("rejects unenroll when student is not enrolled", async () => {

            requireSeed();

            const res = await request(app)
                .delete(`/api/enrollments/unenroll/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(res.status).toBe(404);
            expect(res.body.message).toMatch(/not enrolled/i);

        });


        test("denies resource access after unenroll", async () => {

            requireSeed();

            await request(app)
                .post(`/api/enrollments/enroll/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            await request(app)
                .delete(`/api/enrollments/unenroll/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            const res = await request(app)
                .get(`/api/resources/course/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(res.status).toBe(403);

        });

    });


    describe("Resources", () => {

        test("allows enrolled student to list course resources", async () => {

            requireSeed();

            const res = await request(app)
                .get(`/api/resources/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);

        });


        test("denies unenrolled student access to course resources", async () => {

            requireSeed();

            const res = await request(app)
                .get(`/api/resources/course/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(res.status).toBe(403);

        });


        test("requires authentication for course resources", async () => {

            requireSeed();

            const res = await request(app)
                .get(`/api/resources/course/${enrolledCourseId}`);

            expect(res.status).toBe(401);

        });


        test("allows enrolled student to download a resource", async () => {

            requireSeed();

            const path = require("path");

            const uploadRes = await request(app)
                .post(`/api/resources/upload/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${lecturerToken}`)
                .field("title", "Test Resource")
                .attach(
                    "file",
                    path.join(__dirname, "fixtures", "sample.pdf")
                );

            expect(uploadRes.status).toBe(201);

            const resourceId = uploadRes.body.resource.resource_id;

            const downloadRes = await request(app)
                .get(`/api/resources/${resourceId}/download`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(downloadRes.status).toBe(200);
            expect(downloadRes.headers["content-disposition"]).toMatch(/attachment/i);

        });


        test("allows enrolled student to view a resource inline", async () => {

            requireSeed();

            const path = require("path");

            const uploadRes = await request(app)
                .post(`/api/resources/upload/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${lecturerToken}`)
                .field("title", "Viewable Resource")
                .attach(
                    "file",
                    path.join(__dirname, "fixtures", "sample.pdf")
                );

            expect(uploadRes.status).toBe(201);

            const resourceId = uploadRes.body.resource.resource_id;

            const viewRes = await request(app)
                .get(`/api/resources/${resourceId}/view`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(viewRes.status).toBe(200);
            expect(viewRes.headers["content-disposition"]).toMatch(/inline/i);
            expect(viewRes.headers["content-type"]).toMatch(/pdf/i);

            const listRes = await request(app)
                .get(`/api/resources/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            const viewed = listRes.body.find((item) => item.resource_id === resourceId);
            expect(viewed).toBeDefined();
            expect(viewed.viewed).toBe(true);
            expect(viewed.view_count).toBeGreaterThan(0);

        });


        test("denies unenrolled student resource download", async () => {

            requireSeed();

            const path = require("path");

            const uploadRes = await request(app)
                .post(`/api/resources/upload/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${lecturerToken}`)
                .field("title", "Protected Resource")
                .attach(
                    "file",
                    path.join(__dirname, "fixtures", "sample.pdf")
                );

            expect(uploadRes.status).toBe(201);

            const resourceId = uploadRes.body.resource.resource_id;

            const downloadRes = await request(app)
                .get(`/api/resources/${resourceId}/download`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(downloadRes.status).toBe(403);

        });


        test("blocks direct static access to uploaded files", async () => {

            const res = await request(app).get("/uploads/resources/sample.pdf");

            expect(res.status).toBe(404);

        });

    });


    describe("Courses", () => {

        test("allows admin to update any course", async () => {

            requireSeed();

            const courseRes = await request(app)
                .get(`/api/courses/${unenrolledCourseId}`);

            const course = courseRes.body;

            const res = await request(app)
                .put(`/api/courses/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    course_code: course.course_code,
                    course_title: course.course_title,
                    description: course.description
                });

            expect(res.status).toBe(200);

        });


        test("returns all courses for admin my-courses", async () => {

            requireSeed();

            const allCoursesRes = await request(app).get("/api/courses");
            const myCoursesRes = await request(app)
                .get("/api/courses/my-courses")
                .set("Authorization", `Bearer ${adminToken}`);

            expect(myCoursesRes.status).toBe(200);
            expect(myCoursesRes.body.length).toBe(allCoursesRes.body.length);

        });


        test("allows admin to reassign course lecturer", async () => {

            requireSeed();

            const courseRes = await request(app)
                .get(`/api/courses/${unenrolledCourseId}`);

            const course = courseRes.body;
            const originalLecturerId = course.lecturer_id;

            const otherEmail = `reassign-lecturer-${Date.now()}@studyhub.test`;

            const createRes = await request(app)
                .post("/api/auth/users/lecturer")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    full_name: "Reassign Target Lecturer",
                    email: otherEmail,
                    password: "password123"
                });

            expect(createRes.status).toBe(201);

            const otherLogin = await login(otherEmail);
            expect(otherLogin.status).toBe(200);
            const otherLecturerId = otherLogin.body.user.user_id;

            const updateRes = await request(app)
                .put(`/api/courses/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    course_code: course.course_code,
                    course_title: course.course_title,
                    description: course.description,
                    lecturer_id: otherLecturerId
                });

            expect(updateRes.status).toBe(200);

            const oldLecturerAccess = await request(app)
                .get(`/api/enrollments/course/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${lecturerToken}`);

            expect(oldLecturerAccess.status).toBe(403);

            const newLecturerAccess = await request(app)
                .get(`/api/enrollments/course/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${otherLogin.body.token}`);

            expect(newLecturerAccess.status).toBe(200);

            await request(app)
                .put(`/api/courses/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    course_code: course.course_code,
                    course_title: course.course_title,
                    description: course.description,
                    lecturer_id: originalLecturerId
                });

        });


        test("rejects invalid lecturer reassignment", async () => {

            requireSeed();

            const courseRes = await request(app)
                .get(`/api/courses/${unenrolledCourseId}`);

            const course = courseRes.body;

            const res = await request(app)
                .put(`/api/courses/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    course_code: course.course_code,
                    course_title: course.course_title,
                    description: course.description,
                    lecturer_id: 999999
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/invalid lecturer/i);

        });


        test("deletes a course that has students and resources", async () => {

            requireSeed();

            const path = require("path");
            const stamp = Date.now();

            const createRes = await request(app)
                .post("/api/courses/create")
                .set("Authorization", `Bearer ${lecturerToken}`)
                .send({
                    course_code: `DEL${String(stamp).slice(-6)}`,
                    course_title: "Delete With Dependents",
                    description: "Temporary course"
                });

            expect(createRes.status).toBe(201);
            const courseId = createRes.body.course_id;

            const registerRes = await request(app)
                .post("/api/auth/register")
                .send({
                    full_name: "Course Delete Student",
                    email: `course-del-${stamp}@studyhub.test`,
                    student_id: `CD${String(stamp).slice(-8)}`,
                    password: "password123"
                });

            expect(registerRes.status).toBe(201);

            const enrolRes = await request(app)
                .post(`/api/enrollments/course/${courseId}/students`)
                .set("Authorization", `Bearer ${lecturerToken}`)
                .send({ student_id: registerRes.body.userId });

            expect(enrolRes.status).toBe(201);

            const uploadRes = await request(app)
                .post(`/api/resources/upload/${courseId}`)
                .set("Authorization", `Bearer ${lecturerToken}`)
                .field("title", "Delete Course Resource")
                .attach("file", path.join(__dirname, "fixtures", "sample.pdf"));

            expect(uploadRes.status).toBe(201);

            const deleteRes = await request(app)
                .delete(`/api/courses/${courseId}`)
                .set("Authorization", `Bearer ${lecturerToken}`);

            expect(deleteRes.status).toBe(200);

            const getRes = await request(app).get(`/api/courses/${courseId}`);
            expect(getRes.status).toBe(404);

        });


        test("denies students deleting a course", async () => {

            requireSeed();

            const res = await request(app)
                .delete(`/api/courses/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(res.status).toBe(403);

        });

    });


    describe("Progress", () => {

        test("allows enrolled student to add a learning log", async () => {

            requireSeed();

            const topicRes = await request(app)
                .post(`/api/courses/${enrolledCourseId}/topics`)
                .set("Authorization", `Bearer ${lecturerToken}`)
                .send({ title: `Integration topic ${Date.now()}` });

            expect(topicRes.status).toBe(201);

            const res = await request(app)
                .post("/api/progress/log")
                .set("Authorization", `Bearer ${studentToken}`)
                .send({
                    course_id: enrolledCourseId,
                    topic_id: topicRes.body.topic.topic_id,
                    study_duration: 30,
                    notes: "Automated test",
                    log_date: "2026-05-30"
                });

            expect(res.status).toBe(201);
            expect(res.body.progress).toBeDefined();
            expect(Number(res.body.progress.completion_percentage)).toBeGreaterThan(0);

        });


        test("allows enrolled student to update a learning log", async () => {

            requireSeed();

            const topicRes = await request(app)
                .post(`/api/courses/${enrolledCourseId}/topics`)
                .set("Authorization", `Bearer ${lecturerToken}`)
                .send({ title: `Edit topic ${Date.now()}` });

            expect(topicRes.status).toBe(201);

            const createRes = await request(app)
                .post("/api/progress/log")
                .set("Authorization", `Bearer ${studentToken}`)
                .send({
                    course_id: enrolledCourseId,
                    topic_id: topicRes.body.topic.topic_id,
                    study_duration: 20,
                    notes: "Original notes",
                    log_date: "2026-05-30"
                });

            expect(createRes.status).toBe(201);

            const logsRes = await request(app)
                .get(`/api/progress/logs/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            const logToEdit = logsRes.body.find(
                (log) => log.topic_id === topicRes.body.topic.topic_id
            );

            expect(logToEdit).toBeDefined();

            const updateRes = await request(app)
                .put(`/api/progress/log/${logToEdit.log_id}`)
                .set("Authorization", `Bearer ${studentToken}`)
                .send({
                    study_duration: 45,
                    notes: "Updated notes",
                    log_date: "2026-05-29"
                });

            expect(updateRes.status).toBe(200);
            expect(updateRes.body.log.study_duration).toBe(45);
            expect(updateRes.body.progress).toBeDefined();

        });


        test("rejects a second log for the same topic", async () => {

            requireSeed();

            const topicsRes = await request(app)
                .get(`/api/courses/${enrolledCourseId}/topics`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(topicsRes.status).toBe(200);

            const usedTopic = topicsRes.body.find((topic) => topic.title === "Variables and Data Types");
            expect(usedTopic).toBeDefined();

            const res = await request(app)
                .post("/api/progress/log")
                .set("Authorization", `Bearer ${studentToken}`)
                .send({
                    course_id: enrolledCourseId,
                    topic_id: usedTopic.topic_id,
                    study_duration: 10,
                    log_date: "2026-05-30"
                });

            expect(res.status).toBe(400);

        });


        test("denies learning log for unenrolled course", async () => {

            requireSeed();

            const topicsRes = await request(app)
                .get(`/api/courses/${unenrolledCourseId}/topics`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(topicsRes.status).toBe(403);

            const lecturerTopics = await request(app)
                .get(`/api/courses/${unenrolledCourseId}/topics`)
                .set("Authorization", `Bearer ${lecturerToken}`);

            const res = await request(app)
                .post("/api/progress/log")
                .set("Authorization", `Bearer ${studentToken}`)
                .send({
                    course_id: unenrolledCourseId,
                    topic_id: lecturerTopics.body[0].topic_id,
                    study_duration: 10,
                    log_date: "2026-05-30"
                });

            expect(res.status).toBe(403);

        });


        test("refuses to delete a topic that has student logs", async () => {

            requireSeed();

            const topicsRes = await request(app)
                .get(`/api/courses/${enrolledCourseId}/topics`)
                .set("Authorization", `Bearer ${lecturerToken}`);

            const usedTopic = topicsRes.body.find((topic) => topic.title === "Variables and Data Types");

            const res = await request(app)
                .delete(`/api/courses/${enrolledCourseId}/topics/${usedTopic.topic_id}`)
                .set("Authorization", `Bearer ${lecturerToken}`);

            expect(res.status).toBe(409);

        });


        test("marks a course complete when every topic is logged", async () => {

            requireSeed();

            const topicsRes = await request(app)
                .get(`/api/courses/${enrolledCourseId}/topics`)
                .set("Authorization", `Bearer ${studentToken}`);

            const logsRes = await request(app)
                .get(`/api/progress/logs/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            const loggedIds = new Set(logsRes.body.map((log) => Number(log.topic_id)));
            const remaining = topicsRes.body.filter((topic) => !loggedIds.has(Number(topic.topic_id)));

            let lastRes;
            for (const topic of remaining) {
                lastRes = await request(app)
                    .post("/api/progress/log")
                    .set("Authorization", `Bearer ${studentToken}`)
                    .send({
                        course_id: enrolledCourseId,
                        topic_id: topic.topic_id,
                        study_duration: 15,
                        log_date: "2026-06-01"
                    });
                expect(lastRes.status).toBe(201);
            }

            expect(lastRes.body.progress.completed_at).toBeTruthy();
            expect(Number(lastRes.body.progress.completion_percentage)).toBe(100);

        });


        test("allows course owner to view course progress", async () => {

            requireSeed();

            const res = await request(app)
                .get(`/api/progress/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${lecturerToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty("topics_total");
            expect(res.body[0]).toHaveProperty("status");

        });


        test("denies other lecturers access to course progress", async () => {

            requireSeed();

            const otherEmail = `progress-lecturer-${Date.now()}@studyhub.test`;

            await request(app)
                .post("/api/auth/users/lecturer")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    full_name: "Progress Lecturer",
                    email: otherEmail,
                    password: "password123"
                });

            const otherLogin = await login(otherEmail);

            const res = await request(app)
                .get(`/api/progress/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${otherLogin.body.token}`);

            expect(res.status).toBe(403);

        });


        test("returns student journal entries", async () => {

            requireSeed();

            const res = await request(app)
                .get("/api/progress/logs")
                .set("Authorization", `Bearer ${studentToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty("notes");
            expect(res.body[0]).toHaveProperty("topic");

        });


        test("returns journal entries for enrolled course", async () => {

            requireSeed();

            const res = await request(app)
                .get(`/api/progress/logs/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.every(
                (log) => log.course_id === enrolledCourseId
            )).toBe(true);

        });


        test("denies journal access for unenrolled course", async () => {

            requireSeed();

            const res = await request(app)
                .get(`/api/progress/logs/course/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(res.status).toBe(403);

        });

    });


    describe("Notifications", () => {

        test("rejects unauthenticated access", async () => {

            const res = await request(app).get("/api/notifications");

            expect(res.status).toBe(401);

        });


        test("returns the current user's inbox", async () => {

            requireSeed();

            const res = await request(app)
                .get("/api/notifications")
                .set("Authorization", `Bearer ${studentToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);

        });


        test("returns an unread count", async () => {

            requireSeed();

            const res = await request(app)
                .get("/api/notifications/unread-count")
                .set("Authorization", `Bearer ${studentToken}`);

            expect(res.status).toBe(200);
            expect(typeof res.body.unread).toBe("number");

        });

    });


    describe("Announcements", () => {

        test("lets a lecturer post a course announcement", async () => {

            requireSeed();

            const title = `Lab reminder ${Date.now()}`;

            const res = await request(app)
                .post(`/api/announcements/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${lecturerToken}`)
                .send({
                    title,
                    body: "Bring your notes."
                });

            expect(res.status).toBe(201);
            expect(res.body.announcement_id).toBeDefined();

            const listRes = await request(app)
                .get(`/api/announcements/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(listRes.status).toBe(200);
            expect(listRes.body.some((item) => item.title === title)).toBe(true);

        });


        test("denies students posting course announcements", async () => {

            requireSeed();

            const res = await request(app)
                .post(`/api/announcements/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`)
                .send({ title: "Student post" });

            expect(res.status).toBe(403);

        });


        test("lets an admin post a platform announcement", async () => {

            requireSeed();

            const title = `Platform note ${Date.now()}`;

            const res = await request(app)
                .post("/api/announcements/platform")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ title });

            expect(res.status).toBe(201);

            const listRes = await request(app)
                .get("/api/announcements/platform")
                .set("Authorization", `Bearer ${studentToken}`);

            expect(listRes.status).toBe(200);
            expect(listRes.body.some((item) => item.title === title)).toBe(true);

        });


        test("lets a lecturer edit a course announcement without a new post", async () => {

            requireSeed();

            const createRes = await request(app)
                .post(`/api/announcements/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${lecturerToken}`)
                .send({ title: `Draft ${Date.now()}`, body: "Draft body" });

            expect(createRes.status).toBe(201);

            const updatedTitle = `Updated ${Date.now()}`;
            const updateRes = await request(app)
                .put(`/api/announcements/${createRes.body.announcement_id}`)
                .set("Authorization", `Bearer ${lecturerToken}`)
                .send({ title: updatedTitle, body: "Corrected details." });

            expect(updateRes.status).toBe(200);

            const listRes = await request(app)
                .get(`/api/announcements/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(listRes.body.some((item) => item.title === updatedTitle)).toBe(true);

        });


        test("denies students editing announcements", async () => {

            requireSeed();

            const listRes = await request(app)
                .get(`/api/announcements/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${lecturerToken}`);

            const announcement = listRes.body[0];
            if (!announcement) return;

            const res = await request(app)
                .put(`/api/announcements/${announcement.announcement_id}`)
                .set("Authorization", `Bearer ${studentToken}`)
                .send({ title: "Hacked title" });

            expect(res.status).toBe(403);

        });

    });


    describe("Staff enrolment", () => {

        test("lets a lecturer enrol an existing student", async () => {

            requireSeed();

            const email = `staff-enrol-${Date.now()}@studyhub.test`;
            const registerRes = await request(app)
                .post("/api/auth/register")
                .send({
                    full_name: "Staff Enrol Student",
                    email,
                    student_id: `SE${Date.now().toString().slice(-8)}`,
                    password: "password123"
                });

            expect(registerRes.status).toBe(201);
            const studentId = registerRes.body.userId;

            const res = await request(app)
                .post(`/api/enrollments/course/${unenrolledCourseId}/students`)
                .set("Authorization", `Bearer ${lecturerToken}`)
                .send({ student_id: studentId });

            expect(res.status).toBe(201);

            const listRes = await request(app)
                .get(`/api/enrollments/course/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${lecturerToken}`);

            expect(listRes.body.some((row) => Number(row.user_id) === Number(studentId))).toBe(true);

        });


        test("denies students using staff enrolment", async () => {

            requireSeed();

            const res = await request(app)
                .post(`/api/enrollments/course/${enrolledCourseId}/students`)
                .set("Authorization", `Bearer ${studentToken}`)
                .send({ student_id: 1 });

            expect(res.status).toBe(403);

        });


        test("lets a lecturer remove an enrolled student", async () => {

            requireSeed();

            const email = `staff-unenrol-${Date.now()}@studyhub.test`;
            const registerRes = await request(app)
                .post("/api/auth/register")
                .send({
                    full_name: "Staff Unenrol Student",
                    email,
                    student_id: `SU${Date.now().toString().slice(-8)}`,
                    password: "password123"
                });

            expect(registerRes.status).toBe(201);
            const studentId = registerRes.body.userId;

            const enrolRes = await request(app)
                .post(`/api/enrollments/course/${unenrolledCourseId}/students`)
                .set("Authorization", `Bearer ${lecturerToken}`)
                .send({ student_id: studentId });

            expect(enrolRes.status).toBe(201);

            const removeRes = await request(app)
                .delete(`/api/enrollments/course/${unenrolledCourseId}/students/${studentId}`)
                .set("Authorization", `Bearer ${lecturerToken}`);

            expect(removeRes.status).toBe(200);
            expect(removeRes.body.message).toMatch(/unenrolled/i);

            const listRes = await request(app)
                .get(`/api/enrollments/course/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${lecturerToken}`);

            expect(listRes.body.some((row) => Number(row.user_id) === Number(studentId))).toBe(false);

            const studentLogin = await login(email);
            expect(studentLogin.status).toBe(200);

            const resourceRes = await request(app)
                .get(`/api/resources/course/${unenrolledCourseId}`)
                .set("Authorization", `Bearer ${studentLogin.body.token}`);

            expect(resourceRes.status).toBe(403);

        });


        test("denies other lecturers removing students", async () => {

            requireSeed();

            const otherEmail = `unenrol-lecturer-${Date.now()}@studyhub.test`;

            const createRes = await request(app)
                .post("/api/auth/users/lecturer")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    full_name: "Unenrol Lecturer",
                    email: otherEmail,
                    password: "password123"
                });

            expect(createRes.status).toBe(201);

            const otherLogin = await login(otherEmail);
            expect(otherLogin.status).toBe(200);

            const res = await request(app)
                .delete(`/api/enrollments/course/${enrolledCourseId}/students/1`)
                .set("Authorization", `Bearer ${otherLogin.body.token}`);

            expect(res.status).toBe(403);

        });


        test("denies students using staff unenrolment", async () => {

            requireSeed();

            const res = await request(app)
                .delete(`/api/enrollments/course/${enrolledCourseId}/students/1`)
                .set("Authorization", `Bearer ${studentToken}`);

            expect(res.status).toBe(403);

        });

    });

});
