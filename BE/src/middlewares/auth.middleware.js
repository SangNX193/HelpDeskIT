const { verifyToken } = require('../utils/jwt');
const authRepository = require('../repositories/auth.repository');
const { unauthorized, forbidden } = require('../utils/response');

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return unauthorized(res, 'Thiếu token xác thực');
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        const user = await authRepository.findUserById(decoded.id);

        if (!user) {
            return unauthorized(res, 'Tài khoản không tồn tại');
        }

        if (user.status !== 'ACTIVE') {
            return forbidden(res, 'Tài khoản đang bị khóa hoặc chưa kích hoạt');
        }

        req.user = user;
        return next();
    } catch (error) {
        return unauthorized(res, 'Token không hợp lệ hoặc đã hết hạn');
    }
};
