function SystemReports() {
    const { user } = useAuth();
    const [range, setRange] = React.useState(() => reportRangeForPreset("30D"));
    const [activeTab, setActiveTab] = React.useState("overview");
    const reportQuery = React.useMemo(() => reportQueryString(range), [range]);
    const { data: tickets } = useApi(`/tickets${reportQuery}`, []);
    const { data: ticketReport } = useApi(`/reports/tickets${reportQuery}`, { summary: {}, daily: [] });
    const { data: slaReport } = useApi(`/reports/sla${reportQuery}`, {});
    const { data: feedbackReport } = useApi(`/reports/feedback${reportQuery}`, []);
    const { data: supportReport } = useApi(`/reports/support-performance${reportQuery}`, []);
    const supportPagination = usePagination(supportReport, 10);
    const summary = normalizeReportSummary(ticketReport.summary, tickets);
    const sla = normalizeSlaSummary(slaReport);
    const riskTickets = tickets.filter((ticket) => isOverdue(ticket) || isLateResolved(ticket));

    return (
        <>
            <PageHeader
                title="Báo cáo thống kê hệ thống"
                subtitle={user.role_code === "MANAGER" ? "Dữ liệu giới hạn theo khu/tòa bạn phụ trách." : "Dữ liệu toàn hệ thống cho quản trị."}
            />
            <ReportPeriodFilter range={range} onChange={setRange} />
            <ReportStats items={[
                { label: "Tổng yêu cầu", value: summary.total, icon: "confirmation_number" },
                { label: "Đang mở", value: summary.open, helper: `${summary.overdue} quá hạn`, icon: "pending_actions" },
                { label: "Đã đóng", value: summary.closed, helper: `${summary.cancelled} đã hủy`, icon: "task_alt" },
                { label: "SLA đúng hạn", value: formatPercent(sla.onTimePercent), helper: `${sla.onTime}/${sla.resolved} đã xử lý`, icon: "timer" },
                { label: "TB xử lý", value: formatMinutes(summary.avgResolutionMinutes), icon: "schedule" },
                { label: "Đánh giá TB", value: summary.avgRating || "-", helper: `${summary.feedbackCount} phản hồi`, icon: "star" }
            ]} />
            <ReportTabs
                active={activeTab}
                onChange={setActiveTab}
                tabs={[
                    { value: "overview", label: "Tổng quan", icon: "insights" },
                    { value: "sla", label: "SLA", icon: "timer" },
                    { value: "support", label: "Nhân viên IT", icon: "support_agent" },
                    { value: "services", label: "Dịch vụ", icon: "category" },
                    { value: "feedback", label: "Phản hồi", icon: "reviews" }
                ]}
            />
            {activeTab === "overview" && (
                <div className="grid cols-2">
                    <Section title="Xu hướng yêu cầu theo ngày">
                        <ReportBarList items={dailyRowsFromApi(ticketReport.daily, tickets)} emptyText="Chưa có yêu cầu trong kỳ" pageSize={10} label="ngày" />
                    </Section>
                    <Section title="Yêu cầu theo trạng thái">
                        <ReportBarList items={statusReportRows(tickets)} />
                    </Section>
                </div>
            )}
            {activeTab === "sla" && (
                <div className="grid cols-2">
                    <Section title="Kết quả SLA">
                        <ReportBarList items={[
                            { key: "on-time", label: "Đúng hạn", value: sla.onTime },
                            { key: "late", label: "Trễ hạn", value: sla.late }
                        ]} emptyText="Chưa có yêu cầu đã xử lý có SLA" />
                    </Section>
                    <Section title="Yêu cầu vi phạm hoặc có nguy cơ">
                        <TicketTable tickets={riskTickets} pageSize={5} />
                    </Section>
                </div>
            )}
            {activeTab === "support" && (
                <Section title="Hiệu suất nhân viên IT">
                    <ReportTable
                        rows={supportPagination.items}
                        getKey={(row) => row.support_id}
                        columns={[
                            { key: "support_name", label: "Nhân viên" },
                            { key: "assigned_tickets", label: "Được giao", render: (row) => row.assigned_tickets || 0 },
                            { key: "closed_tickets", label: "Đã đóng", render: (row) => row.closed_tickets || 0 },
                            { key: "open_tickets", label: "Đang mở", render: (row) => row.open_tickets || 0 },
                            { key: "overdue_tickets", label: "Quá hạn", render: (row) => row.overdue_tickets || 0 },
                            { key: "avg_response_minutes", label: "TB phản hồi", render: (row) => formatMinutes(row.avg_response_minutes) },
                            { key: "avg_resolution_minutes", label: "TB xử lý", render: (row) => formatMinutes(row.avg_resolution_minutes) },
                            { key: "avg_rating", label: "Đánh giá", render: (row) => row.avg_rating || "-" }
                        ]}
                    />
                    <Pagination {...supportPagination} label="nhân viên" />
                </Section>
            )}
            {activeTab === "services" && (
                <div className="grid cols-2">
                    <Section title="Dịch vụ phát sinh nhiều">
                        <ReportBarList items={serviceReportRows(tickets)} emptyText="Chưa có dữ liệu dịch vụ" pageSize={8} label="dịch vụ" />
                    </Section>
                    <Section title="Mức ưu tiên">
                        <ReportBarList items={priorityReportRows(tickets)} emptyText="Chưa có dữ liệu ưu tiên" />
                    </Section>
                </div>
            )}
            {activeTab === "feedback" && (
                <div className="grid cols-2">
                    <Section title="Phân bố đánh giá">
                        <ReportBarList items={feedbackRowsFromApi(feedbackReport, tickets)} emptyText="Chưa có phản hồi trong kỳ" />
                    </Section>
                    <Section title="Yêu cầu đánh giá thấp">
                        <LowFeedbackRequests tickets={tickets} />
                    </Section>
                </div>
            )}
        </>
    );
}
