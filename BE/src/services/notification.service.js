const notificationRepository = require('../repositories/notification.repository');

const getNotifications = (userId) => notificationRepository.getNotifications(userId);

const markAsRead = (id, userId) => notificationRepository.markAsRead(id, userId);

const readAll = (userId) => notificationRepository.readAll(userId);

module.exports = {
    getNotifications,
    markAsRead,
    readAll
};
