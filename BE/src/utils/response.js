const success = (res, data = null, message = 'Thành công', statusCode = 200, meta = undefined) => {
    const payload = {
        success: true,
        message,
        data
    };

    if (meta !== undefined) {
        payload.meta = meta;
    }

    return res.status(statusCode).json(payload);
};

const created = (res, data = null, message = 'Tạo mới thành công') => success(res, data, message, 201);

const error = (res, message = 'Lỗi hệ thống', statusCode = 500, details = undefined) => {
    const payload = {
        success: false,
        message
    };

    if (details !== undefined) {
        payload.details = details;
    }

    return res.status(statusCode).json(payload);
};

const badRequest = (res, message = 'Dữ liệu không hợp lệ', details = undefined) => error(res, message, 400, details);
const unauthorized = (res, message = 'Chưa xác thực') => error(res, message, 401);
const forbidden = (res, message = 'Không có quyền truy cập') => error(res, message, 403);
const notFound = (res, message = 'Không tìm thấy dữ liệu') => error(res, message, 404);
const conflict = (res, message = 'Dữ liệu bị trùng hoặc xung đột') => error(res, message, 409);

const asyncHandler = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};

module.exports = {
    success,
    created,
    error,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    conflict,
    asyncHandler
};
