const consultationRepository = require('../repositories/consultation.repository');
const notificationRepository = require('../repositories/notification.repository');

const MAX_MESSAGE_LENGTH = Number(process.env.CONSULTATION_MESSAGE_MAX_LENGTH) || 2000;
const MESSAGE_LOAD_LIMIT = Number(process.env.CONSULTATION_MESSAGE_LOAD_LIMIT) || 80;

const httpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const roleOf = (user = {}) => String(user.role_code || user.role || '').toUpperCase();
const isSystemStaff = (user) => ['SUPPORT', 'MANAGER', 'ADMIN'].includes(roleOf(user));
const normalizeFolder = (value) => {
    const folder = String(value || 'all').toLowerCase();
    return ['all', 'unread', 'archived', 'deleted'].includes(folder) ? folder : 'all';
};

const normalizeMessage = (value) => {
    const content = String(value || '').replace(/\s+/g, ' ').trim();

    if (!content) {
        throw httpError(400, 'Vui lòng nhập tin nhắn');
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
        throw httpError(400, `Tin nhắn không được vượt quá ${MAX_MESSAGE_LENGTH} ký tự`);
    }

    return content;
};

const ensureConversationAccess = (conversation, user) => {
    if (!conversation) {
        throw httpError(404, 'Không tìm thấy cuộc tư vấn');
    }

    if (isSystemStaff(user)) {
        return;
    }

    if (roleOf(user) === 'REQUESTER' && Number(conversation.requester_id) === Number(user.id)) {
        return;
    }

    throw httpError(403, 'Bạn không có quyền truy cập cuộc tư vấn này');
};

const withMessages = async (conversation, user) => {
    ensureConversationAccess(conversation, user);
    await consultationRepository.markRead(conversation.id, user);

    return {
        conversation: await consultationRepository.findConversationById(conversation.id, user),
        messages: await consultationRepository.getMessages(conversation.id, MESSAGE_LOAD_LIMIT)
    };
};

const getMyConversation = async (user) => {
    if (roleOf(user) !== 'REQUESTER') {
        throw httpError(403, 'Chỉ người dùng mới có cuộc tư vấn cá nhân');
    }

    const conversationId = await consultationRepository.getOrCreateConversationForRequester(user.id);
    const conversation = await consultationRepository.findConversationById(conversationId, user);
    return withMessages(conversation, user);
};

const listConversations = async (user, query = {}) => {
    if (!isSystemStaff(user)) {
        throw httpError(403, 'Chỉ nhân viên hệ thống được xem hộp tư vấn');
    }

    return consultationRepository.listConversations(user, {
        folder: normalizeFolder(query.folder),
        limit: query.limit
    });
};

const getConversation = async (conversationId, user) => {
    const conversation = await consultationRepository.findConversationById(conversationId, user);
    return withMessages(conversation, user);
};

const ensureStaffConversation = async (conversationId, user) => {
    if (!isSystemStaff(user)) {
        throw httpError(403, 'Chỉ nhân viên hệ thống được thao tác với hộp tư vấn');
    }

    const conversation = await consultationRepository.findConversationById(conversationId, user);
    ensureConversationAccess(conversation, user);
    return conversation;
};

const markStaffUnread = async (conversationId, user) => {
    await ensureStaffConversation(conversationId, user);
    await consultationRepository.markStaffUnread(conversationId);
    return consultationRepository.findConversationById(conversationId, user);
};

const archiveConversation = async (conversationId, user) => {
    await ensureStaffConversation(conversationId, user);
    await consultationRepository.archiveConversation(conversationId);
    return consultationRepository.findConversationById(conversationId, user);
};

const deleteConversation = async (conversationId, user) => {
    await ensureStaffConversation(conversationId, user);
    await consultationRepository.deleteConversation(conversationId);
    return consultationRepository.findConversationById(conversationId, user);
};

const restoreConversation = async (conversationId, user) => {
    await ensureStaffConversation(conversationId, user);
    await consultationRepository.restoreConversation(conversationId);
    return consultationRepository.findConversationById(conversationId, user);
};

const notifySystemStaff = async (conversation, sender) => {
    const staffIds = await consultationRepository.listSystemStaffIds();
    const receivers = staffIds.filter((id) => Number(id) !== Number(sender.id));

    for (const userId of receivers) {
        await notificationRepository.createNotification({
            user_id: userId,
            title: 'Có tin nhắn tư vấn mới',
            message: `${sender.full_name || 'Người dùng'} vừa gửi tin nhắn tư vấn`,
            type: 'CONSULTATION'
        });
    }
};

const notifyRequester = async (conversation, sender) => {
    if (Number(conversation.requester_id) === Number(sender.id)) {
        return;
    }

    await notificationRepository.createNotification({
        user_id: conversation.requester_id,
        title: 'Nhân viên hệ thống đã phản hồi',
        message: `${sender.full_name || 'Nhân viên hệ thống'} vừa trả lời cuộc tư vấn của bạn`,
        type: 'CONSULTATION'
    });
};

const sendMessage = async (conversationId, payload, user) => {
    const content = normalizeMessage(payload.message || payload.content);
    const conversation = await consultationRepository.findConversationById(conversationId, user);
    ensureConversationAccess(conversation, user);

    await consultationRepository.addMessage({
        conversationId: conversation.id,
        senderId: user.id,
        senderRoleCode: roleOf(user),
        content
    });

    if (roleOf(user) === 'REQUESTER') {
        await notifySystemStaff(conversation, user);
    } else {
        await notifyRequester(conversation, user);
    }

    return getConversation(conversation.id, user);
};

const sendMyMessage = async (payload, user) => {
    if (roleOf(user) !== 'REQUESTER') {
        throw httpError(403, 'Chỉ người dùng mới gửi tin nhắn tư vấn cá nhân');
    }

    const conversationId = await consultationRepository.getOrCreateConversationForRequester(user.id);
    return sendMessage(conversationId, payload, user);
};

const getSummary = (user) => consultationRepository.getUnreadSummary(user);

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
