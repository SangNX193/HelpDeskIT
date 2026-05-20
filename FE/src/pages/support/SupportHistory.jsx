function SupportHistory() {
    const { data: tickets } = useApi("/tickets/assigned-to-me", []);
    return (
        <>
            <PageHeader title="Lịch sử xử lý" subtitle="Các yêu cầu đã xử lý hoặc đã đóng." />
            <TicketTable tickets={tickets.filter(isClosed)} />
        </>
    );
}
