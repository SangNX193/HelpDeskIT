const ticketService = require('../services/ticket.service');
const { success, created, asyncHandler } = require('../utils/response');

const createTicket = asyncHandler(async (req, res) => {
    const data = await ticketService.createTicket(req.body, req.user);
    return created(res, data, 'Tạo yêu cầu thành công');
});

const updateRequesterTicket = asyncHandler(async (req, res) => {
    const data = await ticketService.updateRequesterTicket(req.params.id, req.body, req.user);
    return success(res, data, 'Cập nhật yêu cầu thành công');
});

const getAllTickets = asyncHandler(async (req, res) => {
    const data = await ticketService.getAllTickets(req.query, req.user);
    return success(res, data);
});

const getMyTickets = asyncHandler(async (req, res) => {
    const data = await ticketService.getMyTickets(req.user);
    return success(res, data);
});

const getAssignedToMe = asyncHandler(async (req, res) => {
    const data = await ticketService.getAssignedToMe(req.user);
    return success(res, data);
});

const getUnassignedTickets = asyncHandler(async (req, res) => {
    const data = await ticketService.getUnassignedTickets(req.user);
    return success(res, data);
});

const getOverdueTickets = asyncHandler(async (req, res) => {
    const data = await ticketService.getOverdueTickets(req.user);
    return success(res, data);
});

const getTicketsBySupport = asyncHandler(async (req, res) => {
    const data = await ticketService.getTicketsBySupport(req.params.supportId, req.user);
    return success(res, data);
});

const getTicketById = asyncHandler(async (req, res) => {
    const data = await ticketService.getTicketById(req.params.id, req.user);
    return success(res, data);
});

const assignTicket = asyncHandler(async (req, res) => {
    const data = await ticketService.assignTicket(req.params.id, req.body, req.user);
    return success(res, data, 'Phân công yêu cầu thành công');
});

const reassignTicket = asyncHandler(async (req, res) => {
    const data = await ticketService.reassignTicket(req.params.id, req.body, req.user);
    return success(res, data, 'Tái phân công yêu cầu thành công');
});

const updatePriority = asyncHandler(async (req, res) => {
    const data = await ticketService.updatePriority(req.params.id, req.body, req.user);
    return success(res, data, 'Cập nhật mức ưu tiên thành công');
});

const updateStatus = asyncHandler(async (req, res) => {
    const data = await ticketService.updateStatus(req.params.id, req.body, req.user);
    return success(res, data, 'Cập nhật trạng thái yêu cầu thành công');
});

const startTicket = asyncHandler(async (req, res) => {
    const data = await ticketService.startTicket(req.params.id, req.user);
    return success(res, data, 'Tiếp nhận yêu cầu thành công');
});

const resolveTicket = asyncHandler(async (req, res) => {
    const data = await ticketService.resolveTicket(req.params.id, req.body, req.user);
    return success(res, data, 'Hoàn tất xử lý yêu cầu thành công');
});

const cancelTicket = asyncHandler(async (req, res) => {
    const data = await ticketService.cancelTicket(req.params.id, req.body, req.user);
    return success(res, data, 'Hủy yêu cầu thành công');
});

const addComment = asyncHandler(async (req, res) => {
    const data = await ticketService.addComment(req.params.id, req.body, req.user);
    return created(res, data, 'Gửi phản hồi thành công');
});

const getComments = asyncHandler(async (req, res) => {
    const data = await ticketService.getComments(req.params.id, req.user);
    return success(res, data);
});

const uploadAttachment = asyncHandler(async (req, res) => {
    const data = await ticketService.uploadAttachment(req.params.id, req.file, req.user);
    return created(res, data, 'Tải file thành công');
});

const getAttachments = asyncHandler(async (req, res) => {
    const data = await ticketService.getAttachments(req.params.id, req.user);
    return success(res, data);
});

const addFeedback = asyncHandler(async (req, res) => {
    const data = await ticketService.addFeedback(req.params.id, req.body, req.user);
    return created(res, data, 'Gửi đánh giá thành công');
});

const getTicketHistory = asyncHandler(async (req, res) => {
    const data = await ticketService.getTicketHistory(req.params.id, req.user);
    return success(res, data);
});

const getAssignmentHistory = asyncHandler(async (req, res) => {
    const data = await ticketService.getAssignmentHistory(req.params.id, req.user);
    return success(res, data);
});

module.exports = {
    createTicket,
    updateRequesterTicket,
    getAllTickets,
    getMyTickets,
    getAssignedToMe,
    getUnassignedTickets,
    getOverdueTickets,
    getTicketsBySupport,
    getTicketById,
    assignTicket,
    reassignTicket,
    updatePriority,
    updateStatus,
    startTicket,
    resolveTicket,
    cancelTicket,
    addComment,
    getComments,
    uploadAttachment,
    getAttachments,
    addFeedback,
    getTicketHistory,
    getAssignmentHistory
};
