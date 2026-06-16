const consultationService = require('../services/consultation.service');
const { success, asyncHandler } = require('../utils/response');

const getSummary = asyncHandler(async (req, res) => {
    return success(res, await consultationService.getSummary(req.user));
});

const getMyConversation = asyncHandler(async (req, res) => {
    return success(res, await consultationService.getMyConversation(req.user));
});

const sendMyMessage = asyncHandler(async (req, res) => {
    return success(res, await consultationService.sendMyMessage(req.body, req.user), 'Đã gửi tin nhắn');
});

const listConversations = asyncHandler(async (req, res) => {
    return success(res, await consultationService.listConversations(req.user, req.query));
});

const getConversation = asyncHandler(async (req, res) => {
    return success(res, await consultationService.getConversation(req.params.id, req.user));
});

const sendMessage = asyncHandler(async (req, res) => {
    return success(res, await consultationService.sendMessage(req.params.id, req.body, req.user), 'Đã gửi tin nhắn');
});

const markStaffUnread = asyncHandler(async (req, res) => {
    return success(res, await consultationService.markStaffUnread(req.params.id, req.user), 'Đã đặt lại chưa đọc');
});

const archiveConversation = asyncHandler(async (req, res) => {
    return success(res, await consultationService.archiveConversation(req.params.id, req.user), 'Đã lưu trữ cuộc tư vấn');
});

const deleteConversation = asyncHandler(async (req, res) => {
    return success(res, await consultationService.deleteConversation(req.params.id, req.user), 'Đã xóa cuộc tư vấn khỏi hộp thư');
});

const restoreConversation = asyncHandler(async (req, res) => {
    return success(res, await consultationService.restoreConversation(req.params.id, req.user), 'Đã khôi phục cuộc tư vấn');
});

module.exports = {
    archiveConversation,
    deleteConversation,
    getConversation,
    getMyConversation,
    getSummary,
    listConversations,
    markStaffUnread,
    restoreConversation,
    sendMessage,
    sendMyMessage
};
