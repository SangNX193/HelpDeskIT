const dashboardRepository = require('../repositories/dashboard.repository');

module.exports = {
    getOverview: dashboardRepository.getOverview,
    getSlaStatistics: dashboardRepository.getSlaStatistics,
    getSupportPerformance: dashboardRepository.getSupportPerformance,
    getTicketsByStatus: dashboardRepository.getTicketsByStatus,
    getTicketsByPriority: dashboardRepository.getTicketsByPriority,
    getTicketsByService: dashboardRepository.getTicketsByService
};
