const notificationService = require('../services/notification.service');
const { success, asyncHandler } = require('../utils/response');

const getNotifications = asyncHandler(async (req, res) => {
    const data = await notificationService.getNotifications(req.user.id);
    return success(res, data);
});

const markAsRead = asyncHandler(async (req, res) => {
    await notificationService.markAsRead(req.params.id, req.user.id);
    return success(res, null, 'Notification marked as read');
});

const readAll = asyncHandler(async (req, res) => {
    await notificationService.readAll(req.user.id);
    return success(res, null, 'All notifications marked as read');
});

module.exports = {
    getNotifications,
    markAsRead,
    readAll
};
