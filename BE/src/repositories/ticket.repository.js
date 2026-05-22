const db = require('../config/db');

const ticketSelect = `
    SELECT
        t.*,
        requester.full_name AS requester_name,
        requester.email AS requester_email,
        COALESCE((
            SELECT GROUP_CONCAT(assigned_user.full_name ORDER BY ta.created_at, assigned_user.full_name SEPARATOR ', ')
            FROM ticket_assignees ta
            INNER JOIN users assigned_user ON assigned_user.id = ta.user_id
            WHERE ta.ticket_id = t.id
        ), assignee.full_name) AS assigned_to_name,
        assignee.email AS assigned_to_email,
        assigner.full_name AS assigned_by_name,
        COALESCE((
            SELECT GROUP_CONCAT(ta.user_id ORDER BY ta.created_at, assigned_user.full_name)
            FROM ticket_assignees ta
            INNER JOIN users assigned_user ON assigned_user.id = ta.user_id
            WHERE ta.ticket_id = t.id
        ), CAST(t.assigned_to AS CHAR)) AS assigned_support_ids,
        COALESCE((
            SELECT GROUP_CONCAT(assigned_user.full_name ORDER BY ta.created_at, assigned_user.full_name SEPARATOR ', ')
            FROM ticket_assignees ta
            INNER JOIN users assigned_user ON assigned_user.id = ta.user_id
            WHERE ta.ticket_id = t.id
        ), assignee.full_name) AS assigned_support_names,
        COALESCE((
            SELECT GROUP_CONCAT(CONCAT(ta.user_id, ':', ta.status_code) ORDER BY ta.created_at, assigned_user.full_name SEPARATOR ',')
            FROM ticket_assignees ta
            INNER JOIN users assigned_user ON assigned_user.id = ta.user_id
            WHERE ta.ticket_id = t.id
        ), IF(t.assigned_to IS NULL, NULL, CONCAT(t.assigned_to, ':ASSIGNED'))) AS assigned_support_statuses,
        s.code AS service_code,
        s.name AS service_name,
        c.code AS service_category_code,
        c.name AS service_category_name,
        p.code AS priority_code,
        p.name AS priority_name,
        p.level AS priority_level,
        p.color AS priority_color,
        st.code AS status_code,
        st.name AS status_name,
        st.color AS status_color,
        st.is_closed AS status_is_closed,
        f.rating AS feedback_rating,
        f.comment AS feedback_comment
    FROM tickets t
    INNER JOIN users requester ON requester.id = t.requester_id
    LEFT JOIN users assignee ON assignee.id = t.assigned_to
    LEFT JOIN users assigner ON assigner.id = t.assigned_by
    INNER JOIN services s ON s.id = t.service_id
    INNER JOIN service_categories c ON c.id = s.category_id
    INNER JOIN priorities p ON p.id = t.priority_id
    INNER JOIN ticket_statuses st ON st.id = t.status_id
    LEFT JOIN ticket_feedback f ON f.ticket_id = t.id AND f.user_id = t.requester_id
`;

const roomMatchesDepartmentCode = (roomExpression) => `
    assigned_department.code REGEXP '[0-9]'
    AND LOCATE(
        REPLACE(REPLACE(UPPER(TRIM(assigned_department.code)), ' ', ''), '-', ''),
        REPLACE(REPLACE(UPPER(TRIM(${roomExpression})), ' ', ''), '-', '')
    ) > 0
`;

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const appendFilters = (filters = {}) => {
    const conditions = [];
    const params = [];

    if (filters.requesterId) {
        conditions.push('t.requester_id = ?');
        params.push(filters.requesterId);
    }

    if (filters.assignedTo) {
        conditions.push(`(
            t.assigned_to = ?
            OR EXISTS (
                SELECT 1
                FROM ticket_assignees ta_filter
                WHERE ta_filter.ticket_id = t.id
                  AND ta_filter.user_id = ?
            )
        )`);
        params.push(filters.assignedTo, filters.assignedTo);
    }

    if (filters.managerUserId) {
        conditions.push(`EXISTS (
            SELECT 1
            FROM user_departments ud
            INNER JOIN departments assigned_department ON assigned_department.id = ud.department_id
            WHERE ud.user_id = ?
              AND assigned_department.is_active = 1
              AND ${roomMatchesDepartmentCode('t.room')}
        )`);
        params.push(filters.managerUserId);
    }

    if (filters.statusId) {
        conditions.push('t.status_id = ?');
        params.push(filters.statusId);
    }

    if (filters.priorityId) {
        conditions.push('t.priority_id = ?');
        params.push(filters.priorityId);
    }

    if (filters.serviceId) {
        conditions.push('t.service_id = ?');
        params.push(filters.serviceId);
    }

    if (filters.fromDate) {
        conditions.push('DATE(t.created_at) >= ?');
        params.push(filters.fromDate);
    }

    if (filters.toDate) {
        conditions.push('DATE(t.created_at) <= ?');
        params.push(filters.toDate);
    }

    if (filters.keyword) {
        conditions.push('(t.code LIKE ? OR t.title LIKE ? OR t.description LIKE ? OR t.room LIKE ?)');
        const keyword = `%${filters.keyword}%`;
        params.push(keyword, keyword, keyword, keyword);
    }

    if (filters.unassigned) {
        conditions.push(`t.assigned_to IS NULL AND NOT EXISTS (
            SELECT 1
            FROM ticket_assignees ta_filter
            WHERE ta_filter.ticket_id = t.id
        )`);
    }

    if (filters.overdue) {
        conditions.push('st.is_closed = 0 AND t.due_resolve_at IS NOT NULL AND t.due_resolve_at < NOW()');
    }

    return {
        whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
        params
    };
};

const listTickets = async (filters = {}) => {
    const { whereClause, params } = appendFilters(filters);
    return db.query(`${ticketSelect} ${whereClause} ORDER BY t.created_at DESC`, params);
};

const findById = async (id) => {
    const rows = await db.query(`${ticketSelect} WHERE t.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
};

const findByCode = async (code) => {
    const rows = await db.query(`${ticketSelect} WHERE t.code = ? LIMIT 1`, [code]);
    return rows[0] || null;
};

const createTicket = async (data) => {
    const result = await db.query(`
        INSERT INTO tickets (
            code,
            title,
            description,
            room,
            requester_id,
            service_id,
            priority_id,
            status_id,
            due_response_at,
            due_resolve_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        data.code,
        data.title,
        data.description,
        data.room,
        data.requester_id,
        data.service_id,
        data.priority_id,
        data.status_id,
        data.due_response_at,
        data.due_resolve_at
    ]);

    return result.insertId;
};

const updateTicket = async (id, data) => {
    const payload = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
    );
    const columns = Object.keys(payload);

    if (columns.length === 0) {
        return { affectedRows: 0 };
    }

    const setClause = columns.map((column) => `${column} = ?`).join(', ');
    return db.query(`UPDATE tickets SET ${setClause} WHERE id = ?`, [...Object.values(payload), id]);
};

const updateRequesterTicket = async (id, data) => updateTicket(id, {
    title: data.title,
    description: data.description,
    room: data.room,
    service_id: data.service_id,
    priority_id: data.priority_id,
    due_response_at: data.due_response_at,
    due_resolve_at: data.due_resolve_at
});

const replaceTicketAssignees = async (ticketId, supportIds, assignedBy, ticketData = {}) => db.transaction(async (connection) => {
    const payload = Object.fromEntries(
        Object.entries(ticketData).filter(([, value]) => value !== undefined)
    );
    const columns = Object.keys(payload);

    if (columns.length > 0) {
        const setClause = columns.map((column) => `${column} = ?`).join(', ');
        await connection.execute(
            `UPDATE tickets SET ${setClause} WHERE id = ?`,
            [...Object.values(payload), ticketId]
        );
    }

    await connection.execute('DELETE FROM ticket_assignees WHERE ticket_id = ?', [ticketId]);

    for (const supportId of supportIds) {
        await connection.execute(
            'INSERT INTO ticket_assignees (ticket_id, user_id, assigned_by) VALUES (?, ?, ?)',
            [ticketId, supportId, assignedBy]
        );
    }
});

const getTicketAssignees = (ticketId) => db.query(`
    SELECT
        ta.*,
        u.full_name,
        u.email
    FROM ticket_assignees ta
    INNER JOIN users u ON u.id = ta.user_id
    WHERE ta.ticket_id = ?
    ORDER BY ta.created_at, u.full_name
`, [ticketId]);

const updateTicketAssigneeStatus = async (ticketId, userId, statusCode, data = {}) => {
    const payload = Object.fromEntries(
        Object.entries({
            status_code: statusCode,
            accepted_at: data.accepted_at,
            resolved_at: data.resolved_at,
            resolution: data.resolution
        }).filter(([, value]) => value !== undefined)
    );
    const columns = Object.keys(payload);
    const setClause = columns.map((column) => `${column} = ?`).join(', ');

    return db.query(
        `UPDATE ticket_assignees SET ${setClause} WHERE ticket_id = ? AND user_id = ?`,
        [...Object.values(payload), ticketId, userId]
    );
};

const updateAllTicketAssigneeStatuses = async (ticketId, statusCode, data = {}) => {
    const payload = Object.fromEntries(
        Object.entries({
            status_code: statusCode,
            accepted_at: data.accepted_at,
            resolved_at: data.resolved_at,
            resolution: data.resolution
        }).filter(([, value]) => value !== undefined)
    );
    const columns = Object.keys(payload);
    const setClause = columns.map((column) => `${column} = ?`).join(', ');

    if (columns.length === 0) {
        return { affectedRows: 0 };
    }

    return db.query(
        `UPDATE ticket_assignees SET ${setClause} WHERE ticket_id = ?`,
        [...Object.values(payload), ticketId]
    );
};

const getDefaultStatus = async () => {
    const rows = await db.query('SELECT * FROM ticket_statuses WHERE is_default = 1 LIMIT 1');
    return rows[0] || null;
};

const getStatusByCode = async (code) => {
    const rows = await db.query('SELECT * FROM ticket_statuses WHERE code = ? LIMIT 1', [String(code).toUpperCase()]);
    return rows[0] || null;
};

const getStatusById = async (id) => {
    const rows = await db.query('SELECT * FROM ticket_statuses WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
};

const getPriorityByCode = async (code) => {
    const rows = await db.query('SELECT * FROM priorities WHERE code = ? LIMIT 1', [String(code).toUpperCase()]);
    return rows[0] || null;
};

const getPriorityById = async (id) => {
    const rows = await db.query('SELECT * FROM priorities WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
};

const getDefaultPriority = async () => {
    const rows = await db.query('SELECT * FROM priorities WHERE code = ? LIMIT 1', ['P3']);
    return rows[0] || null;
};

const getServiceById = async (id) => {
    const rows = await db.query('SELECT * FROM services WHERE id = ? AND is_active = 1 LIMIT 1', [id]);
    return rows[0] || null;
};

const getActiveDepartmentById = async (id) => {
    const rows = await db.query('SELECT * FROM departments WHERE id = ? AND is_active = 1 LIMIT 1', [id]);
    return rows[0] || null;
};

const getActiveDepartmentByRoom = async (room) => {
    if (!room) {
        return null;
    }

    const rows = await db.query(`
        SELECT *
        FROM departments
        WHERE is_active = 1
        ORDER BY LENGTH(code) DESC
    `);
    const normalizedRoom = String(room).trim().toUpperCase();

    return rows.find((department) => {
        const code = String(department.code || '').trim().toUpperCase();
        if (!code) {
            return false;
        }
        const match = normalizedRoom.match(new RegExp(`^${escapeRegExp(code)}[\\s./-]+(.+)$`));
        return Boolean(match && /\d/.test(match[1]));
    }) || null;
};

const getSlaPolicy = async (serviceId, priorityId) => {
    const rows = await db.query(`
        SELECT *
        FROM sla_policies
        WHERE is_active = 1
          AND priority_id = ?
          AND (service_id = ? OR service_id IS NULL)
        ORDER BY service_id IS NULL ASC
        LIMIT 1
    `, [priorityId, serviceId]);
    return rows[0] || null;
};

const userHasRoomAccess = async (userId, room) => {
    if (!room) {
        return false;
    }

    const rows = await db.query(`
        SELECT 1
        FROM user_departments ud
        INNER JOIN departments assigned_department ON assigned_department.id = ud.department_id
        WHERE ud.user_id = ?
          AND assigned_department.is_active = 1
          AND ${roomMatchesDepartmentCode('?')}
        LIMIT 1
    `, [userId, room]);

    return rows.length > 0;
};

const addComment = async (data) => {
    const result = await db.query(`
        INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal)
        VALUES (?, ?, ?, ?)
    `, [data.ticket_id, data.user_id, data.content, data.is_internal ? 1 : 0]);
    return result.insertId;
};

const getComments = (ticketId) => db.query(`
    SELECT
        c.*,
        u.full_name AS user_name,
        r.code AS role_code
    FROM ticket_comments c
    INNER JOIN users u ON u.id = c.user_id
    INNER JOIN roles r ON r.id = u.role_id
    WHERE c.ticket_id = ?
    ORDER BY c.created_at ASC
`, [ticketId]);

const addAttachment = async (data) => {
    const result = await db.query(`
        INSERT INTO ticket_attachments (
            ticket_id,
            uploaded_by,
            original_name,
            file_name,
            file_path,
            mime_type,
            size
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
        data.ticket_id,
        data.uploaded_by,
        data.original_name,
        data.file_name,
        data.file_path,
        data.mime_type,
        data.size
    ]);
    return result.insertId;
};

const getAttachments = (ticketId) => db.query(`
    SELECT
        a.*,
        u.full_name AS uploaded_by_name
    FROM ticket_attachments a
    INNER JOIN users u ON u.id = a.uploaded_by
    WHERE a.ticket_id = ?
    ORDER BY a.created_at DESC
`, [ticketId]);

const addFeedback = async (data) => {
    const result = await db.query(`
        INSERT INTO ticket_feedback (ticket_id, user_id, rating, comment)
        VALUES (?, ?, ?, ?)
    `, [data.ticket_id, data.user_id, data.rating, data.comment || null]);
    return result.insertId;
};

const getFeedbackByTicketAndUser = async (ticketId, userId) => {
    const rows = await db.query('SELECT * FROM ticket_feedback WHERE ticket_id = ? AND user_id = ? LIMIT 1', [ticketId, userId]);
    return rows[0] || null;
};

const addHistory = async (data) => {
    const result = await db.query(`
        INSERT INTO ticket_history (ticket_id, user_id, action, from_value, to_value, note)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [
        data.ticket_id,
        data.user_id || null,
        data.action,
        data.from_value || null,
        data.to_value || null,
        data.note || null
    ]);
    return result.insertId;
};

const getTicketHistory = (ticketId) => db.query(`
    SELECT
        h.*,
        u.full_name AS user_name
    FROM ticket_history h
    LEFT JOIN users u ON u.id = h.user_id
    WHERE h.ticket_id = ?
    ORDER BY h.created_at DESC
`, [ticketId]);

const addAssignmentHistory = async (data) => {
    const result = await db.query(`
        INSERT INTO ticket_assignment_history (
            ticket_id,
            from_support_id,
            to_support_id,
            assigned_by,
            note
        ) VALUES (?, ?, ?, ?, ?)
    `, [
        data.ticket_id,
        data.from_support_id || null,
        data.to_support_id || null,
        data.assigned_by,
        data.note || null
    ]);
    return result.insertId;
};

const getAssignmentHistory = (ticketId) => db.query(`
    SELECT
        h.*,
        from_user.full_name AS from_support_name,
        to_user.full_name AS to_support_name,
        assigner.full_name AS assigned_by_name
    FROM ticket_assignment_history h
    LEFT JOIN users from_user ON from_user.id = h.from_support_id
    LEFT JOIN users to_user ON to_user.id = h.to_support_id
    INNER JOIN users assigner ON assigner.id = h.assigned_by
    WHERE h.ticket_id = ?
    ORDER BY h.created_at DESC
`, [ticketId]);

module.exports = {
    listTickets,
    findById,
    findByCode,
    createTicket,
    updateTicket,
    updateRequesterTicket,
    replaceTicketAssignees,
    getTicketAssignees,
    updateTicketAssigneeStatus,
    updateAllTicketAssigneeStatuses,
    getDefaultStatus,
    getStatusByCode,
    getStatusById,
    getPriorityByCode,
    getPriorityById,
    getDefaultPriority,
    getServiceById,
    getActiveDepartmentById,
    getActiveDepartmentByRoom,
    getSlaPolicy,
    userHasRoomAccess,
    addComment,
    getComments,
    addAttachment,
    getAttachments,
    addFeedback,
    getFeedbackByTicketAndUser,
    addHistory,
    getTicketHistory,
    addAssignmentHistory,
    getAssignmentHistory
};
