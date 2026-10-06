const fs = require("fs");
const path = require("path");
const progressModel = require("../models/progressModel");
const resourceModel = require("../models/resourceModel");
const enrollmentModel = require("../models/enrollmentModel");
const topicModel = require("../models/topicModel");
const announcementModel = require("../models/announcementModel");

const UPLOAD_ROOT = path.resolve("uploads", "resources");


const unlinkCourseFiles = (resources) => {

    (resources || []).forEach((resource) => {

        const filePath = path.resolve(resource.file_path);

        if (
            filePath.startsWith(UPLOAD_ROOT + path.sep) &&
            fs.existsSync(filePath)
        ) {
            fs.unlinkSync(filePath);
        }

    });

};


const deleteCourseAndDependents = (courseId, deleteCourseRow, callback) => {

    resourceModel.getResourcesByCourse(courseId, (resErr, resources) => {

        if (resErr) {
            return callback(resErr);
        }

        progressModel.deleteCourseLearningLogs(courseId, (logsErr) => {

            if (logsErr) {
                return callback(logsErr);
            }

            progressModel.deleteCourseResourceAccess(courseId, (accessErr) => {

                if (accessErr) {
                    return callback(accessErr);
                }

                resourceModel.deleteResourcesByCourse(courseId, (resourceErr) => {

                    if (resourceErr) {
                        return callback(resourceErr);
                    }

                    unlinkCourseFiles(resources);

                    progressModel.deleteCourseProgress(courseId, (progressErr) => {

                        if (progressErr) {
                            return callback(progressErr);
                        }

                        enrollmentModel.deleteEnrollmentsByCourse(courseId, (enrollErr) => {

                            if (enrollErr) {
                                return callback(enrollErr);
                            }

                            topicModel.deleteTopicsByCourse(courseId, (topicErr) => {

                                if (topicErr) {
                                    return callback(topicErr);
                                }

                                announcementModel.deleteByCourse(courseId, (announceErr) => {

                                    if (announceErr) {
                                        return callback(announceErr);
                                    }

                                    deleteCourseRow(callback);

                                });

                            });

                        });

                    });

                });

            });

        });

    });

};


module.exports = {
    deleteCourseAndDependents
};
