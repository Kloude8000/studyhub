const sendServerError = (res, err, message = "Internal server error") => {
    console.error(message, err);
    res.status(500).json({ message });
};

module.exports = sendServerError;
