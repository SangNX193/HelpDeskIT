const { error } = require('../utils/response');

const loginAttempts = new Map();
const aiSuggestionAttempts = new Map();

const normalizeNumber = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
};

const loginRateLimit = (req, res, next) => {
    const windowMs = normalizeNumber(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
    const maxAttempts = normalizeNumber(process.env.LOGIN_RATE_LIMIT_MAX, 20);
    const now = Date.now();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const key = `${req.ip || req.socket.remoteAddress || 'unknown'}:${email || 'no-email'}`;
    const current = loginAttempts.get(key);

    if (!current || current.resetAt <= now) {
        loginAttempts.set(key, { count: 1, resetAt: now + windowMs });
        return next();
    }

    if (current.count >= maxAttempts) {
        res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
        return error(res, 'Too many login attempts. Please try again later.', 429);
    }

    current.count += 1;
    loginAttempts.set(key, current);

    if (loginAttempts.size > 1000) {
        for (const [attemptKey, attempt] of loginAttempts.entries()) {
            if (attempt.resetAt <= now) {
                loginAttempts.delete(attemptKey);
            }
        }
    }

    return next();
};

const aiSuggestionRateLimit = (req, res, next) => {
    const windowMs = normalizeNumber(process.env.AI_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000);
    const maxAttempts = normalizeNumber(process.env.AI_RATE_LIMIT_MAX, 20);
    const now = Date.now();
    const userKey = req.user?.id ? `user:${req.user.id}` : `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    const current = aiSuggestionAttempts.get(userKey);

    if (!current || current.resetAt <= now) {
        aiSuggestionAttempts.set(userKey, { count: 1, resetAt: now + windowMs });
        return next();
    }

    if (current.count >= maxAttempts) {
        res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
        return error(res, 'Bạn đã tạo quá nhiều gợi ý AI, vui lòng thử lại sau.', 429);
    }

    current.count += 1;
    aiSuggestionAttempts.set(userKey, current);

    if (aiSuggestionAttempts.size > 1000) {
        for (const [attemptKey, attempt] of aiSuggestionAttempts.entries()) {
            if (attempt.resetAt <= now) {
                aiSuggestionAttempts.delete(attemptKey);
            }
        }
    }

    return next();
};

module.exports = {
    loginRateLimit,
    aiSuggestionRateLimit
};
