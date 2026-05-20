function RequesterDashboard() {
    const { data: tickets } = useApi("/tickets/my", []);

    return (
        <>
            <PageHeader title="Bảng điều khiển cá nhân" subtitle="Theo dõi các yêu cầu hỗ trợ của bạn." action={<Link className="btn primary" to="/requester/tickets/create"><Icon name="add" />Tạo yêu cầu</Link>} />
            <TicketStatusFilter tickets={tickets} title="Yêu cầu theo trạng thái" pageSize={5} />
        </>
    );
}
