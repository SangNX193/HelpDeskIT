const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '');
        const baseName = path.basename(file.originalname || 'file', ext)
            .replace(/[^a-zA-Z0-9_-]/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 80);
        cb(null, `${Date.now()}-${baseName || 'file'}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedExtensions = (process.env.ALLOWED_UPLOAD_EXTENSIONS || '.jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    const ext = path.extname(file.originalname || '').toLowerCase();

    if (!allowedExtensions.includes(ext)) {
        return cb(new Error(`Định dạng file ${ext || 'không xác định'} không được hỗ trợ`));
    }

    return cb(null, true);
};

module.exports = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: (Number(process.env.MAX_UPLOAD_SIZE_MB) || 10) * 1024 * 1024
    }
});
