const authService = require('../services/auth.service');
const { success, asyncHandler } = require('../utils/response');

const login = asyncHandler(async (req, res) => {
    const data = await authService.login(req.body);
    return success(res, data, 'Đăng nhập thành công');
});

const profile = asyncHandler(async (req, res) => {
    const data = await authService.profile(req.user.id);
    return success(res, data);
});

const updateProfile = asyncHandler(async (req, res) => {
    const data = await authService.updateProfile(req.user.id, req.body, req.file);
    return success(res, data, 'Cập nhật hồ sơ thành công');
});

const changePassword = asyncHandler(async (req, res) => {
    await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    return success(res, null, 'Đổi mật khẩu thành công');
});

const logout = asyncHandler(async (req, res) => {
    await authService.logout(req.user.id);
    return success(res, null, 'Đăng xuất thành công');
});

module.exports = {
    login,
    profile,
    updateProfile,
    changePassword,
    logout
};
