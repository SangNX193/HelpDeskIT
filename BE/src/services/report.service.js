const reportRepository = require('../repositories/report.repository');

const roleOf = (user = {}) => String(user.role_code || user.role || '').toUpperCase();

const normalizeFilters = (query = {}, user = {}) => ({
    fromDate: query.fromDate || query.from_date,
    toDate: query.toDate || query.to_date,
    statusId: query.statusId || query.status_id,
    priorityId: query.priorityId || query.priority_id,
    serviceId: query.serviceId || query.service_id,
    supportId: query.supportId || query.support_id,
    managerUserId: roleOf(user) === 'MANAGER' ? user.id : undefined
});

const getTicketReport = (query, user) => reportRepository.getTicketReport(normalizeFilters(query, user));
const getSlaReport = (query, user) => reportRepository.getSlaReport(normalizeFilters(query, user));
const getFeedbackReport = (query, user) => reportRepository.getFeedbackReport(normalizeFilters(query, user));
const getSupportPerformanceReport = (query, user) => reportRepository.getSupportPerformanceReport(normalizeFilters(query, user));

module.exports = {
    getTicketReport,
    getSlaReport,
    getFeedbackReport,
    getSupportPerformanceReport
};
