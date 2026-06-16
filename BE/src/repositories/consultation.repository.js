const db = require('../config/db');

const conversationColumns = `
    cc.*,
    requester.full_name AS requester_name,
    requester.email AS requester_email,
    requester.phone AS requester_phone,
    assigned_user.full_name AS assigned_to_name,
    last_sender.full_name AS last_sender_name,
    (
        SELECT cm.content
        FROM consultation_messages cm
        WHERE cm.conversation_id = cc.id
        ORDER BY cm.created_at DESC, cm.id DESC
        LIMIT 1
    ) AS last_message_content
`;

const conversationFrom = `
    FROM consultation_conversations cc
    INNER JOIN users requester ON requester.id = cc.requester_id
    LEFT JOIN users assigned_user ON assigned_user.id = cc.assigned_to
    LEFT JOIN users last_sender ON last_sender.id = cc.last_sender_id
`;

const unreadExpressionFor = (user) => {
    const role = String(user?.role_code || '').toUpperCase();

    if (role === 'REQUESTER') {
        return `
            CASE
                WHEN cc.last_sender_id IS NOT NULL
                 AND cc.last_sender_id <> cc.requester_id
                 AND (cc.requester_last_read_at IS NULL OR cc.last_message_at > cc.requester_last_read_at)
                THEN 1 ELSE 0
            END
        `;
    }

    return `
        CASE
            WHEN cc.last_sender_role_code = 'REQUESTER'
             AND (cc.staff_last_read_at IS NULL OR cc.last_message_at > cc.staff_last_read_at)
            THEN 1 ELSE 0
        END
    `;
};

const conversationSelect = (user) => `
    SELECT
        ${conversationColumns},
        ${unreadExpressionFor(user)} AS unread_count
    ${conversationFrom}
`;

const conversationHasMessages = `
    EXISTS (
        SELECT 1
        FROM consultation_messages cm
        WHERE cm.conversation_id = cc.id
    )
`;

const staffFolderCondition = (folder, user) => {
    const normalized = String(folder || 'all').toLowerCase();

    if (normalized === 'unread') {
        return `cc.staff_state <> 'DELETED' AND (${unreadExpressionFor(user)}) = 1`;
    }

    if (normalized === 'archived') {
        return "cc.staff_state = 'ARCHIVED'";
    }

    if (normalized === 'deleted') {
        return "cc.staff_state = 'DELETED'";
    }

    return "cc.staff_state <> 'DELETED'";
};

const getOrCreateConversationForRequester = async (requesterId) => {
    const result = await db.query(`
        INSERT INTO consultation_conversations (requester_id)
        VALUES (?)
        ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
    `, [requesterId]);

    return result.insertId;
};

const findConversationById = async (id, user) => {
    const rows = await db.query(`
        ${conversationSelect(user)}
        WHERE cc.id = ?
        LIMIT 1
    `, [id]);

    return rows[0] || null;
};

const findConversationByRequester = async (requesterId, user) => {
    const rows = await db.query(`
        ${conversationSelect(user)}
        WHERE cc.requester_id = ?
        LIMIT 1
    `, [requesterId]);

    return rows[0] || null;
};

const listConversations = (user, options = {}) => {
    const limit = options.limit || 40;
    const folder = options.folder || 'all';
    const safeLimit = Math.max(1, Math.min(Number(limit) || 40, 100));
    return db.query(`
        ${conversationSelect(user)}
        WHERE ${conversationHasMessages}
          AND ${staffFolderCondition(folder, user)}
        ORDER BY COALESCE(cc.last_message_at, cc.created_at) DESC, cc.id DESC
        LIMIT ${safeLimit}
    `);
};

const getMessages = (conversationId, limit = 80) => {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 80, 200));
    return db.query(`
        SELECT *
        FROM (
            SELECT
                cm.id,
                cm.conversation_id,
                cm.sender_id,
                cm.sender_role_code,
                cm.content,
                cm.created_at,
                u.full_name AS sender_name,
                u.email AS sender_email
            FROM consultation_messages cm
            INNER JOIN users u ON u.id = cm.sender_id
            WHERE cm.conversation_id = ?
            ORDER BY cm.created_at DESC, cm.id DESC
            LIMIT ${safeLimit}
        ) recent_messages
        ORDER BY recent_messages.created_at ASC, recent_messages.id ASC
    `, [conversationId]);
};

const addMessage = async ({ conversationId, senderId, senderRoleCode, content }) => db.transaction(async (connection) => {
    const [result] = await connection.execute(`
        INSERT INTO consultation_messages (conversation_id, sender_id, sender_role_code, content)
        VALUES (?, ?, ?, ?)
    `, [conversationId, senderId, senderRoleCode, content]);

    await connection.execute(`
        UPDATE consultation_conversations
        SET
            assigned_to = CASE WHEN ? <> 'REQUESTER' THEN ? ELSE assigned_to END,
            staff_state = CASE WHEN ? = 'REQUESTER' THEN 'ACTIVE' ELSE staff_state END,
            staff_archived_at = CASE WHEN ? = 'REQUESTER' THEN NULL ELSE staff_archived_at END,
            staff_deleted_at = CASE WHEN ? = 'REQUESTER' THEN NULL ELSE staff_deleted_at END,
            last_message_at = NOW(),
            last_sender_id = ?,
            last_sender_role_code = ?,
            requester_last_read_at = CASE WHEN ? = 'REQUESTER' THEN NOW() ELSE requester_last_read_at END,
            staff_last_read_at = CASE WHEN ? <> 'REQUESTER' THEN NOW() ELSE staff_last_read_at END
        WHERE id = ?
    `, [
        senderRoleCode,
        senderId,
        senderRoleCode,
        senderRoleCode,
        senderRoleCode,
        senderId,
        senderRoleCode,
        senderRoleCode,
        senderRoleCode,
        conversationId
    ]);

    return result.insertId;
});

const markRead = (conversationId, user) => {
    const role = String(user?.role_code || '').toUpperCase();
    const column = role === 'REQUESTER' ? 'requester_last_read_at' : 'staff_last_read_at';
    return db.query(`
        UPDATE consultation_conversations
        SET ${column} = NOW()
        WHERE id = ?
    `, [conversationId]);
};

const markStaffUnread = (conversationId) => db.query(`
    UPDATE consultation_conversations
    SET
        staff_state = 'ACTIVE',
        staff_last_read_at = NULL,
        staff_archived_at = NULL,
        staff_deleted_at = NULL
    WHERE id = ?
`, [conversationId]);

const archiveConversation = (conversationId) => db.query(`
    UPDATE consultation_conversations
    SET
        staff_state = 'ARCHIVED',
        staff_archived_at = NOW(),
        staff_deleted_at = NULL
    WHERE id = ?
`, [conversationId]);

const deleteConversation = (conversationId) => db.query(`
    UPDATE consultation_conversations
    SET
        staff_state = 'DELETED',
        staff_deleted_at = NOW()
    WHERE id = ?
`, [conversationId]);

const restoreConversation = (conversationId) => db.query(`
    UPDATE consultation_conversations
    SET
        staff_state = 'ACTIVE',
        staff_archived_at = NULL,
        staff_deleted_at = NULL
    WHERE id = ?
`, [conversationId]);

const getUnreadSummary = async (user) => {
    const role = String(user?.role_code || '').toUpperCase();

    if (role !== 'REQUESTER') {
        const unread = unreadExpressionFor(user);
        const rows = await db.query(`
            SELECT
                SUM(CASE WHEN ${conversationHasMessages} AND cc.staff_state <> 'DELETED' THEN 1 ELSE 0 END) AS total_count,
                SUM(CASE WHEN ${conversationHasMessages} AND cc.staff_state <> 'DELETED' AND (${unread}) = 1 THEN 1 ELSE 0 END) AS unread_count,
                SUM(CASE WHEN ${conversationHasMessages} AND cc.staff_state = 'ARCHIVED' THEN 1 ELSE 0 END) AS archived_count,
                SUM(CASE WHEN ${conversationHasMessages} AND cc.staff_state = 'DELETED' THEN 1 ELSE 0 END) AS deleted_count
            FROM consultation_conversations cc
        `);

        return {
            conversation_count: Number(rows[0]?.total_count) || 0,
            total_count: Number(rows[0]?.total_count) || 0,
            unread_count: Number(rows[0]?.unread_count) || 0,
            archived_count: Number(rows[0]?.archived_count) || 0,
            deleted_count: Number(rows[0]?.deleted_count) || 0
        };
    }

    const params = role === 'REQUESTER' ? [user.id] : [];
    const requesterFilter = role === 'REQUESTER' ? 'WHERE cc.requester_id = ?' : '';
    const rows = await db.query(`
        SELECT
            COUNT(*) AS conversation_count,
            SUM(${unreadExpressionFor(user)}) AS unread_count
        FROM consultation_conversations cc
        ${requesterFilter}
    `, params);

    return {
        conversation_count: Number(rows[0]?.conversation_count) || 0,
        unread_count: Number(rows[0]?.unread_count) || 0
    };
};

const listSystemStaffIds = async () => {
    const rows = await db.query(`
        SELECT u.id
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE u.status = 'ACTIVE'
          AND r.code IN ('SUPPORT', 'MANAGER', 'ADMIN')
        ORDER BY u.id
    `);

    return rows.map((row) => row.id);
};

module.exports = {
    addMessage,
    archiveConversation,
    deleteConversation,
    findConversationById,
    findConversationByRequester,
    getMessages,
    getOrCreateConversationForRequester,
    getUnreadSummary,
    listConversations,
    listSystemStaffIds,
    markRead,
    markStaffUnread,
    restoreConversation
};
