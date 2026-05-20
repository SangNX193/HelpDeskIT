const path = require('path');

const ticketRepository = require('../repositories/ticket.repository');
const notificationRepository = require('../repositories/notification.repository');
const authRepository = require('../repositories/auth.repository');

const httpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const valueOf = (data, ...fields) => {
    for (const field of fields) {
        if (data[field] !== undefined && data[field] !== null && String(data[field]).trim() !== '') {
            return data[field];
        }
    }
    return undefined;
};

const roleOf = (user = {}) => String(user.role_code || user.role || '').toUpperCase();
const closedStatusCodes = ['RESOLVED', 'CLOSED', 'CANCELLED'];
const allowedTransitions = {
    NEW: ['ASSIGNED', 'CANCELLED'],
    ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['WAITING_FOR_USER', 'RESOLVED'],
    WAITING_FOR_USER: ['IN_PROGRESS'],
    RESOLVED: ['CLOSED'],
    CLOSED: [],
    CANCELLED: []
};

const boolValue = (value) => {
    if (value === undefined) {
        return false;
    }

    if (typeof value === 'string') {
        return ['1', 'true', 'yes'].includes(value.toLowerCase());
    }

    return Boolean(value);
};

const toMysqlDate = (date) => date.toISOString().slice(0, 19).replace('T', ' ');

const addMinutes = (minutes) => toMysqlDate(new Date(Date.now() + Number(minutes) * 60 * 1000));
const EDIT_WINDOW_MINUTES = 5;
const MAX_ROOM_LENGTH = 60;

const generateTicketCode = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `HD${date}${random}`;
};

const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const ensureMeaningfulText = (value, label) => {
    const normalized = normalizeText(value);

    if (!normalized) {
        throw httpError(400, `Vui lòng nhập ${label.toLocaleLowerCase('vi')}`);
    }

    if (/^(.)\1{5,}$/u.test(normalized.replace(/\s+/g, ''))) {
        throw httpError(400, `${label} không hợp lệ`);
    }

    return normalized;
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripDepartmentCode = (room, departmentCode) => {
    const normalizedRoom = normalizeText(room);
    const pattern = new RegExp(`^${escapeRegExp(String(departmentCode || ''))}\\s*[-/ ]*`, 'i');
    return normalizeText(normalizedRoom.replace(pattern, ''));
};

const ensureRoomText = (room) => {
    const normalized = normalizeText(room);

    if (normalized.length < 1) {
        throw httpError(400, 'Vui lòng nhập phòng cần hỗ trợ');
    }

    if (normalized.length > MAX_ROOM_LENGTH) {
        throw httpError(400, `Phòng cần hỗ trợ không được vượt quá ${MAX_ROOM_LENGTH} ký tự`);
    }

    if (!/^[\p{L}\p{N}][\p{L}\p{N}\s./-]*$/u.test(normalized)) {
        throw httpError(400, 'Phòng cần hỗ trợ chỉ nên gồm chữ, số, khoảng trắng, dấu gạch ngang, dấu chấm hoặc dấu /');
    }

    if (!/\d/.test(normalized)) {
        throw httpError(400, 'Phòng cần hỗ trợ phải có số phòng cụ thể');
    }

    return normalized;
};

const resolveRoomLocation = async (payload) => {
    const rawRoom = valueOf(payload, 'room', 'roomNumber', 'room_number');
    const departmentId = valueOf(payload, 'departmentId', 'department_id', 'buildingId', 'building_id');

    if (departmentId) {
        const department = await ticketRepository.getActiveDepartmentById(departmentId);
        if (!department) {
            throw httpError(400, 'Tòa/khu hỗ trợ không tồn tại hoặc đã bị vô hiệu hóa');
        }

        const roomNumber = ensureRoomText(stripDepartmentCode(rawRoom, department.code));
        return `${department.code}-${roomNumber}`;
    }

    const room = ensureRoomText(rawRoom);
    const department = await ticketRepository.getActiveDepartmentByRoom(room);
    if (!department) {
        throw httpError(400, 'Phòng cần hỗ trợ phải thuộc một tòa/khu đang hoạt động trong danh mục');
    }

    return room;
};

const ensureTicket = async (ticketId) => {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
        throw httpError(404, 'Không tìm thấy yêu cầu');
    }
    return ticket;
};

const ensureAccess = async (ticket, user) => {
    const role = roleOf(user);

    if (role === 'ADMIN') {
        return;
    }

    if (role === 'MANAGER' && await ticketRepository.userHasRoomAccess(user.id, ticket.room)) {
        return;
    }

    if (role === 'REQUESTER' && Number(ticket.requester_id) === Number(user.id)) {
        return;
    }

    if (role === 'SUPPORT' && Number(ticket.assigned_to) === Number(user.id)) {
        return;
    }

    throw httpError(403, 'Bạn không có quyền truy cập yêu cầu này');
};

const ensureNotFinal = (ticket, action = 'change this ticket') => {
    if (closedStatusCodes.includes(ticket.status_code)) {
        throw httpError(400, `Không thể ${action} vì yêu cầu đang ở trạng thái ${ticket.status_code}`);
    }
};

const ensureTransition = (ticket, nextStatusCode, user) => {
    const fromStatusCode = ticket.status_code;

    if (fromStatusCode === nextStatusCode) {
        return;
    }

    const allowed = allowedTransitions[fromStatusCode] || [];
    if (!allowed.includes(nextStatusCode)) {
        throw httpError(400, `Không thể chuyển trạng thái yêu cầu từ ${fromStatusCode} sang ${nextStatusCode}`);
    }

    const role = roleOf(user);
    if (role === 'SUPPORT' && !['IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED'].includes(nextStatusCode)) {
        throw httpError(403, 'Nhân viên IT không được đặt trạng thái này');
    }
};

const resolvePriority = async (payload) => {
    const priorityId = valueOf(payload, 'priorityId', 'priority_id');
    if (priorityId) {
        const priority = await ticketRepository.getPriorityById(priorityId);
        if (!priority) {
            throw httpError(404, 'Không tìm thấy mức ưu tiên');
        }
        return priority;
    }

    const priorityCode = valueOf(payload, 'priorityCode', 'priority_code');
    if (priorityCode) {
        const priority = await ticketRepository.getPriorityByCode(priorityCode);
        if (!priority) {
            throw httpError(404, 'Không tìm thấy mức ưu tiên');
        }
        return priority;
    }

    const priority = await ticketRepository.getDefaultPriority();
    if (!priority) {
        throw httpError(500, 'Chưa cấu hình mức ưu tiên mặc định');
    }
    return priority;
};

const resolveStatus = async (payload, defaultCode = undefined) => {
    const statusId = valueOf(payload, 'statusId', 'status_id');
    if (statusId) {
        const status = await ticketRepository.getStatusById(statusId);
        if (!status) {
            throw httpError(404, 'Không tìm thấy trạng thái yêu cầu');
        }
        return status;
    }

    const statusCode = valueOf(payload, 'statusCode', 'status_code') || defaultCode;
    if (statusCode) {
        const status = await ticketRepository.getStatusByCode(statusCode);
        if (!status) {
            throw httpError(404, 'Không tìm thấy trạng thái yêu cầu');
        }
        return status;
    }

    const status = await ticketRepository.getDefaultStatus();
    if (!status) {
        throw httpError(500, 'Chưa cấu hình trạng thái mặc định của yêu cầu');
    }
    return status;
};

const notifyUser = async (userId, title, message, type, ticketId) => {
    if (!userId) {
        return;
    }

    try {
        await notificationRepository.createNotification({
            user_id: userId,
            title,
            message,
            type,
            related_ticket_id: ticketId
        });
    } catch (error) {
        // Notifications should not block the main ticket workflow.
    }
};

const createTicket = async (payload, user) => {
    const serviceId = valueOf(payload, 'serviceId', 'service_id');
    const service = await ticketRepository.getServiceById(serviceId);

    if (!service) {
        throw httpError(404, 'Không tìm thấy dịch vụ');
    }

    const title = ensureMeaningfulText(valueOf(payload, 'title'), 'Tiêu đề');
    const description = ensureMeaningfulText(valueOf(payload, 'description'), 'Mô tả chi tiết');
    const room = await resolveRoomLocation(payload);
    const priority = await resolvePriority(payload);
    const status = await resolveStatus(payload);
    const sla = await ticketRepository.getSlaPolicy(service.id, priority.id);
    const responseMinutes = sla ? sla.response_time_minutes : priority.response_time_minutes;
    const resolveMinutes = sla ? sla.resolve_time_minutes : priority.resolve_time_minutes;

    const id = await ticketRepository.createTicket({
        code: generateTicketCode(),
        title,
        description,
        room,
        requester_id: user.id,
        service_id: service.id,
        priority_id: priority.id,
        status_id: status.id,
        due_response_at: addMinutes(responseMinutes),
        due_resolve_at: addMinutes(resolveMinutes)
    });

    await ticketRepository.addHistory({
        ticket_id: id,
        user_id: user.id,
        action: 'CREATE',
        to_value: status.code,
        note: 'Tạo yêu cầu'
    });

    return ticketRepository.findById(id);
};

const updateRequesterTicket = async (ticketId, payload, user) => {
    const ticket = await ensureTicket(ticketId);

    if (roleOf(user) !== 'REQUESTER' || Number(ticket.requester_id) !== Number(user.id)) {
        throw httpError(403, 'Chỉ người tạo yêu cầu được chỉnh sửa yêu cầu này');
    }

    if (!['NEW', 'ASSIGNED'].includes(ticket.status_code)) {
        throw httpError(400, 'Chỉ được chỉnh sửa yêu cầu khi trạng thái là mới tạo hoặc đã phân công');
    }

    const createdAt = new Date(ticket.created_at).getTime();
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > EDIT_WINDOW_MINUTES * 60 * 1000) {
        throw httpError(403, 'Đã quá 5 phút nên không thể chỉnh sửa yêu cầu này');
    }

    const serviceId = valueOf(payload, 'serviceId', 'service_id') || ticket.service_id;
    const service = await ticketRepository.getServiceById(serviceId);
    if (!service) {
        throw httpError(404, 'Không tìm thấy dịch vụ');
    }

    const priority = valueOf(payload, 'priorityId', 'priority_id', 'priorityCode', 'priority_code')
        ? await resolvePriority(payload)
        : await ticketRepository.getPriorityById(ticket.priority_id);

    if (!priority) {
        throw httpError(404, 'Không tìm thấy mức ưu tiên');
    }

    const sla = await ticketRepository.getSlaPolicy(service.id, priority.id);
    const responseMinutes = sla ? sla.response_time_minutes : priority.response_time_minutes;
    const resolveMinutes = sla ? sla.resolve_time_minutes : priority.resolve_time_minutes;
    const title = ensureMeaningfulText(valueOf(payload, 'title') || ticket.title, 'Tiêu đề');
    const description = ensureMeaningfulText(valueOf(payload, 'description') || ticket.description, 'Mô tả chi tiết');
    const room = valueOf(payload, 'room', 'roomNumber', 'room_number') || valueOf(payload, 'departmentId', 'department_id', 'buildingId', 'building_id')
        ? await resolveRoomLocation(payload)
        : ticket.room;

    await ticketRepository.updateRequesterTicket(ticketId, {
        title,
        description,
        room,
        service_id: service.id,
        priority_id: priority.id,
        due_response_at: addMinutes(responseMinutes),
        due_resolve_at: addMinutes(resolveMinutes)
    });

    await ticketRepository.addHistory({
        ticket_id: ticketId,
        user_id: user.id,
        action: 'UPDATE_REQUEST',
        from_value: ticket.title,
        to_value: title,
        note: 'Người dùng chỉnh sửa yêu cầu trong 5 phút đầu'
    });

    return ticketRepository.findById(ticketId);
};

const ticketFilters = (query, user) => ({
    statusId: query.statusId || query.status_id,
    priorityId: query.priorityId || query.priority_id,
    serviceId: query.serviceId || query.service_id,
    fromDate: query.fromDate || query.from_date,
    toDate: query.toDate || query.to_date,
    keyword: query.keyword || query.q,
    managerUserId: roleOf(user) === 'MANAGER' ? user.id : undefined
});

const getAllTickets = (query, user) => ticketRepository.listTickets(ticketFilters(query, user));

const getMyTickets = (user) => ticketRepository.listTickets({ requesterId: user.id });
const getAssignedToMe = (user) => ticketRepository.listTickets({ assignedTo: user.id });
const getUnassignedTickets = (user) => ticketRepository.listTickets({ unassigned: true, managerUserId: roleOf(user) === 'MANAGER' ? user.id : undefined });
const getOverdueTickets = (user) => ticketRepository.listTickets({ overdue: true, managerUserId: roleOf(user) === 'MANAGER' ? user.id : undefined });
const getTicketsBySupport = (supportId, user) => ticketRepository.listTickets({ assignedTo: supportId, managerUserId: roleOf(user) === 'MANAGER' ? user.id : undefined });

const getTicketById = async (ticketId, user) => {
    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);
    return ticket;
};

const ensureSupportUser = async (supportId) => {
    const support = await authRepository.findUserById(supportId);
    if (!support || support.role_code !== 'SUPPORT') {
        throw httpError(404, 'Không tìm thấy nhân viên IT');
    }

    if (support.status !== 'ACTIVE') {
        throw httpError(400, 'Nhân viên IT đang bị khóa hoặc chưa kích hoạt');
    }

    return support;
};

const assignTicket = async (ticketId, payload, user) => {
    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);
    ensureNotFinal(ticket, 'phân công');

    const supportId = valueOf(payload, 'supportId', 'support_id', 'assignedTo', 'assigned_to');
    const support = await ensureSupportUser(supportId);
    if (!await ticketRepository.userHasRoomAccess(support.id, ticket.room)) {
        throw httpError(400, 'Nhân viên IT chưa được phân công hỗ trợ tòa của yêu cầu này');
    }
    const assignedStatus = await resolveStatus({ statusCode: 'ASSIGNED' });
    const updateData = {
        assigned_to: support.id,
        assigned_by: user.id
    };

    if (ticket.status_code === 'NEW') {
        updateData.status_id = assignedStatus.id;
    }

    await ticketRepository.updateTicket(ticketId, updateData);

    await ticketRepository.addAssignmentHistory({
        ticket_id: ticketId,
        from_support_id: ticket.assigned_to,
        to_support_id: support.id,
        assigned_by: user.id,
        note: valueOf(payload, 'note')
    });

    await ticketRepository.addHistory({
        ticket_id: ticketId,
        user_id: user.id,
        action: ticket.assigned_to ? 'REASSIGN' : 'ASSIGN',
        from_value: ticket.assigned_to_name,
        to_value: support.full_name,
        note: valueOf(payload, 'note')
    });

    await notifyUser(support.id, 'Yêu cầu được phân công', `Yêu cầu ${ticket.code} đã được phân công cho bạn`, 'ASSIGNMENT', ticketId);
    await notifyUser(ticket.requester_id, 'Yêu cầu đã được phân công', `Yêu cầu ${ticket.code} đã được phân công cho ${support.full_name}`, 'ASSIGNMENT', ticketId);

    return ticketRepository.findById(ticketId);
};

const reassignTicket = assignTicket;

const updatePriority = async (ticketId, payload, user) => {
    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);
    ensureNotFinal(ticket, 'cập nhật mức ưu tiên');

    const priority = await resolvePriority(payload);

    await ticketRepository.updateTicket(ticketId, { priority_id: priority.id });
    await ticketRepository.addHistory({
        ticket_id: ticketId,
        user_id: user.id,
        action: 'UPDATE_PRIORITY',
        from_value: ticket.priority_code,
        to_value: priority.code,
        note: valueOf(payload, 'note')
    });

    return ticketRepository.findById(ticketId);
};

const updateStatus = async (ticketId, payload, user) => {
    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);

    const status = await resolveStatus(payload);
    ensureTransition(ticket, status.code, user);

    const data = { status_id: status.id };

    if (!ticket.first_response_at && ['IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'].includes(status.code)) {
        data.first_response_at = toMysqlDate(new Date());
    }

    if (status.code === 'RESOLVED') {
        data.resolved_at = toMysqlDate(new Date());
        data.resolution = valueOf(payload, 'resolution', 'note');
    }

    if (status.code === 'CLOSED') {
        data.closed_at = toMysqlDate(new Date());
    }

    if (status.code === 'CANCELLED') {
        data.cancelled_reason = valueOf(payload, 'reason', 'cancelledReason', 'cancelled_reason');
    }

    await ticketRepository.updateTicket(ticketId, data);
    await ticketRepository.addHistory({
        ticket_id: ticketId,
        user_id: user.id,
        action: 'UPDATE_STATUS',
        from_value: ticket.status_code,
        to_value: status.code,
        note: valueOf(payload, 'note', 'resolution', 'reason')
    });

    await notifyUser(ticket.requester_id, 'Trạng thái yêu cầu đã thay đổi', `Yêu cầu ${ticket.code} đã chuyển sang ${status.name}`, 'STATUS', ticketId);

    return ticketRepository.findById(ticketId);
};

const startTicket = (ticketId, user) => updateStatus(ticketId, { statusCode: 'IN_PROGRESS' }, user);

const resolveTicket = (ticketId, payload, user) => updateStatus(ticketId, {
    statusCode: 'RESOLVED',
    resolution: valueOf(payload, 'resolution', 'note')
}, user);

const cancelTicket = async (ticketId, payload, user) => {
    const ticket = await ensureTicket(ticketId);

    if (Number(ticket.requester_id) !== Number(user.id)) {
        throw httpError(403, 'Chỉ người tạo yêu cầu được hủy yêu cầu này');
    }

    if (!['NEW', 'ASSIGNED'].includes(ticket.status_code)) {
        throw httpError(400, 'Chỉ được hủy yêu cầu khi trạng thái là NEW hoặc ASSIGNED');
    }

    return updateStatus(ticketId, {
        statusCode: 'CANCELLED',
        reason: valueOf(payload, 'reason', 'cancelledReason', 'cancelled_reason')
    }, user);
};

const addComment = async (ticketId, payload, user) => {
    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);

    const id = await ticketRepository.addComment({
        ticket_id: ticketId,
        user_id: user.id,
        content: valueOf(payload, 'content', 'comment'),
        is_internal: boolValue(valueOf(payload, 'isInternal', 'is_internal')) && roleOf(user) !== 'REQUESTER'
    });

    await ticketRepository.addHistory({
        ticket_id: ticketId,
        user_id: user.id,
        action: 'COMMENT',
        note: `Thêm phản hồi #${id}`
    });

    const role = roleOf(user);
    if (role === 'REQUESTER' && ticket.assigned_to) {
        await notifyUser(ticket.assigned_to, 'Người dùng phản hồi mới', `Yêu cầu ${ticket.code} có phản hồi mới từ người dùng`, 'COMMENT', ticketId);
    } else if (role !== 'REQUESTER') {
        await notifyUser(ticket.requester_id, 'Nhân viên IT phản hồi mới', `Yêu cầu ${ticket.code} có phản hồi mới từ nhân viên IT`, 'COMMENT', ticketId);
    }

    return ticketRepository.getComments(ticketId);
};

const getComments = async (ticketId, user) => {
    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);
    const comments = await ticketRepository.getComments(ticketId);

    if (roleOf(user) === 'REQUESTER') {
        return comments.filter((comment) => !comment.is_internal);
    }

    return comments;
};

const uploadAttachment = async (ticketId, file, user) => {
    if (!file) {
        throw httpError(400, 'Vui lòng chọn file cần tải lên');
    }

    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);

    const relativePath = `/uploads/${path.basename(file.path)}`;
    const id = await ticketRepository.addAttachment({
        ticket_id: ticketId,
        uploaded_by: user.id,
        original_name: file.originalname,
        file_name: file.filename,
        file_path: relativePath,
        mime_type: file.mimetype,
        size: file.size
    });

    await ticketRepository.addHistory({
        ticket_id: ticketId,
        user_id: user.id,
        action: 'UPLOAD_ATTACHMENT',
        to_value: file.originalname,
        note: `Tải file #${id}`
    });

    return ticketRepository.getAttachments(ticketId);
};

const getAttachments = async (ticketId, user) => {
    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);
    return ticketRepository.getAttachments(ticketId);
};

const addFeedback = async (ticketId, payload, user) => {
    const ticket = await ensureTicket(ticketId);

    if (Number(ticket.requester_id) !== Number(user.id)) {
        throw httpError(403, 'Chỉ người tạo yêu cầu được gửi đánh giá');
    }

    if (!ticket.status_is_closed) {
        throw httpError(400, 'Chỉ được đánh giá yêu cầu đã xử lý hoặc đã đóng');
    }

    const existing = await ticketRepository.getFeedbackByTicketAndUser(ticketId, user.id);
    if (existing) {
        throw httpError(409, 'Yêu cầu này đã có đánh giá');
    }

    const rating = Number(valueOf(payload, 'rating'));
    const comment = valueOf(payload, 'comment', 'reason');

    if (rating < 3 && !comment) {
        throw httpError(400, 'Cần nhập lý do đánh giá');
    }

    const id = await ticketRepository.addFeedback({
        ticket_id: ticketId,
        user_id: user.id,
        rating,
        comment
    });

    await ticketRepository.addHistory({
        ticket_id: ticketId,
        user_id: user.id,
        action: 'FEEDBACK',
        to_value: String(rating),
        note: `Gửi đánh giá #${id}`
    });

    return { id };
};

const getTicketHistory = async (ticketId, user) => {
    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);
    return ticketRepository.getTicketHistory(ticketId);
};

const getAssignmentHistory = async (ticketId, user) => {
    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);
    return ticketRepository.getAssignmentHistory(ticketId);
};

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
