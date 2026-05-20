const db = require('../config/db');

const getNotifications = (userId) => db.query(`
    SELECT *
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
`, [userId]);

const markAsRead = (id, userId) => db.query(`
    UPDATE notifications
    SET is_read = 1, read_at = NOW()
    WHERE id = ? AND user_id = ?
`, [id, userId]);

const readAll = (userId) => db.query(`
    UPDATE notifications
    SET is_read = 1, read_at = NOW()
    WHERE user_id = ? AND is_read = 0
`, [userId]);

const createNotification = async (data) => {
    const result = await db.query(`
        INSERT INTO notifications (user_id, title, message, type, related_ticket_id)
        VALUES (?, ?, ?, ?, ?)
    `, [
        data.user_id,
        data.title,
        data.message,
        data.type || 'INFO',
        data.related_ticket_id || null
    ]);
    return result.insertId;
};

module.exports = {
    getNotifications,
    markAsRead,
    readAll,
    createNotification
};
