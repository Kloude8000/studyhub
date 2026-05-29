const multer = require("multer");

const path = require("path");



// ================= STORAGE CONFIG =================
const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, "uploads/resources");

    },

    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() + "-" + file.originalname;

        cb(null, uniqueName);

    }

});



// ================= FILE FILTER =================
const fileFilter = (req, file, cb) => {

    const allowedTypes = [
        "application/pdf",
        "video/mp4",
        "image/png",
        "image/jpeg"
    ];

    if (allowedTypes.includes(file.mimetype)) {

        cb(null, true);

    } else {

        cb(new Error("Unsupported file type"), false);

    }

};



// ================= MULTER INSTANCE =================
const upload = multer({
    storage,
    fileFilter
});


module.exports = upload;