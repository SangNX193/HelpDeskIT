function SupportDashboard() {
    const { data: tickets } = useApi("/tickets/assigned-to-me", []);
    return (
        <>
            <PageHeader title="Bảng điều khiển nhân viên IT" subtitle="Yêu cầu được giao và hiệu suất xử lý cá nhân." />
            <TicketStatusFilter tickets={tickets} title="Yêu cầu được giao theo trạng thái" pageSize={5} />
        </>
    );
}
