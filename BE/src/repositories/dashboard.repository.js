const db = require('../config/db');

const getOverview = async () => {
    const rows = await db.query(`
        SELECT
            COUNT(*) AS total_tickets,
            SUM(CASE WHEN st.code = 'NEW' THEN 1 ELSE 0 END) AS new_tickets,
            SUM(CASE WHEN st.code = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress_tickets,
            SUM(CASE WHEN st.is_closed = 1 THEN 1 ELSE 0 END) AS closed_tickets,
            SUM(CASE WHEN st.is_closed = 0 AND t.due_resolve_at IS NOT NULL AND t.due_resolve_at < NOW() THEN 1 ELSE 0 END) AS overdue_tickets,
            ROUND(AVG(CASE WHEN t.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, t.created_at, t.resolved_at) END), 2) AS avg_resolution_minutes
        FROM tickets t
        INNER JOIN ticket_statuses st ON st.id = t.status_id
    `);

    const feedbackRows = await db.query('SELECT ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) AS feedback_count FROM ticket_feedback');

    return {
        ...rows[0],
        ...feedbackRows[0]
    };
};

const getSlaStatistics = () => db.query(`
    SELECT
        COUNT(*) AS resolved_tickets,
        SUM(CASE WHEN t.resolved_at <= t.due_resolve_at THEN 1 ELSE 0 END) AS resolved_on_time,
        SUM(CASE WHEN t.resolved_at > t.due_resolve_at THEN 1 ELSE 0 END) AS resolved_late,
        ROUND(
            100 * SUM(CASE WHEN t.resolved_at <= t.due_resolve_at THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
            2
        ) AS on_time_percent
    FROM tickets t
    WHERE t.resolved_at IS NOT NULL AND t.due_resolve_at IS NOT NULL
`);

const getSupportPerformance = () => db.query(`
    SELECT
        u.id AS support_id,
        u.full_name AS support_name,
        COUNT(t.id) AS assigned_tickets,
        SUM(CASE WHEN st.is_closed = 1 THEN 1 ELSE 0 END) AS closed_tickets,
        ROUND(AVG(CASE WHEN t.first_response_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, t.created_at, t.first_response_at) END), 2) AS avg_response_minutes,
        ROUND(AVG(CASE WHEN t.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, t.created_at, t.resolved_at) END), 2) AS avg_resolution_minutes,
        ROUND(AVG(f.rating), 2) AS avg_rating
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id AND r.code = 'SUPPORT'
    LEFT JOIN ticket_assignees ta ON ta.user_id = u.id
    LEFT JOIN tickets t ON t.id = ta.ticket_id
    LEFT JOIN ticket_statuses st ON st.id = t.status_id
    LEFT JOIN ticket_feedback f ON f.ticket_id = t.id
    GROUP BY u.id, u.full_name
    ORDER BY closed_tickets DESC, assigned_tickets DESC
`);

const getTicketsByStatus = () => db.query(`
    SELECT st.code, st.name, st.color, COUNT(t.id) AS total
    FROM ticket_statuses st
    LEFT JOIN tickets t ON t.status_id = st.id
    GROUP BY st.id, st.code, st.name, st.color, st.sort_order
    ORDER BY st.sort_order
`);

const getTicketsByPriority = () => db.query(`
    SELECT p.code, p.name, p.color, p.level, COUNT(t.id) AS total
    FROM priorities p
    LEFT JOIN tickets t ON t.priority_id = p.id
    GROUP BY p.id, p.code, p.name, p.color, p.level
    ORDER BY p.level
`);

const getTicketsByService = () => db.query(`
    SELECT s.code, s.name, COUNT(t.id) AS total
    FROM services s
    LEFT JOIN tickets t ON t.service_id = s.id
    GROUP BY s.id, s.code, s.name
    ORDER BY total DESC, s.name
`);

module.exports = {
    getOverview,
    getSlaStatistics,
    getSupportPerformance,
    getTicketsByStatus,
    getTicketsByPriority,
    getTicketsByService
};
