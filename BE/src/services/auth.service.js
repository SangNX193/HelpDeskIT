const authRepository = require('../repositories/auth.repository');
const { comparePassword, hashPassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');

const httpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const sanitizeUser = (user) => {
    if (!user) {
        return null;
    }

    const { password_hash, ...safeUser } = user;
    return safeUser;
};

const valueOf = (data, ...fields) => {
    for (const field of fields) {
        if (data[field] !== undefined && data[field] !== null && String(data[field]).trim() !== '') {
            return String(data[field]).trim();
        }
    }
    return undefined;
};

const login = async ({ email, password }) => {
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
        throw httpError(401, 'Email hoặc mật khẩu không đúng');
    }

    if (user.status !== 'ACTIVE') {
        throw httpError(403, 'Tài khoản đang bị khóa hoặc chưa kích hoạt');
    }

    const matched = await comparePassword(password, user.password_hash);
    if (!matched) {
        throw httpError(401, 'Email hoặc mật khẩu không đúng');
    }

    await authRepository.updateLastLogin(user.id);

    const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role_code
    });

    return {
        token,
        user: sanitizeUser(user)
    };
};

const profile = async (userId) => {
    const user = await authRepository.findUserById(userId);

    if (!user) {
        throw httpError(404, 'Không tìm thấy người dùng');
    }

    return sanitizeUser(user);
};

const updateProfile = async (userId, payload, file) => {
    const user = await authRepository.findUserById(userId);

    if (!user) {
        throw httpError(404, 'Không tìm thấy người dùng');
    }

    const email = valueOf(payload, 'email');
    if (email) {
        const owner = await authRepository.findEmailOwner(email);
        if (owner && Number(owner.id) !== Number(userId)) {
            throw httpError(409, 'Email đã được tài khoản khác sử dụng');
        }
    }

    const data = {
        full_name: valueOf(payload, 'fullName', 'full_name', 'name'),
        email,
        phone: valueOf(payload, 'phone')
    };

    if (file) {
        const allowedImageExtensions = ['.jpg', '.jpeg', '.png'];
        const extension = require('path').extname(file.originalname || '').toLowerCase();
        if (!allowedImageExtensions.includes(extension)) {
            throw httpError(400, 'Ảnh đại diện phải là file JPG hoặc PNG');
        }
        data.avatar_url = `/uploads/${require('path').basename(file.path)}`;
    }

    await authRepository.updateProfile(userId, data);
    return profile(userId);
};

const changePassword = async (userId, currentPassword, newPassword) => {
    const user = await authRepository.findUserById(userId);

    if (!user) {
        throw httpError(404, 'Không tìm thấy người dùng');
    }

    const matched = await comparePassword(currentPassword, user.password_hash);
    if (!matched) {
        throw httpError(400, 'Mật khẩu hiện tại không đúng');
    }

    const newPasswordHash = await hashPassword(newPassword);
    await authRepository.updatePassword(userId, newPasswordHash);

    return true;
};

const logout = async () => true;

module.exports = {
    login,
    profile,
    updateProfile,
    changePassword,
    logout
};
