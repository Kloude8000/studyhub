const topicModel = require("../models/topicModel");
const { canManageCourse, canViewCourseResources } = require("../utils/courseAccess");
const { recalculateCourseProgress } = require("../utils/syncProgress");
const sendServerError = require("../utils/sendServerError");


const listTopics = (req, res) => {

    const { id } = req.params;
    const { userId, role } = req.user;


    canViewCourseResources(
        id,
        userId,
        role,
        (err, access) => {

            if (err) {
                return sendServerError(res, err, "Error fetching topics");
            }

            if (access.notFound) {
                return res.status(404).json({
                    message: "Course not found"
                });
            }

            if (!access.allowed) {
                return res.status(403).json({
                    message: "You do not have access to topics for this course"
                });
            }


            topicModel.getTopicsByCourse(id, (fetchErr, results) => {

                if (fetchErr) {
                    return sendServerError(res, fetchErr, "Error fetching topics");
                }

                res.json(results);

            });

        }
    );

};


const addTopic = (req, res) => {

    const { id } = req.params;
    const { userId, role } = req.user;
    const { title, sort_order } = req.body;


    canManageCourse(
        id,
        userId,
        role,
        (err, access) => {

            if (err) {
                return sendServerError(res, err, "Error creating topic");
            }

            if (access.notFound) {
                return res.status(404).json({
                    message: "Course not found"
                });
            }

            if (!access.allowed) {
                return res.status(403).json({
                    message: "You do not have permission to manage topics for this course"
                });
            }


            const insertTopic = (order) => {

                topicModel.createTopic(id, title.trim(), order, (createErr, result) => {

                    if (createErr) {
                        return sendServerError(res, createErr, "Failed to create topic");
                    }


                    recalculateCourseProgress(id, (syncErr) => {

                        if (syncErr) {
                            return sendServerError(res, syncErr, "Topic created but progress recalculation failed");
                        }

                        res.status(201).json({
                            message: "Topic added",
                            topic: {
                                topic_id: result.insertId,
                                course_id: Number(id),
                                title: title.trim(),
                                sort_order: order
                            }
                        });

                    });

                });

            };


            if (sort_order != null && sort_order !== "") {
                return insertTopic(Number(sort_order));
            }

            topicModel.getNextSortOrder(id, (orderErr, rows) => {

                if (orderErr) {
                    return sendServerError(res, orderErr, "Error creating topic");
                }

                insertTopic(Number(rows[0].next_order) || 1);

            });

        }
    );

};


const updateTopic = (req, res) => {

    const { id, topicId } = req.params;
    const { userId, role } = req.user;
    const { title, sort_order } = req.body;


    canManageCourse(
        id,
        userId,
        role,
        (err, access) => {

            if (err) {
                return sendServerError(res, err, "Error updating topic");
            }

            if (access.notFound) {
                return res.status(404).json({
                    message: "Course not found"
                });
            }

            if (!access.allowed) {
                return res.status(403).json({
                    message: "You do not have permission to manage topics for this course"
                });
            }


            topicModel.getTopicById(topicId, (topicErr, topics) => {

                if (topicErr) {
                    return sendServerError(res, topicErr, "Database error");
                }

                if (topics.length === 0 || Number(topics[0].course_id) !== Number(id)) {
                    return res.status(404).json({
                        message: "Topic not found"
                    });
                }

                const nextTitle = title != null ? title.trim() : topics[0].title;
                const nextOrder = sort_order != null && sort_order !== ""
                    ? Number(sort_order)
                    : topics[0].sort_order;


                topicModel.updateTopic(topicId, nextTitle, nextOrder, (updateErr) => {

                    if (updateErr) {
                        return sendServerError(res, updateErr, "Failed to update topic");
                    }

                    res.json({
                        message: "Topic updated",
                        topic: {
                            topic_id: Number(topicId),
                            course_id: Number(id),
                            title: nextTitle,
                            sort_order: nextOrder
                        }
                    });

                });

            });

        }
    );

};


const deleteTopic = (req, res) => {

    const { id, topicId } = req.params;
    const { userId, role } = req.user;


    canManageCourse(
        id,
        userId,
        role,
        (err, access) => {

            if (err) {
                return sendServerError(res, err, "Error deleting topic");
            }

            if (access.notFound) {
                return res.status(404).json({
                    message: "Course not found"
                });
            }

            if (!access.allowed) {
                return res.status(403).json({
                    message: "You do not have permission to manage topics for this course"
                });
            }


            topicModel.getTopicById(topicId, (topicErr, topics) => {

                if (topicErr) {
                    return sendServerError(res, topicErr, "Database error");
                }

                if (topics.length === 0 || Number(topics[0].course_id) !== Number(id)) {
                    return res.status(404).json({
                        message: "Topic not found"
                    });
                }


                topicModel.countLogsForTopic(topicId, (countErr, counts) => {

                    if (countErr) {
                        return sendServerError(res, countErr, "Database error");
                    }

                    if (Number(counts[0].log_count) > 0) {
                        return res.status(409).json({
                            message: "Cannot delete a topic that already has student logs"
                        });
                    }


                    topicModel.deleteTopic(topicId, (deleteErr) => {

                        if (deleteErr) {
                            return sendServerError(res, deleteErr, "Failed to delete topic");
                        }


                        recalculateCourseProgress(id, (syncErr) => {

                            if (syncErr) {
                                return sendServerError(res, syncErr, "Topic deleted but progress recalculation failed");
                            }

                            res.json({
                                message: "Topic deleted"
                            });

                        });

                    });

                });

            });

        }
    );

};


module.exports = {
    listTopics,
    addTopic,
    updateTopic,
    deleteTopic
};
