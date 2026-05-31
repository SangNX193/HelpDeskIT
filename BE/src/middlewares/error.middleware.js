const { error } = require('../utils/response');

const logServerError = (err, req, statusCode) => {
    const isDatabaseError = err.code && String(err.code).startsWith('ER_');
    if (statusCode < 500 && !isDatabaseError) {
        return;
    }

    console.error('[BE error]', {
        method: req.method,
        path: req.originalUrl,
        statusCode,
        code: err.code,
        message: err.message
    });

    if (err.stack) {
        console.error(err.stack);
    }
};

module.exports = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    if (err.name === 'MulterError') {
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'File vượt quá dung lượng cho phép'
            : err.message;
        return error(res, message, 400);
    }

    if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
        logServerError(err, req, 503);
        return error(res, 'Không kết nối được database. Hãy kiểm tra XAMPP/MySQL và DB_PORT trong BE/.env.', 503);
    }

    if (err.code && String(err.code).startsWith('ER_')) {
        logServerError(err, req, 500);
        return error(res, process.env.NODE_ENV === 'production' ? 'Lỗi database' : err.message, 500);
    }

    const statusCode = err.statusCode || err.status || 500;
    logServerError(err, req, statusCode);
    const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
        ? 'Lỗi hệ thống'
        : err.message || 'Lỗi hệ thống';

    const details = process.env.NODE_ENV === 'production' ? undefined : err.details;
    return error(res, message, statusCode, details);
};
