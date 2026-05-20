function SupportReports() {
    const { data: tickets } = useApi("/tickets/assigned-to-me", []);
    const [range, setRange] = React.useState(() => reportRangeForPreset("30D"));
    const [activeTab, setActiveTab] = React.useState("overview");
    const reportTickets = React.useMemo(() => filterTicketsByRange(tickets, range), [tickets, range]);
    const summary = ticketReportSummary(reportTickets);
    const sla = ticketSlaSummary(reportTickets);
    const feedbackRows = ticketFeedbackRows(reportTickets);

    return (
        <>
            <PageHeader title="Báo cáo hiệu suất cá nhân" subtitle="Phân tích công việc được giao, SLA và phản hồi trong kỳ." />
            <ReportPeriodFilter range={range} onChange={setRange} />
            <ReportStats items={[
                { label: "Được giao", value: summary.total, icon: "assignment" },
                { label: "Hoàn tất", value: summary.handled, helper: `${summary.closed} yêu cầu đã đóng/hủy`, icon: "task_alt" },
                { label: "Đang mở", value: summary.open, icon: "pending_actions" },
                { label: "Quá hạn", value: summary.overdue, icon: "warning" },
                { label: "SLA đúng hạn", value: formatPercent(sla.onTimePercent), helper: `${sla.onTime}/${sla.resolved} yêu cầu đã xử lý`, icon: "timer" },
                { label: "Đánh giá TB", value: summary.avgRating || "-", helper: `${summary.feedbackCount} phản hồi`, icon: "star" }
            ]} />
            <ReportTabs
                active={activeTab}
                onChange={setActiveTab}
                tabs={[
                    { value: "overview", label: "Tổng quan", icon: "insights" },
                    { value: "sla", label: "SLA", icon: "timer" },
                    { value: "feedback", label: "Phản hồi", icon: "reviews" }
                ]}
            />
            {activeTab === "overview" && (
                <div className="grid cols-2">
                    <Section title="Yêu cầu theo trạng thái">
                        <ReportBarList items={statusReportRows(reportTickets)} />
                    </Section>
                    <Section title="Xu hướng theo ngày">
                        <ReportBarList items={dailyReportRows(reportTickets)} emptyText="Chưa có yêu cầu trong kỳ" pageSize={10} label="ngày" />
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
                    <Section title="Yêu cầu cần ưu tiên">
                        <TicketTable tickets={reportTickets.filter((ticket) => isOverdue(ticket) || ticket.status_code === "WAITING_FOR_USER")} pageSize={5} />
                    </Section>
                </div>
            )}
            {activeTab === "feedback" && (
                <div className="grid cols-2">
                    <Section title="Phân bố đánh giá">
                        <ReportBarList items={feedbackRows} emptyText="Chưa có phản hồi trong kỳ" />
                    </Section>
                    <Section title="Yêu cầu đánh giá thấp">
                        <LowFeedbackRequests tickets={reportTickets} />
                    </Section>
                </div>
            )}
        </>
    );
}
