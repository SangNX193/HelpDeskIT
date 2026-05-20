const db = require('../config/db');

const roomMatchesDepartmentCode = (roomExpression) => `
    assigned_department.code REGEXP '[0-9]'
    AND LOCATE(
        REPLACE(REPLACE(UPPER(TRIM(assigned_department.code)), ' ', ''), '-', ''),
        REPLACE(REPLACE(UPPER(TRIM(${roomExpression})), ' ', ''), '-', '')
    ) > 0
`;

const managerRoomCondition = (ticketAlias) => `EXISTS (
    SELECT 1
    FROM user_departments ud
    INNER JOIN departments assigned_department ON assigned_department.id = ud.department_id
    WHERE ud.user_id = ?
      AND assigned_department.is_active = 1
      AND ${roomMatchesDepartmentCode(`${ticketAlias}.room`)}
)`;

const buildTicketConditions = (filters = {}, ticketAlias = 't', dateAlias = ticketAlias) => {
    const conditions = [];
    const params = [];

    if (filters.fromDate) {
        conditions.push(`DATE(${dateAlias}.created_at) >= ?`);
        params.push(filters.fromDate);
    }

    if (filters.toDate) {
        conditions.push(`DATE(${dateAlias}.created_at) <= ?`);
        params.push(filters.toDate);
    }

    if (filters.statusId) {
        conditions.push(`${ticketAlias}.status_id = ?`);
        params.push(filters.statusId);
    }

    if (filters.priorityId) {
        conditions.push(`${ticketAlias}.priority_id = ?`);
        params.push(filters.priorityId);
    }

    if (filters.serviceId) {
        conditions.push(`${ticketAlias}.service_id = ?`);
        params.push(filters.serviceId);
    }

    if (filters.supportId) {
        conditions.push(`${ticketAlias}.assigned_to = ?`);
        params.push(filters.supportId);
    }

    if (filters.managerUserId) {
        conditions.push(managerRoomCondition(ticketAlias));
        params.push(filters.managerUserId);
    }

    return { conditions, params };
};

const buildTicketWhere = (filters = {}, ticketAlias = 't', dateAlias = ticketAlias) => {
    const { conditions, params } = buildTicketConditions(filters, ticketAlias, dateAlias);

    return {
        whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
        params
    };
};

const buildTicketJoin = (filters = {}, ticketAlias = 't') => {
    const joinFilters = {
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        statusId: filters.statusId,
        priorityId: filters.priorityId,
        serviceId: filters.serviceId,
        managerUserId: filters.managerUserId
    };
    const { conditions, params } = buildTicketConditions(joinFilters, ticketAlias);

    return {
        joinClause: conditions.length ? `AND ${conditions.join(' AND ')}` : '',
        params
    };
};

const getTicketReport = async (filters = {}) => {
    const { whereClause, params } = buildTicketWhere(filters);

    const summaryRows = await db.query(`
        SELECT
            COUNT(*) AS total_tickets,
            SUM(CASE WHEN st.is_closed = 1 THEN 1 ELSE 0 END) AS closed_tickets,
            SUM(CASE WHEN st.is_closed = 0 THEN 1 ELSE 0 END) AS open_tickets,
            SUM(CASE WHEN st.code = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_tickets,
            SUM(CASE WHEN st.is_closed = 0 AND t.due_resolve_at IS NOT NULL AND t.due_resolve_at < NOW() THEN 1 ELSE 0 END) AS overdue_tickets,
            ROUND(AVG(CASE WHEN t.first_response_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, t.created_at, t.first_response_at) END), 2) AS avg_response_minutes,
            ROUND(AVG(CASE WHEN t.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, t.created_at, t.resolved_at) END), 2) AS avg_resolution_minutes,
            ROUND(AVG(f.rating), 2) AS avg_rating,
            COUNT(f.id) AS feedback_count
        FROM tickets t
        INNER JOIN ticket_statuses st ON st.id = t.status_id
        LEFT JOIN ticket_feedback f ON f.ticket_id = t.id
        ${whereClause}
    `, params);

    const dailyRows = await db.query(`
        SELECT DATE(t.created_at) AS date, COUNT(*) AS total
        FROM tickets t
        ${whereClause}
        GROUP BY DATE(t.created_at)
        ORDER BY date
    `, params);

    return {
        summary: summaryRows[0],
        daily: dailyRows
    };
};

const getSlaReport = async (filters = {}) => {
    const { whereClause, params } = buildTicketWhere(filters);
    const prefix = whereClause ? `${whereClause} AND` : 'WHERE';

    const rows = await db.query(`
        SELECT
            COUNT(*) AS resolved_tickets,
            SUM(CASE WHEN t.resolved_at <= t.due_resolve_at THEN 1 ELSE 0 END) AS resolved_on_time,
            SUM(CASE WHEN t.resolved_at > t.due_resolve_at THEN 1 ELSE 0 END) AS resolved_late,
            ROUND(
                100 * SUM(CASE WHEN t.resolved_at <= t.due_resolve_at THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
                2
            ) AS on_time_percent
        FROM tickets t
        ${prefix} t.resolved_at IS NOT NULL AND t.due_resolve_at IS NOT NULL
    `, params);

    return rows[0];
};

const getFeedbackReport = (filters = {}) => {
    const { whereClause, params } = buildTicketWhere(filters, 't', 'f');
    return db.query(`
        SELECT
            f.rating,
            COUNT(*) AS total
        FROM ticket_feedback f
        INNER JOIN tickets t ON t.id = f.ticket_id
        ${whereClause}
        GROUP BY f.rating
        ORDER BY f.rating
    `, params);
};

const getSupportPerformanceReport = (filters = {}) => {
    const { joinClause, params: joinParams } = buildTicketJoin(filters);
    const userConditions = [];
    const userParams = [];

    if (filters.supportId) {
        userConditions.push('u.id = ?');
        userParams.push(filters.supportId);
    }

    return db.query(`
        SELECT
            u.id AS support_id,
            u.full_name AS support_name,
            COUNT(t.id) AS assigned_tickets,
            SUM(CASE WHEN st.is_closed = 1 THEN 1 ELSE 0 END) AS closed_tickets,
            SUM(CASE WHEN st.is_closed = 0 THEN 1 ELSE 0 END) AS open_tickets,
            SUM(CASE WHEN st.is_closed = 0 AND t.due_resolve_at IS NOT NULL AND t.due_resolve_at < NOW() THEN 1 ELSE 0 END) AS overdue_tickets,
            ROUND(AVG(CASE WHEN t.first_response_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, t.created_at, t.first_response_at) END), 2) AS avg_response_minutes,
            ROUND(AVG(CASE WHEN t.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, t.created_at, t.resolved_at) END), 2) AS avg_resolution_minutes,
            ROUND(AVG(f.rating), 2) AS avg_rating
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id AND r.code = 'SUPPORT'
        LEFT JOIN tickets t ON t.assigned_to = u.id ${joinClause}
        LEFT JOIN ticket_statuses st ON st.id = t.status_id
        LEFT JOIN ticket_feedback f ON f.ticket_id = t.id
        ${userConditions.length ? `WHERE ${userConditions.join(' AND ')}` : ''}
        GROUP BY u.id, u.full_name
        ORDER BY closed_tickets DESC, assigned_tickets DESC
    `, [...joinParams, ...userParams]);
};

module.exports = {
    getTicketReport,
    getSlaReport,
    getFeedbackReport,
    getSupportPerformanceReport
};
