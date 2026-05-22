const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const { getUploadDir } = require('../config/upload');

const uploadDir = getUploadDir();
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const random = crypto.randomBytes(8).toString('hex');
        const baseName = path.basename(file.originalname || 'file', ext)
            .replace(/[^a-zA-Z0-9_-]/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 80);
        cb(null, `${Date.now()}-${random}-${baseName || 'file'}${ext}`);
    }
});

const allowedMimePrefixes = ['image/'];
const allowedMimeTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream'
]);

const fileFilter = (req, file, cb) => {
    const allowedExtensions = (process.env.ALLOWED_UPLOAD_EXTENSIONS || '.jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mimeType = String(file.mimetype || '').toLowerCase();

    if (!allowedExtensions.includes(ext)) {
        return cb(new Error(`Định dạng file ${ext || 'không xác định'} không được hỗ trợ`));
    }

    const mimeAllowed = allowedMimePrefixes.some((prefix) => mimeType.startsWith(prefix)) || allowedMimeTypes.has(mimeType);
    if (mimeType && !mimeAllowed) {
        return cb(new Error('Loại nội dung file không được hỗ trợ'));
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
