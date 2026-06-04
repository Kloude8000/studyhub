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

    });


    describe("Progress", () => {

        test("allows enrolled student to add a learning log", async () => {

            requireSeed();

            const res = await request(app)
                .post("/api/progress/log")
                .set("Authorization", `Bearer ${studentToken}`)
                .send({
                    course_id: enrolledCourseId,
                    topic: "Integration test topic",
                    study_duration: 30,
                    notes: "Automated test",
                    log_date: "2026-05-30"
                });

            expect(res.status).toBe(201);
            expect(res.body.progress).toBeDefined();

        });


        test("allows enrolled student to update a learning log", async () => {

            requireSeed();

            const createRes = await request(app)
                .post("/api/progress/log")
                .set("Authorization", `Bearer ${studentToken}`)
                .send({
                    course_id: enrolledCourseId,
                    topic: "Entry to edit",
                    study_duration: 20,
                    notes: "Original notes",
                    log_date: "2026-05-30"
                });

            expect(createRes.status).toBe(201);

            const logsRes = await request(app)
                .get(`/api/progress/logs/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${studentToken}`);

            const logToEdit = logsRes.body.find(
                (log) => log.topic === "Entry to edit"
            );

            expect(logToEdit).toBeDefined();

            const updateRes = await request(app)
                .put(`/api/progress/log/${logToEdit.log_id}`)
                .set("Authorization", `Bearer ${studentToken}`)
                .send({
                    topic: "Updated topic",
                    study_duration: 45,
                    notes: "Updated notes",
                    log_date: "2026-05-29"
                });

            expect(updateRes.status).toBe(200);
            expect(updateRes.body.log.topic).toBe("Updated topic");
            expect(updateRes.body.progress).toBeDefined();

        });


        test("denies learning log for unenrolled course", async () => {

            requireSeed();

            const res = await request(app)
                .post("/api/progress/log")
                .set("Authorization", `Bearer ${studentToken}`)
                .send({
                    course_id: unenrolledCourseId,
                    topic: "Should fail",
                    study_duration: 10,
                    log_date: "2026-05-30"
                });

            expect(res.status).toBe(403);

        });


        test("allows course owner to view course progress", async () => {

            requireSeed();

            const res = await request(app)
                .get(`/api/progress/course/${enrolledCourseId}`)
                .set("Authorization", `Bearer ${lecturerToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);

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

});
