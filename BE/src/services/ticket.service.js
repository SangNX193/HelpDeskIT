const crypto = require('crypto');
const path = require('path');

const ticketRepository = require('../repositories/ticket.repository');
const notificationRepository = require('../repositories/notification.repository');
const authRepository = require('../repositories/auth.repository');
const aiSuggestionService = require('./ai-suggestion.service');
const { addMinutes, appDateParts, parseAppDate, toMysqlDate } = require('../utils/time');

const httpError = (statusCode, message, details = undefined) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (details !== undefined) {
        error.details = details;
    }
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

const EDIT_WINDOW_MINUTES = 5;
const MAX_ROOM_LENGTH = 60;
const DUPLICATE_LOOKBACK_MINUTES = Number(process.env.TICKET_DUPLICATE_LOOKBACK_MINUTES) || 240;
const MAX_AI_CHAT_MESSAGE_LENGTH = Number(process.env.AI_CHAT_MAX_MESSAGE_LENGTH) || 2000;
const AI_CHAT_LOAD_LIMIT = Number(process.env.AI_CHAT_LOAD_LIMIT) || 50;
const AI_CHAT_HISTORY_LIMIT = Number(process.env.AI_CHAT_HISTORY_LIMIT) || 12;

const generateTicketCode = () => {
    const now = appDateParts();
    const part = (value) => String(value).padStart(2, '0');
    const date = `${now.year}${part(now.month)}${part(now.day)}`;
    const time = `${part(now.hour)}${part(now.minute)}${part(now.second)}`;
    const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `HD${date}${time}${suffix}`;
};

const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const normalizeForDuplicate = (value) => normalizeText(value)
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const duplicateTokens = (value) => new Set(
    normalizeForDuplicate(value)
        .split(/[^a-z0-9]+/i)
        .filter((token) => token.length >= 3)
);

const tokenOverlap = (left, right) => {
    const leftTokens = duplicateTokens(left);
    const rightTokens = duplicateTokens(right);

    if (!leftTokens.size || !rightTokens.size) {
        return 0;
    }

    let matches = 0;
    for (const token of leftTokens) {
        if (rightTokens.has(token)) {
            matches += 1;
        }
    }

    return matches / Math.min(leftTokens.size, rightTokens.size);
};

const duplicateScore = (candidate, input) => {
    let score = 70;
    const titleOverlap = tokenOverlap(candidate.title, input.title);
    const descriptionOverlap = tokenOverlap(candidate.description, input.description);

    if (titleOverlap >= 0.35) {
        score += 20;
    } else if (titleOverlap > 0) {
        score += 10;
    }

    if (descriptionOverlap >= 0.25) {
        score += 10;
    }

    return Math.min(score, 100);
};

const decorateDuplicateCandidates = (candidates, input) => candidates
    .map((candidate) => ({
        ...candidate,
        duplicate_score: duplicateScore(candidate, input),
        duplicate_reason: 'Cùng phòng/khu, cùng dịch vụ và đang có ticket mở trong thời gian gần đây'
    }))
    .sort((left, right) => right.duplicate_score - left.duplicate_score)
    .slice(0, 5);

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

const ensureAiChatMessage = (value) => {
    const normalized = normalizeText(value);

    if (!normalized) {
        throw httpError(400, 'Vui lòng nhập tin nhắn');
    }

    if (normalized.length > MAX_AI_CHAT_MESSAGE_LENGTH) {
        throw httpError(400, `Tin nhắn không được vượt quá ${MAX_AI_CHAT_MESSAGE_LENGTH} ký tự`);
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

const positiveIds = (values = []) => [...new Set(values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0))];

const parseIdList = (value) => {
    if (value === undefined || value === null) {
        return [];
    }

    if (Array.isArray(value)) {
        return positiveIds(value.flatMap((item) => parseIdList(item)));
    }

    return positiveIds(String(value).split(','));
};

const supportIdsFromPayload = (payload) => parseIdList(valueOf(
    payload,
    'supportIds',
    'support_ids',
    'supportId',
    'support_id',
    'assignedTo',
    'assigned_to'
));

const assignedSupportIdsOf = (ticket = {}) => positiveIds([
    ...parseIdList(ticket.assigned_support_ids),
    ticket.assigned_to
]);

const assignedSupportNamesOf = (ticket = {}) => ticket.assigned_support_names || ticket.assigned_to_name || null;

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

    if (role === 'REQUESTER' && await ticketRepository.isTicketWatcher(ticket.id, user.id)) {
        return;
    }

    if (role === 'SUPPORT' && assignedSupportIdsOf(ticket).includes(Number(user.id))) {
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

const notifyUsers = async (userIds, title, message, type, ticketId) => {
    for (const userId of positiveIds(userIds)) {
        await notifyUser(userId, title, message, type, ticketId);
    }
};

const duplicateInputFromPayload = async (payload) => {
    const serviceId = valueOf(payload, 'serviceId', 'service_id');
    const service = await ticketRepository.getServiceById(serviceId);

    if (!service) {
        throw httpError(404, 'Không tìm thấy dịch vụ');
    }

    return {
        service,
        title: ensureMeaningfulText(valueOf(payload, 'title'), 'Tiêu đề'),
        description: ensureMeaningfulText(valueOf(payload, 'description'), 'Mô tả chi tiết'),
        room: await resolveRoomLocation(payload)
    };
};

const findDuplicateCandidates = async (input) => {
    const candidates = await ticketRepository.findDuplicateCandidates({
        room: input.room,
        serviceId: input.service.id,
        windowMinutes: DUPLICATE_LOOKBACK_MINUTES,
        limit: 8
    });

    return decorateDuplicateCandidates(candidates, input);
};

const checkDuplicateTickets = async (payload) => {
    const input = await duplicateInputFromPayload(payload);
    return findDuplicateCandidates(input);
};

const createTicket = async (payload, user) => {
    const duplicateInput = await duplicateInputFromPayload(payload);
    const { service, title, description, room } = duplicateInput;
    const allowDuplicate = boolValue(valueOf(payload, 'allowDuplicate', 'allow_duplicate', 'forceCreate', 'force_create'));
    if (!allowDuplicate) {
        const duplicates = await findDuplicateCandidates(duplicateInput);
        if (duplicates.length) {
            throw httpError(409, 'Đã có yêu cầu tương tự đang được xử lý', { duplicates });
        }
    }

    const priority = await resolvePriority(payload);
    const status = await resolveStatus(payload);
    const sla = await ticketRepository.getSlaPolicy(service.id, priority.id);
    const responseMinutes = sla ? sla.response_time_minutes : priority.response_time_minutes;
    const resolveMinutes = sla ? sla.resolve_time_minutes : priority.resolve_time_minutes;

    let id;
    for (let attempt = 0; attempt < 3 && !id; attempt += 1) {
        try {
            id = await ticketRepository.createTicket({
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
        } catch (error) {
            if (error.code !== 'ER_DUP_ENTRY' || !String(error.message || '').includes('code')) {
                throw error;
            }
        }
    }

    if (!id) {
        throw httpError(500, 'Khong the tao ma yeu cau duy nhat. Vui long thu lai.');
    }

    await ticketRepository.addHistory({
        ticket_id: id,
        user_id: user.id,
        action: 'CREATE',
        to_value: status.code,
        note: 'Tạo yêu cầu'
    });

    return ticketRepository.findById(id);
};

const watchDuplicateTicket = async (ticketId, payload, user) => {
    const ticket = await ensureTicket(ticketId);

    if (ticket.status_is_closed) {
        throw httpError(400, 'Yêu cầu này đã kết thúc nên không thể theo dõi như ticket trùng');
    }

    if (Number(ticket.requester_id) === Number(user.id)) {
        return ticket;
    }

    await ticketRepository.addTicketWatcher({
        ticket_id: ticketId,
        user_id: user.id,
        source: valueOf(payload, 'source') || 'WEB_DUPLICATE',
        note: valueOf(payload, 'note', 'description')
    });

    await ticketRepository.addHistory({
        ticket_id: ticketId,
        user_id: user.id,
        action: 'DUPLICATE_WATCH',
        to_value: String(user.id),
        note: valueOf(payload, 'note', 'description') || 'Người dùng theo dõi yêu cầu tương tự'
    });

    await notifyUser(ticket.requester_id, 'Có người cùng bị ảnh hưởng', `${user.full_name || 'Người dùng'} đã theo dõi yêu cầu ${ticket.code}`, 'DUPLICATE', ticketId);
    await notifyUsers(assignedSupportIdsOf(ticket), 'Yêu cầu có thêm người bị ảnh hưởng', `${user.full_name || 'Người dùng'} cũng báo sự cố tương tự với ${ticket.code}`, 'DUPLICATE', ticketId);

    return ticketRepository.findById(ticketId);
};

const updateRequesterTicket = async (ticketId, payload, user) => {
    const ticket = await ensureTicket(ticketId);

    if (roleOf(user) !== 'REQUESTER' || Number(ticket.requester_id) !== Number(user.id)) {
        throw httpError(403, 'Chỉ người tạo yêu cầu được chỉnh sửa yêu cầu này');
    }

    if (!['NEW', 'ASSIGNED'].includes(ticket.status_code)) {
        throw httpError(400, 'Chỉ được chỉnh sửa yêu cầu khi trạng thái là mới tạo hoặc đã phân công');
    }

    const createdAt = parseAppDate(ticket.created_at)?.getTime();
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

const getMyTickets = (user) => ticketRepository.listTickets({ requesterOrWatcherId: user.id });
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

const ensureSupportUsers = async (supportIds) => {
    if (!supportIds.length) {
        throw httpError(400, 'Vui lòng chọn ít nhất một nhân viên IT');
    }

    const supports = [];
    for (const supportId of supportIds) {
        supports.push(await ensureSupportUser(supportId));
    }

    return supports;
};

const assignTicket = async (ticketId, payload, user) => {
    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);
    ensureNotFinal(ticket, 'phân công');

    const supports = await ensureSupportUsers(supportIdsFromPayload(payload));
    for (const support of supports) {
        if (!await ticketRepository.userHasRoomAccess(support.id, ticket.room)) {
            throw httpError(400, `${support.full_name} chưa được phân công hỗ trợ tòa của yêu cầu này`);
        }
    }

    const primarySupport = supports[0];
    const nextSupportIds = supports.map((support) => support.id);
    const nextSupportNames = supports.map((support) => support.full_name).join(', ');
    const previousSupportNames = assignedSupportNamesOf(ticket);
    const assignedStatus = await resolveStatus({ statusCode: 'ASSIGNED' });
    const updateData = {
        assigned_to: primarySupport.id,
        assigned_by: user.id
    };

    if (ticket.status_code !== 'ASSIGNED') {
        updateData.status_id = assignedStatus.id;
    }

    await ticketRepository.replaceTicketAssignees(ticketId, nextSupportIds, user.id, updateData);

    await ticketRepository.addAssignmentHistory({
        ticket_id: ticketId,
        from_support_id: ticket.assigned_to,
        to_support_id: primarySupport.id,
        assigned_by: user.id,
        note: valueOf(payload, 'note')
    });

    await ticketRepository.addHistory({
        ticket_id: ticketId,
        user_id: user.id,
        action: assignedSupportIdsOf(ticket).length ? 'REASSIGN' : 'ASSIGN',
        from_value: previousSupportNames,
        to_value: nextSupportNames,
        note: valueOf(payload, 'note')
    });

    await notifyUsers(nextSupportIds, 'Yêu cầu được phân công', `Yêu cầu ${ticket.code} đã được phân công cho bạn`, 'ASSIGNMENT', ticketId);
    await notifyUser(ticket.requester_id, 'Yêu cầu đã được phân công', `Yêu cầu ${ticket.code} đã được phân công cho ${nextSupportNames}`, 'ASSIGNMENT', ticketId);

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

const assigneeStatusData = (statusCode, payload = {}) => {
    const now = toMysqlDate(new Date());

    if (statusCode === 'IN_PROGRESS') {
        return { accepted_at: now };
    }

    if (statusCode === 'RESOLVED') {
        return {
            resolved_at: now,
            resolution: valueOf(payload, 'resolution', 'note')
        };
    }

    return {};
};

const syncAssigneesForDirectStatus = async (ticketId, statusCode, payload) => {
    if (!['ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED'].includes(statusCode)) {
        return;
    }

    await ticketRepository.updateAllTicketAssigneeStatuses(ticketId, statusCode, assigneeStatusData(statusCode, payload));
};

const applyTicketStatus = async (ticket, status, payload, user, options = {}) => {
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

    if (options.syncAssignees !== false) {
        await syncAssigneesForDirectStatus(ticket.id, status.code, payload);
    }

    await ticketRepository.updateTicket(ticket.id, data);
    await ticketRepository.addHistory({
        ticket_id: ticket.id,
        user_id: user.id,
        action: 'UPDATE_STATUS',
        from_value: ticket.status_code,
        to_value: status.code,
        note: valueOf(payload, 'note', 'resolution', 'reason')
    });

    await notifyUser(ticket.requester_id, 'Trạng thái yêu cầu đã thay đổi', `Yêu cầu ${ticket.code} đã chuyển sang ${status.name}`, 'STATUS', ticket.id);

    return ticketRepository.findById(ticket.id);
};

const supportWorkflowStatus = async (ticket, payload, user, nextStatusCode, options = {}) => {
    if (roleOf(user) !== 'SUPPORT') {
        throw httpError(403, 'Chỉ nhân viên IT được thực hiện thao tác này');
    }

    if (!options.allowedTicketStatuses.includes(ticket.status_code)) {
        throw httpError(400, options.invalidMessage);
    }

    const assignees = await ticketRepository.getTicketAssignees(ticket.id);
    const assignee = assignees.find((item) => Number(item.user_id) === Number(user.id));
    if (!assignee) {
        throw httpError(403, 'Bạn không nằm trong danh sách nhân viên xử lý yêu cầu này');
    }

    if (assignee.status_code === nextStatusCode || assignee.status_code === 'RESOLVED') {
        return ticketRepository.findById(ticket.id);
    }

    if (options.allowedAssigneeStatuses && !options.allowedAssigneeStatuses.includes(assignee.status_code)) {
        throw httpError(400, options.invalidAssigneeMessage || 'Trạng thái xử lý của bạn chưa phù hợp để thực hiện thao tác này');
    }

    await ticketRepository.updateTicketAssigneeStatus(ticket.id, user.id, nextStatusCode, assigneeStatusData(nextStatusCode, payload));
    await ticketRepository.addHistory({
        ticket_id: ticket.id,
        user_id: user.id,
        action: options.historyAction,
        from_value: assignee.status_code,
        to_value: nextStatusCode,
        note: valueOf(payload, 'note', 'resolution') || options.historyNote
    });

    const latestAssignees = await ticketRepository.getTicketAssignees(ticket.id);
    const allSameStatus = latestAssignees.length > 0 && latestAssignees.every((item) => item.status_code === nextStatusCode);

    if (!allSameStatus || ticket.status_code === nextStatusCode) {
        return ticketRepository.findById(ticket.id);
    }

    const status = await resolveStatus({ statusCode: nextStatusCode });
    return applyTicketStatus(ticket, status, payload, user, { syncAssignees: false });
};

const updateStatus = async (ticketId, payload, user) => {
    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);

    const status = await resolveStatus(payload);

    if (roleOf(user) === 'SUPPORT' && status.code === 'WAITING_FOR_USER') {
        return supportWorkflowStatus(ticket, payload, user, 'WAITING_FOR_USER', {
            allowedTicketStatuses: ['IN_PROGRESS'],
            allowedAssigneeStatuses: ['IN_PROGRESS'],
            invalidMessage: 'Chỉ chuyển sang chờ người dùng khi yêu cầu đang xử lý',
            invalidAssigneeMessage: 'Bạn cần tiếp nhận xử lý trước khi chuyển sang chờ người dùng',
            historyAction: 'SUPPORT_WAITING',
            historyNote: 'Nhân viên IT chờ người dùng bổ sung'
        });
    }

    return applyTicketStatus(ticket, status, payload, user);
};

const startTicket = async (ticketId, user) => {
    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);
    ensureNotFinal(ticket, 'tiếp nhận');

    return supportWorkflowStatus(ticket, { statusCode: 'IN_PROGRESS' }, user, 'IN_PROGRESS', {
        allowedTicketStatuses: ['ASSIGNED', 'WAITING_FOR_USER', 'IN_PROGRESS'],
        allowedAssigneeStatuses: ['ASSIGNED', 'WAITING_FOR_USER'],
        invalidMessage: 'Chỉ tiếp nhận yêu cầu khi đã phân công hoặc đang chờ người dùng',
        invalidAssigneeMessage: 'Bạn đã tiếp nhận hoặc hoàn tất yêu cầu này',
        historyAction: 'SUPPORT_START',
        historyNote: 'Nhân viên IT đã tiếp nhận xử lý'
    });
};

const resolveTicket = async (ticketId, payload, user) => {
    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);
    ensureNotFinal(ticket, 'hoàn tất');

    return supportWorkflowStatus(ticket, {
        statusCode: 'RESOLVED',
        resolution: valueOf(payload, 'resolution', 'note')
    }, user, 'RESOLVED', {
        allowedTicketStatuses: ['IN_PROGRESS'],
        allowedAssigneeStatuses: ['IN_PROGRESS'],
        invalidMessage: 'Chỉ hoàn tất yêu cầu khi yêu cầu đang xử lý',
        invalidAssigneeMessage: 'Bạn cần tiếp nhận xử lý trước khi hoàn tất',
        historyAction: 'SUPPORT_RESOLVE',
        historyNote: 'Nhân viên IT đã hoàn tất phần xử lý'
    });
};

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
    if (role === 'REQUESTER' && assignedSupportIdsOf(ticket).length) {
        await notifyUsers(assignedSupportIdsOf(ticket), 'Người dùng phản hồi mới', `Yêu cầu ${ticket.code} có phản hồi mới từ người dùng`, 'COMMENT', ticketId);
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

const generateAiSuggestion = async (ticketId, user) => {
    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);

    const attachments = await ticketRepository.getAttachments(ticketId);
    const result = await aiSuggestionService.generateSuggestion({ ticket, attachments });

    await ticketRepository.addHistory({
        ticket_id: ticketId,
        user_id: user.id,
        action: 'AI_SUGGESTION',
        to_value: result.provider,
        note: `Tạo gợi ý AI bằng ${result.model}`
    });

    return result;
};

const getAiChatMessages = async (ticketId, user) => {
    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);
    return ticketRepository.getAiChatMessages(ticketId, user.id, AI_CHAT_LOAD_LIMIT);
};

const sendAiChatMessage = async (ticketId, payload, user) => {
    const ticket = await ensureTicket(ticketId);
    await ensureAccess(ticket, user);

    const content = ensureAiChatMessage(valueOf(payload, 'message', 'content'));
    const attachments = await ticketRepository.getAttachments(ticketId);
    const history = await ticketRepository.getAiChatMessages(ticketId, user.id, AI_CHAT_HISTORY_LIMIT);
    const messages = [
        ...history,
        {
            role: 'USER',
            content,
            user_name: user.full_name
        }
    ];
    const result = await aiSuggestionService.generateChatReply({
        ticket,
        attachments,
        messages,
        user
    });

    await ticketRepository.addAiChatMessage({
        ticket_id: ticketId,
        user_id: user.id,
        role: 'USER',
        content
    });

    await ticketRepository.addAiChatMessage({
        ticket_id: ticketId,
        user_id: user.id,
        role: 'ASSISTANT',
        content: result.message,
        provider: result.provider,
        model: result.model
    });

    await ticketRepository.addHistory({
        ticket_id: ticketId,
        user_id: user.id,
        action: 'AI_CHAT',
        to_value: result.provider,
        note: `Chat AI bằng ${result.model}`
    });

    return {
        provider: result.provider,
        model: result.model,
        attachments_used: result.attachments_used,
        generated_at: result.generated_at,
        messages: await ticketRepository.getAiChatMessages(ticketId, user.id, AI_CHAT_LOAD_LIMIT)
    };
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
    checkDuplicateTickets,
    createTicket,
    watchDuplicateTicket,
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
    generateAiSuggestion,
    getAiChatMessages,
    sendAiChatMessage,
    addFeedback,
    getTicketHistory,
    getAssignmentHistory
};
