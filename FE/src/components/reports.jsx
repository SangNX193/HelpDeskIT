function ReportPeriodFilter({ range, onChange }) {
    const setPreset = (preset) => onChange(reportRangeForPreset(preset));
    const updateDate = (field, value) => onChange({ ...range, preset: "CUSTOM", [field]: value });

    return (
        <section className="card report-filter">
            <div>
                <h2 style={{ margin: 0 }}>Kỳ báo cáo</h2>
                <p className="muted" style={{ margin: "6px 0 0" }}>Dữ liệu báo cáo được tính theo ngày tạo yêu cầu trong khoảng đã chọn.</p>
            </div>
            <div className="report-filter-presets">
                {REPORT_PRESETS.map((preset) => (
                    <button
                        key={preset.value}
                        className={`btn ${range.preset === preset.value ? "primary" : "ghost"}`}
                        type="button"
                        onClick={() => setPreset(preset.value)}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
            <div className="form-grid">
                <Field label="Từ ngày">
                    <input className="input" type="date" value={range.fromDate} onChange={(event) => updateDate("fromDate", event.target.value)} />
                </Field>
                <Field label="Đến ngày">
                    <input className="input" type="date" value={range.toDate} onChange={(event) => updateDate("toDate", event.target.value)} />
                </Field>
            </div>
        </section>
    );
}

function ReportStats({ items }) {
    return (
        <div className="report-stat-grid">
            {items.map((item) => (
                <div key={item.label} className="card report-stat-card">
                    <div className="report-stat-icon"><Icon name={item.icon || "monitoring"} /></div>
                    <div>
                        <p className="stat-label">{item.label}</p>
                        <p className="stat-value">{item.value}</p>
                        {item.helper && <p className="report-stat-helper">{item.helper}</p>}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ReportTabs({ tabs, active, onChange }) {
    return (
        <div className="report-tabs">
            {tabs.map((tab) => (
                <button
                    key={tab.value}
                    className={`report-tab ${active === tab.value ? "active" : ""}`}
                    type="button"
                    onClick={() => onChange(tab.value)}
                >
                    <Icon name={tab.icon} />
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

function ReportBarList({ items, emptyText = "Chưa có dữ liệu", pageSize = 0, label = "mục" }) {
    const safeItems = Array.isArray(items) ? items.filter((item) => Number(item.value) > 0) : [];
    const pagination = usePagination(safeItems, pageSize || Math.max(safeItems.length, 1));
    const visibleItems = pageSize ? pagination.items : safeItems;
    if (!safeItems.length) return <Empty text={emptyText} />;

    const max = Math.max(...safeItems.map((item) => Number(item.value) || 0), 1);
    const total = safeItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

    return (
        <>
            <div className="report-bars">
                {visibleItems.map((item) => {
                    const value = Number(item.value) || 0;
                    const width = `${Math.max(4, Math.round((value / max) * 100))}%`;
                    const percent = total ? Math.round((value / total) * 100) : 0;
                    return (
                        <div key={item.key || item.label} className="report-bar-row">
                            <div className="report-bar-meta">
                                <span>{item.label}</span>
                                <strong>{value} ({percent}%)</strong>
                            </div>
                            <div className="report-bar-track">
                                <div className="report-bar-fill" style={{ width }} />
                            </div>
                        </div>
                    );
                })}
            </div>
            {pageSize > 0 && <Pagination {...pagination} label={label} />}
        </>
    );
}

function ReportTable({ columns, rows, getKey, emptyText = "Chưa có dữ liệu" }) {
    if (!rows.length) return <Empty text={emptyText} />;

    return (
        <div className="table-wrap">
            <table className="table">
                <thead>
                    <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={getKey ? getKey(row) : row.id || index}>
                            {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function LowFeedbackRequests({ tickets }) {
    const [selectedTicket, setSelectedTicket] = React.useState(null);
    const lowRatedTickets = React.useMemo(() => (
        (Array.isArray(tickets) ? tickets : [])
            .filter((ticket) => Number(ticket.feedback_rating) > 0 && Number(ticket.feedback_rating) <= 3)
    ), [tickets]);
    const pagination = usePagination(lowRatedTickets, 5);

    if (!pagination.totalItems) return <Empty text="Chưa có yêu cầu đánh giá thấp" />;

    return (
        <>
            <ReportTable
                rows={pagination.items}
                getKey={(ticket) => ticket.id}
                columns={[
                    { key: "code", label: "Mã", render: (ticket) => <strong>{ticket.code}</strong> },
                    { key: "title", label: "Yêu cầu" },
                    { key: "requester_name", label: "Người gửi" },
                    { key: "feedback_rating", label: "Đánh giá", render: (ticket) => <RatingStars rating={ticket.feedback_rating} showValue /> },
                    {
                        key: "action",
                        label: "Thao tác",
                        render: (ticket) => (
                            <button className="btn ghost" type="button" onClick={() => setSelectedTicket(ticket)}>
                                <Icon name="visibility" />Xem đánh giá
                            </button>
                        )
                    }
                ]}
            />
            <Pagination {...pagination} label="đánh giá thấp" />
            {selectedTicket && (
                <FeedbackDetailModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                />
            )}
        </>
    );
}

function FeedbackDetailModal({ ticket, onClose }) {
    const { user } = useAuth();
    const base = user.role_code === "ADMIN" ? "/admin/tickets" : user.role_code === "MANAGER" ? "/manager/tickets" : user.role_code === "SUPPORT" ? "/support/tickets" : "/requester/tickets";

    return (
        <div className="modal-backdrop">
            <div className="modal feedback-detail-modal">
                <div>
                    <h3 style={{ margin: 0 }}>Chi tiết đánh giá</h3>
                    <p className="muted" style={{ margin: "6px 0 0" }}>{ticket.code} - {ticket.title}</p>
                </div>
                <div className="feedback-detail-rating">
                    <RatingStars rating={ticket.feedback_rating} showValue />
                </div>
                <div className="feedback-comment-box">
                    <strong>Phản hồi của người dùng</strong>
                    <p>{ticket.feedback_comment || "Người dùng không để lại bình luận."}</p>
                </div>
                <InfoRows rows={[
                    ["Người gửi", ticket.requester_name],
                    ["Phòng", ticket.room],
                    ["Dịch vụ", ticket.service_name],
                    ["Trạng thái", ticket.status_name],
                    ["Nhân viên xử lý", ticket.assigned_to_name || "Chưa phân công"],
                    ["Ngày tạo", formatDate(ticket.created_at)]
                ]} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                    <button className="btn ghost" type="button" onClick={onClose}>Đóng</button>
                    <Link className="btn primary" to={`${base}/${ticket.id}`} onClick={onClose}>Mở yêu cầu</Link>
                </div>
            </div>
        </div>
    );
}
