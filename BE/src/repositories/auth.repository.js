const db = require('../config/db');

let avatarColumnExistsCache;

const hasAvatarColumn = async () => {
    if (avatarColumnExistsCache !== undefined) {
        return avatarColumnExistsCache;
    }

    const rows = await db.query(`
        SELECT COUNT(*) AS count
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'users'
          AND column_name = 'avatar_url'
    `);

    avatarColumnExistsCache = Number(rows[0]?.count || 0) > 0;
    return avatarColumnExistsCache;
};

const userSelect = (hasAvatarUrl) => `
    SELECT
        u.id,
        u.full_name,
        u.email,
        u.password_hash,
        u.phone,
        ${hasAvatarUrl ? 'u.avatar_url' : 'NULL AS avatar_url'},
        u.status,
        u.department_id,
        d.name AS department_name,
        u.role_id,
        r.code AS role_code,
        r.name AS role_name,
        u.last_login_at,
        u.created_at,
        u.updated_at
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    LEFT JOIN departments d ON d.id = u.department_id
`;

const findUserByEmail = async (email) => {
    const rows = await db.query(`${userSelect(await hasAvatarColumn())} WHERE LOWER(u.email) = LOWER(?) LIMIT 1`, [email]);
    return rows[0] || null;
};

const findUserById = async (id) => {
    const rows = await db.query(`${userSelect(await hasAvatarColumn())} WHERE u.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
};

const updatePassword = async (id, passwordHash) => {
    return db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
};

const findEmailOwner = async (email) => {
    const rows = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
    return rows[0] || null;
};

const updateProfile = async (id, data) => {
    const payload = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
    );

    if (payload.avatar_url !== undefined && !(await hasAvatarColumn())) {
        const error = new Error('Database is missing users.avatar_url. Import BE/src/database/migrations/002_add_user_avatar_url.sql first.');
        error.statusCode = 400;
        throw error;
    }

    const columns = Object.keys(payload);

    if (columns.length === 0) {
        return { affectedRows: 0 };
    }

    const setClause = columns.map((column) => `${column} = ?`).join(', ');
    return db.query(`UPDATE users SET ${setClause} WHERE id = ?`, [...Object.values(payload), id]);
};

const updateLastLogin = async (id) => {
    return db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);
};

module.exports = {
    findUserByEmail,
    findUserById,
    findEmailOwner,
    hasAvatarColumn,
    updateProfile,
    updatePassword,
    updateLastLogin
};
