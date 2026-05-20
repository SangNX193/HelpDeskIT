const adminService = require('../services/admin.service');
const { success, asyncHandler } = require('../utils/response');

const getSupportUsers = asyncHandler(async (req, res) => {
    const data = await adminService.getSupportUsers(req.query);
    return success(res, data);
});

module.exports = {
    getSupportUsers
};
