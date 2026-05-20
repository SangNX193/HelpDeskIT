const jwt = require('jsonwebtoken');

const getSecret = () => {
    if (process.env.JWT_SECRET) {
        return process.env.JWT_SECRET;
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET is required in production');
    }

    return 'dev_helpdesk_secret_change_me';
};
const getExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';

const signToken = (payload) => jwt.sign(payload, getSecret(), {
    expiresIn: getExpiresIn()
});

const verifyToken = (token) => jwt.verify(token, getSecret());

module.exports = {
    signToken,
    verifyToken
};
