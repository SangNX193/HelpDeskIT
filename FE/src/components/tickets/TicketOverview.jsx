function TicketStatusFilter({ tickets, title = "Lọc theo trạng thái", pageSize = DEFAULT_PAGE_SIZE }) {
    const safeTickets = Array.isArray(tickets) ? tickets : [];
    const [selectedStatus, setSelectedStatus] = React.useState("ALL");
    const statusOptions = React.useMemo(() => ticketStatusOptions(safeTickets), [safeTickets]);

    React.useEffect(() => {
        if (selectedStatus !== "ALL" && !statusOptions.some((status) => status.code === selectedStatus)) {
            setSelectedStatus("ALL");
        }
    }, [selectedStatus, statusOptions]);

    const filteredTickets = selectedStatus === "ALL"
        ? safeTickets
        : safeTickets.filter((ticket) => ticket.status_code === selectedStatus);
    const selectedLabel = selectedStatus === "ALL"
        ? "Tất cả trạng thái"
        : statusOptions.find((status) => status.code === selectedStatus)?.name || selectedStatus;

    return (
        <Section title={title}>
            <div className="status-filter-grid">
                <button
                    className={`status-filter-option ${selectedStatus === "ALL" ? "active" : ""}`}
                    type="button"
                    onClick={() => setSelectedStatus("ALL")}
                >
                    <span>Tất cả</span>
                    <strong>{safeTickets.length}</strong>
                </button>
                {statusOptions.map((status) => (
                    <button
                        key={status.code}
                        className={`status-filter-option ${statusClassName(status.code)} ${selectedStatus === status.code ? "active" : ""}`}
                        type="button"
                        onClick={() => setSelectedStatus(status.code)}
                    >
                        <span>{status.name}</span>
                        <strong>{status.count}</strong>
                    </button>
                ))}
            </div>
            <div className="status-filter-summary">
                <strong>{selectedLabel}</strong>
                <span>{filteredTickets.length} yêu cầu</span>
            </div>
            <TicketTable key={selectedStatus} tickets={filteredTickets} pageSize={pageSize} />
        </Section>
    );
}

function TicketList({ mode }) {
    const endpoints = {
        requester: "/tickets/my",
        support: "/tickets/assigned-to-me",
        manager: "/tickets",
        admin: "/tickets"
    };
    const { data: tickets, refresh } = useApi(endpoints[mode], []);
    const { user } = useAuth();
    const isManagementMode = mode === "manager" || mode === "admin";

    return (
        <>
            <PageHeader
                title={mode === "requester" ? "Quản lý yêu cầu cá nhân" : mode === "support" ? "Yêu cầu được giao" : "Quản lý yêu cầu"}
                subtitle="Dữ liệu lấy trực tiếp từ database."
                action={user.role_code === "REQUESTER" && <Link className="btn primary" to="/requester/tickets/create"><Icon name="add" />Tạo yêu cầu</Link>}
            />
            {isManagementMode ? (
                <TicketManagementGrid tickets={tickets} refresh={refresh} />
            ) : (
                <PaginatedGrid items={tickets} pageSize={9} label="yêu cầu" emptyText="Chưa có yêu cầu" className="grid cols-3">
                    {(ticket) => <TicketCard key={ticket.id} ticket={ticket} refresh={refresh} />}
                </PaginatedGrid>
            )}
        </>
    );
}

function TicketManagementGrid({ tickets, refresh }) {
    const safeTickets = Array.isArray(tickets) ? tickets : [];
    const [selectedStatus, setSelectedStatus] = React.useState("ALL");
    const [selectedPriority, setSelectedPriority] = React.useState("ALL");
    const [searchText, setSearchText] = React.useState("");
    const statusOptions = React.useMemo(() => ticketStatusOptions(safeTickets), [safeTickets]);
    const priorityOptions = React.useMemo(() => ticketPriorityOptions(safeTickets), [safeTickets]);

    React.useEffect(() => {
        if (selectedStatus !== "ALL" && !statusOptions.some((status) => status.code === selectedStatus)) {
            setSelectedStatus("ALL");
        }
    }, [selectedStatus, statusOptions]);

    React.useEffect(() => {
        if (selectedPriority !== "ALL" && !priorityOptions.some((priority) => priority.code === selectedPriority)) {
            setSelectedPriority("ALL");
        }
    }, [selectedPriority, priorityOptions]);

    const filteredTickets = React.useMemo(() => {
        return safeTickets.filter((ticket) => {
            const statusMatches = selectedStatus === "ALL" || ticket.status_code === selectedStatus;
            const priorityMatches = selectedPriority === "ALL" || ticketPriorityKey(ticket) === selectedPriority;
            return statusMatches && priorityMatches;
        });
    }, [safeTickets, selectedStatus, selectedPriority]);

    const normalizedSearch = normalizeSearchValue(searchText);
    const visibleTickets = React.useMemo(() => {
        if (!normalizedSearch) return filteredTickets;
        return filteredTickets.filter((ticket) => {
            return [
                ticket.requester_name,
                ticket.title,
                ticket.code
            ].some((value) => normalizeSearchValue(value).includes(normalizedSearch));
        });
    }, [filteredTickets, normalizedSearch]);

    const hasActiveFilters = selectedStatus !== "ALL" || selectedPriority !== "ALL" || searchText.trim() !== "";
    const resetFilters = () => {
        setSelectedStatus("ALL");
        setSelectedPriority("ALL");
        setSearchText("");
    };

    return (
        <>
            <section className="card ticket-filter-panel">
                <div className="ticket-filter-header">
                    <h2 style={{ margin: 0 }}>Bộ lọc yêu cầu</h2>
                    <button className="btn ghost" type="button" disabled={!hasActiveFilters} onClick={resetFilters}>
                        <Icon name="restart_alt" />Đặt lại
                    </button>
                </div>
                <div className="ticket-filter-controls">
                    <Field label="Trạng thái">
                        <select className="select" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                            <option value="ALL">Tất cả trạng thái ({safeTickets.length})</option>
                            {statusOptions.map((status) => (
                                <option key={status.code} value={status.code}>{status.name} ({status.count})</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Mức ưu tiên">
                        <select className="select" value={selectedPriority} onChange={(event) => setSelectedPriority(event.target.value)}>
                            <option value="ALL">Tất cả mức ưu tiên ({safeTickets.length})</option>
                            {priorityOptions.map((priority) => (
                                <option key={priority.code} value={priority.code}>{priority.name} ({priority.count})</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Tìm kiếm theo tên">
                        <div className="search-field">
                            <Icon name="search" />
                            <input
                                className="input"
                                value={searchText}
                                onChange={(event) => setSearchText(event.target.value)}
                                placeholder="Tên người yêu cầu, tiêu đề hoặc mã"
                            />
                        </div>
                    </Field>
                </div>
                <div className="ticket-filter-summary">
                    <span>Đang hiển thị {visibleTickets.length} / {safeTickets.length} yêu cầu</span>
                    {filteredTickets.length !== safeTickets.length && <span>Sau lọc: {filteredTickets.length}</span>}
                </div>
            </section>
            <PaginatedGrid items={visibleTickets} pageSize={9} label="yêu cầu" emptyText="Không có yêu cầu phù hợp" className="grid cols-3">
                {(ticket) => <TicketCard key={ticket.id} ticket={ticket} refresh={refresh} />}
            </PaginatedGrid>
        </>
    );
}

function TicketCard({ ticket }) {
    const { user } = useAuth();
    const base = user.role_code === "REQUESTER" ? "/requester/tickets" : user.role_code === "SUPPORT" ? "/support/tickets" : user.role_code === "ADMIN" ? "/admin/tickets" : "/manager/tickets";
    return (
        <div className="card ticket-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <Badge value={ticket.priority_name} type={ticket.priority_code === "P1" ? "danger" : "primary"} />
                <Badge value={ticket.status_name} type={statusClassName(ticket.status_code)} />
            </div>
            <div>
                <p className="muted" style={{ margin: 0 }}>{ticket.code}</p>
                <h3 className="ticket-card-title">{ticket.title}</h3>
            </div>
            <p className="muted" style={{ margin: 0 }}>{ticket.room ? `Phòng ${ticket.room} - ` : ""}{ticket.service_name} - {formatDate(ticket.created_at)}</p>
            {ticket.feedback_rating && <RatingStars rating={ticket.feedback_rating} showValue />}
            <Link className="btn primary" to={`${base}/${ticket.id}`}>Xem chi tiết</Link>
        </div>
    );
}

function TicketTable({ tickets, pageSize = DEFAULT_PAGE_SIZE }) {
    const pagination = usePagination(tickets, pageSize);

    if (!pagination.totalItems) return <Empty text="Chưa có dữ liệu yêu cầu" />;

    return (
        <>
            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Mã</th>
                            <th>Tiêu đề</th>
                            <th>Người yêu cầu</th>
                            <th>Phòng</th>
                            <th>Trạng thái</th>
                            <th>Ưu tiên</th>
                            <th>Đánh giá</th>
                            <th>Cập nhật</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pagination.items.map((ticket) => (
                            <tr key={ticket.id}>
                                <td><strong>{ticket.code}</strong></td>
                                <td>{ticket.title}</td>
                                <td>{ticket.requester_name}</td>
                                <td>{ticket.room || "-"}</td>
                                <td><Badge value={ticket.status_name} type={statusClassName(ticket.status_code)} /></td>
                                <td>{ticket.priority_name}</td>
                                <td>{ticket.feedback_rating ? <RatingStars rating={ticket.feedback_rating} /> : "-"}</td>
                                <td>{formatDate(ticket.updated_at || ticket.created_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination {...pagination} label="yêu cầu" />
        </>
    );
}
