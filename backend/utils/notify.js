const notificationModel = require("../models/notificationModel");
const progressModel = require("../models/progressModel");
const courseModel = require("../models/courseModel");
const userModel = require("../models/userModel");


const finish = (callback) => {

    if (typeof callback === "function") {
        callback();
    }

};


const notifyQuiet = (payload, callback) => {

    notificationModel.create(payload, (err) => {

        if (err) {
            console.error("Notification failed:", err.message || err);
        }

        finish(callback);

    });

};


const notifyManyQuiet = (userIds, payload, callback) => {

    const excludeId = payload.excludeUserId == null
        ? null
        : Number(payload.excludeUserId);

    const ids = [...new Set((userIds || []).map(Number))]
        .filter((id) => id && id !== excludeId);

    if (ids.length === 0) {
        return finish(callback);
    }

    const rows = ids.map((userId) => ({
        user_id: userId,
        type: payload.type,
        title: payload.title,
        body: payload.body || null,
        link_url: payload.link_url || null
    }));

    notificationModel.createMany(rows, (err) => {

        if (err) {
            console.error("Notification fan-out failed:", err.message || err);
        }

        finish(callback);

    });

};


const notifyEnrollment = (studentId, course, callback) => {

    if (!course || !course.lecturer_id) {
        return finish(callback);
    }

    userModel.findUserById(studentId, (err, users) => {

        const studentName = !err && users[0]
            ? users[0].full_name
            : "A student";

        notifyQuiet({
            user_id: course.lecturer_id,
            type: "enrollment",
            title: "New enrolment",
            body: `${studentName} enrolled in ${course.course_code} — ${course.course_title}.`,
            link_url: `course:${course.course_id}`
        }, callback);

    });

};


const notifyResourceUploaded = (courseId, title, excludeUserId, callback) => {

    courseModel.getCourseById(courseId, (courseErr, courses) => {

        if (courseErr || !courses[0]) {
            return finish(callback);
        }

        const course = courses[0];

        progressModel.getEnrolledStudentIds(courseId, (err, students) => {

            if (err) {
                console.error("Notification fan-out failed:", err.message || err);
                return finish(callback);
            }

            notifyManyQuiet(
                (students || []).map((row) => row.student_id),
                {
                    excludeUserId,
                    type: "resource",
                    title: "New course resource",
                    body: `${title} was uploaded to ${course.course_code} — ${course.course_title}.`,
                    link_url: `course:${course.course_id}`
                },
                callback
            );

        });

    });

};


const notifyCourseCompleted = (studentId, courseId, callback) => {

    courseModel.getCourseById(courseId, (courseErr, courses) => {

        if (courseErr || !courses[0]) {
            return finish(callback);
        }

        const course = courses[0];

        userModel.findUserById(studentId, (userErr, users) => {

            const studentName = !userErr && users[0]
                ? users[0].full_name
                : "A student";

            const label = `${course.course_code} — ${course.course_title}`;

            notifyQuiet({
                user_id: studentId,
                type: "completion",
                title: "Course completed",
                body: `You completed ${label}.`,
                link_url: `course:${course.course_id}`
            }, () => {

                if (!course.lecturer_id || Number(course.lecturer_id) === Number(studentId)) {
                    return finish(callback);
                }

                notifyQuiet({
                    user_id: course.lecturer_id,
                    type: "completion",
                    title: "Student completed a course",
                    body: `${studentName} completed ${label}.`,
                    link_url: `course:${course.course_id}`
                }, callback);

            });

        });

    });

};


const notifyLecturerWelcome = (userId, callback) => {

    notifyQuiet({
        user_id: userId,
        type: "welcome",
        title: "Welcome to StudyHub",
        body: "Your lecturer account is ready. You can create courses and share materials with students.",
        link_url: null
    }, callback);

};


const notifyCourseAnnouncement = (courseId, title, excludeUserId, callback) => {

    courseModel.getCourseById(courseId, (courseErr, courses) => {

        if (courseErr || !courses[0]) {
            return finish(callback);
        }

        const course = courses[0];

        progressModel.getEnrolledStudentIds(courseId, (err, students) => {

            if (err) {
                console.error("Notification fan-out failed:", err.message || err);
                return finish(callback);
            }

            const userIds = (students || []).map((row) => row.student_id);
            userIds.push(course.lecturer_id);

            notifyManyQuiet(userIds, {
                excludeUserId,
                type: "announcement",
                title: `Announcement: ${course.course_code}`,
                body: title,
                link_url: `course:${course.course_id}`
            }, callback);

        });

    });

};


const notifyPlatformAnnouncement = (title, excludeUserId, callback) => {

    userModel.getAllUserIds((err, users) => {

        if (err) {
            console.error("Notification fan-out failed:", err.message || err);
            return finish(callback);
        }

        notifyManyQuiet(
            (users || []).map((row) => row.user_id),
            {
                excludeUserId,
                type: "announcement",
                title: "Platform announcement",
                body: title,
                link_url: "announcement:platform"
            },
            callback
        );

    });

};


module.exports = {
    notifyQuiet,
    notifyManyQuiet,
    notifyEnrollment,
    notifyResourceUploaded,
    notifyCourseCompleted,
    notifyLecturerWelcome,
    notifyCourseAnnouncement,
    notifyPlatformAnnouncement
};
