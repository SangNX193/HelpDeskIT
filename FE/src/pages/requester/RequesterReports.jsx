function RequesterReports() {
    const { data: tickets } = useApi("/tickets/my", []);
    const [range, setRange] = React.useState(() => reportRangeForPreset("30D"));
    const [activeTab, setActiveTab] = React.useState("overview");
    const reportTickets = React.useMemo(() => filterTicketsByRange(tickets, range), [tickets, range]);
    const summary = ticketReportSummary(reportTickets);
    const sla = ticketSlaSummary(reportTickets);

    return (
        <>
            <PageHeader title="Báo cáo cá nhân" subtitle="Theo dõi lịch sử yêu cầu, dịch vụ hay phát sinh và kết quả xử lý." />
            <ReportPeriodFilter range={range} onChange={setRange} />
            <ReportStats items={[
                { label: "Đã tạo", value: summary.total, icon: "add_task" },
                { label: "Đang mở", value: summary.open, icon: "pending_actions" },
                { label: "Đã xử lý", value: summary.handled, helper: `${formatPercent(sla.onTimePercent)} đúng SLA`, icon: "task_alt" },
                { label: "Đã hủy", value: summary.cancelled, icon: "cancel" },
                { label: "TB xử lý", value: formatMinutes(summary.avgResolutionMinutes), icon: "schedule" },
                { label: "Đánh giá đã gửi", value: summary.feedbackCount, helper: summary.avgRating ? `${summary.avgRating} sao trung bình` : "", icon: "star" }
            ]} />
            <ReportTabs
                active={activeTab}
                onChange={setActiveTab}
                tabs={[
                    { value: "overview", label: "Tổng quan", icon: "insights" },
                    { value: "services", label: "Dịch vụ", icon: "category" },
                    { value: "open", label: "Đang theo dõi", icon: "visibility" }
                ]}
            />
            {activeTab === "overview" && (
                <div className="grid cols-2">
                    <Section title="Yêu cầu theo trạng thái">
                        <ReportBarList items={statusReportRows(reportTickets)} />
                    </Section>
                    <Section title="Xu hướng gửi yêu cầu">
                        <ReportBarList items={dailyReportRows(reportTickets)} emptyText="Chưa có yêu cầu trong kỳ" pageSize={10} label="ngày" />
                    </Section>
                </div>
            )}
            {activeTab === "services" && (
                <div className="grid cols-2">
                    <Section title="Dịch vụ hay phát sinh">
                        <ReportBarList items={serviceReportRows(reportTickets)} emptyText="Chưa có dữ liệu dịch vụ" pageSize={8} label="dịch vụ" />
                    </Section>
                    <Section title="Mức ưu tiên">
                        <ReportBarList items={priorityReportRows(reportTickets)} emptyText="Chưa có dữ liệu ưu tiên" />
                    </Section>
                </div>
            )}
            {activeTab === "open" && (
                <Section title="Yêu cầu còn đang theo dõi">
                    <TicketTable tickets={reportTickets.filter((ticket) => !isClosed(ticket))} pageSize={10} />
                </Section>
            )}
        </>
    );
}
