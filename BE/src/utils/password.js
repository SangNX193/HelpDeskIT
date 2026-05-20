const bcrypt = require('bcryptjs');

const SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS) || 10;

const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

const comparePassword = (password, passwordHash) => bcrypt.compare(password, passwordHash);

module.exports = {
    hashPassword,
    comparePassword
};
