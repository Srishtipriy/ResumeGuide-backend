const multer = require("multer");
const path = require("path");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();

        if ([".pdf", ".docx"].includes(extension)) {
            return cb(null, true);
        }

        cb(new Error("Only PDF and DOCX files are supported."));
    }
});

module.exports = upload;
