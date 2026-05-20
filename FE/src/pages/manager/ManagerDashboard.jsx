function ManagerDashboard({ admin = false }) {
    const { data: tickets } = useApi("/tickets", []);
    const { data: supportPerformance } = useApi("/dashboard/support-performance", []);

    return (
        <>
            <PageHeader title={admin ? "Bảng điều khiển quản trị" : "Bảng điều khiển quản lý"} subtitle="Tổng quan vận hành hỗ trợ CNTT." />
            <TicketStatusFilter tickets={tickets} title="Yêu cầu theo trạng thái" pageSize={5} />
            <div className="grid cols-2">
                <Section title="Yêu cầu gần đây"><TicketTable tickets={tickets} pageSize={5} /></Section>
                <Section title="Hiệu suất nhân viên">
                    <SimpleList items={supportPerformance} pageSize={5} label="nhân viên" getLabel={(item) => item.support_name} getValue={(item) => `${item.closed_tickets || 0}/${item.assigned_tickets || 0}`} />
                </Section>
            </div>
        </>
    );
}
