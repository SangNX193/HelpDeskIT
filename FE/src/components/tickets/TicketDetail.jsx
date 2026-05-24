function TicketDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const { data: ticket, refresh } = useApi(`/tickets/${id}`, null);
    const { data: comments, refresh: refreshComments } = useApi(`/tickets/${id}/comments`, []);
    const { data: attachments, refresh: refreshAttachments } = useApi(`/tickets/${id}/attachments`, []);
    const [editing, setEditing] = React.useState(false);
    const commentPagination = usePagination(comments, 5);
    const attachmentPagination = usePagination(attachments, 6);

    if (!ticket) return <Empty text="Đang tải yêu cầu..." />;

    return (
        <>
            <PageHeader title={ticket.title} subtitle={`${ticket.code} - ${ticket.service_name}`} />
            <div className="grid cols-2">
                <Section title="Thông tin yêu cầu">
                    <InfoRows rows={[
                        ["Trạng thái", ticket.status_name],
                        ["Ưu tiên", ticket.priority_name],
                        ["Người yêu cầu", ticket.requester_name],
                        ["Phòng cần hỗ trợ", ticket.room],
                        ["Nhân viên xử lý", ticket.assigned_support_names || ticket.assigned_to_name || "Chưa phân công"],
                        ["Tiến độ nhân viên", <AssigneeProgress ticket={ticket} />],
                        ["Đánh giá", ticket.feedback_rating ? <RatingStars rating={ticket.feedback_rating} showValue /> : "Chưa đánh giá"],
                        ["Ngày tạo", formatDate(ticket.created_at)],
                        ["SLA xử lý", formatDate(ticket.due_resolve_at)]
                    ]} />
                    <p>{ticket.description}</p>
                    <TicketActions ticket={ticket} refresh={refresh} onEdit={() => setEditing(true)} />
                </Section>
                <Section title="Bình luận và file">
                    <CommentBox ticket={ticket} onDone={refreshComments} />
                    <UploadBox ticket={ticket} onDone={refreshAttachments} />
                    <div style={{ marginTop: 16 }}>
                        {commentPagination.items.map((comment) => (
                            <div key={comment.id} className="card" style={{ boxShadow: "none", marginBottom: 10 }}>
                                <strong>{comment.user_name}</strong>
                                {comment.is_internal ? <Badge value="Nội bộ" type="warning" /> : null}
                                <p className="muted">{comment.content}</p>
                            </div>
                        ))}
                        <Pagination {...commentPagination} label="bình luận" />
                        {attachments.length > 0 && (
                            <>
                                <div className="attachment-grid">
                                    {attachmentPagination.items.map((file) => <AttachmentPreview key={file.id} file={file} />)}
                                </div>
                                <Pagination {...attachmentPagination} label="file" />
                            </>
                        )}
                    </div>
                </Section>
            </div>
            <AiSuggestionPanel ticket={ticket} attachments={attachments} />
            <AiChatPanel ticket={ticket} />
            {(user.role_code === "MANAGER" || user.role_code === "ADMIN") && !isClosed(ticket) && <ManagerTicketPanel ticket={ticket} refresh={refresh} />}
            {editing && (
                <TicketEditModal
                    ticket={ticket}
                    onClose={() => setEditing(false)}
                    onSaved={async () => {
                        setEditing(false);
                        await refresh();
                    }}
                />
            )}
        </>
    );
}

function AiSuggestionPanel({ ticket, attachments = [] }) {
    const toast = useToast();
    const [loading, setLoading] = React.useState(false);
    const [result, setResult] = React.useState(null);
    const [error, setError] = React.useState("");
    const imageCount = attachments.filter(isImageAttachment).length;

    const generate = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await api.post(`/tickets/${ticket.id}/ai-suggestions`);
            setResult(response.data.data);
            toast("Đã tạo gợi ý AI", "success");
        } catch (err) {
            const message = errorMessage(err);
            setError(message);
            toast(message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Section title="Gợi ý AI">
            <div className="ai-suggestion-panel">
                <div className="ai-suggestion-toolbar">
                    <div className="ai-suggestion-meta">
                        <Badge value={`${attachments.length} file`} type="primary" />
                        {imageCount > 0 && <Badge value={`${imageCount} ảnh`} type="success" />}
                    </div>
                    <button className="btn primary" type="button" onClick={generate} disabled={loading}>
                        <Icon name={loading ? "hourglass_top" : "auto_awesome"} />
                        {loading ? "Đang tạo..." : result ? "Tạo lại gợi ý" : "Tạo gợi ý AI"}
                    </button>
                </div>
                {error && <div className="ai-suggestion-error">{error}</div>}
                {result && (
                    <div className="ai-suggestion-result">
                        <div className="ai-suggestion-result-head">
                            <span>{result.provider} / {result.model}</span>
                            <span>{formatDate(result.generated_at)}</span>
                        </div>
                        <div className="ai-suggestion-content">{result.suggestion}</div>
                        {result.attachments_used?.length > 0 && (
                            <div className="ai-suggestion-files">
                                {result.attachments_used.map((name) => <Badge key={name} value={name} type="success" />)}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Section>
    );
}

function AiChatPanel({ ticket }) {
    const toast = useToast();
    const { data: messages, setData: setMessages, loading } = useApi(`/tickets/${ticket.id}/ai-chat`, []);
    const [draft, setDraft] = React.useState("");
    const [sending, setSending] = React.useState(false);
    const listRef = React.useRef(null);
    const safeMessages = Array.isArray(messages) ? messages : [];

    React.useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [safeMessages.length, sending]);

    const send = async (event) => {
        event.preventDefault();
        const content = draft.trim();
        if (!content || sending) return;

        const optimisticId = `local-${Date.now()}`;
        const optimisticMessage = {
            id: optimisticId,
            role: "USER",
            content,
            user_name: "Bạn",
            created_at: new Date().toISOString()
        };

        setDraft("");
        setSending(true);
        setMessages((items) => [...(Array.isArray(items) ? items : []), optimisticMessage]);

        try {
            const response = await api.post(`/tickets/${ticket.id}/ai-chat`, { message: content });
            setMessages(response.data.data.messages || []);
        } catch (error) {
            setDraft(content);
            setMessages((items) => (Array.isArray(items) ? items.filter((item) => item.id !== optimisticId) : []));
            toast(errorMessage(error), "error");
        } finally {
            setSending(false);
        }
    };

    return (
        <Section title="Chat AI">
            <div className="ai-chat-panel">
                <div className="ai-chat-messages" ref={listRef}>
                    {loading && safeMessages.length === 0 ? (
                        <Empty text="Đang tải hội thoại..." />
                    ) : safeMessages.length === 0 ? (
                        <Empty text="Chưa có hội thoại AI" />
                    ) : safeMessages.map((message) => {
                        const isAssistant = message.role === "ASSISTANT";
                        return (
                            <div key={message.id} className={`ai-chat-message ${isAssistant ? "assistant" : "user"}`}>
                                <div className="ai-chat-bubble">
                                    <div className="ai-chat-meta">
                                        <strong>{isAssistant ? "AI Helpdesk" : "Bạn"}</strong>
                                        <span>{formatDate(message.created_at)}</span>
                                    </div>
                                    <div className="ai-chat-content">{message.content}</div>
                                    {isAssistant && message.model && <div className="ai-chat-model">{message.provider} / {message.model}</div>}
                                </div>
                            </div>
                        );
                    })}
                    {sending && (
                        <div className="ai-chat-message assistant">
                            <div className="ai-chat-bubble">
                                <div className="ai-chat-meta">
                                    <strong>AI Helpdesk</strong>
                                </div>
                                <div className="ai-chat-content">Đang phản hồi...</div>
                            </div>
                        </div>
                    )}
                </div>
                <form className="ai-chat-form" onSubmit={send}>
                    <textarea
                        className="input"
                        rows="2"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="Nhập câu hỏi cho AI"
                        disabled={sending}
                    />
                    <button className="btn primary ai-chat-send" type="submit" disabled={sending || !draft.trim()}>
                        <Icon name={sending ? "hourglass_top" : "send"} />
                        {sending ? "Đang gửi" : "Gửi"}
                    </button>
                </form>
            </div>
        </Section>
    );
}

function TicketEditModal({ ticket, onClose, onSaved }) {
    const toast = useToast();
    const { data: services } = useApi("/services", []);
    const { data: priorities } = useApi("/priorities", []);
    const [form, setForm] = React.useState({
        title: ticket.title || "",
        description: ticket.description || "",
        room: ticket.room || "",
        serviceId: ticket.service_id || "",
        priorityId: ticket.priority_id || ""
    });
    const [loading, setLoading] = React.useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            await api.put(`/tickets/${ticket.id}`, form);
            toast("Cập nhật yêu cầu thành công", "success");
            await onSaved();
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <form className="modal form" onSubmit={submit}>
                <div>
                    <h3 style={{ margin: 0 }}>Chỉnh sửa yêu cầu</h3>
                    <p className="muted" style={{ margin: "6px 0 0" }}>Chỉ chỉnh sửa được trong 5 phút đầu sau khi tạo yêu cầu.</p>
                </div>
                <Field label="Tiêu đề">
                    <input className="input" value={form.title} onChange={(event) => { clearInputValidity(event); setForm({ ...form, title: event.target.value }); }} onInvalid={setInputValidityMessage("Vui lòng nhập tiêu đề yêu cầu")} required />
                </Field>
                <Field label="Phòng cần hỗ trợ">
                    <input className="input" value={form.room} onChange={(event) => { clearInputValidity(event); setForm({ ...form, room: event.target.value }); }} onInvalid={setInputValidityMessage("Vui lòng nhập phòng có số phòng cụ thể, ví dụ: A2-302")} placeholder="Ví dụ: A2-302" maxLength={60} pattern=".*[0-9].*" required />
                </Field>
                <Field label="Dịch vụ">
                    <select className="select" value={form.serviceId} onChange={(event) => { clearInputValidity(event); setForm({ ...form, serviceId: event.target.value }); }} onInvalid={setInputValidityMessage("Vui lòng chọn dịch vụ cần hỗ trợ")} required>
                        {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                    </select>
                </Field>
                <Field label="Mức ưu tiên">
                    <select className="select" value={form.priorityId} onChange={(event) => { clearInputValidity(event); setForm({ ...form, priorityId: event.target.value }); }} onInvalid={setInputValidityMessage("Vui lòng chọn mức ưu tiên")} required>
                        {priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
                    </select>
                </Field>
                <Field label="Mô tả chi tiết">
                    <textarea
                        className="textarea"
                        value={form.description}
                        onChange={(event) => {
                            clearInputValidity(event);
                            setForm({ ...form, description: event.target.value });
                        }}
                        onInvalid={setInputValidityMessage("Vui lòng mô tả sự cố")}
                        required
                    />
                </Field>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button className="btn ghost" type="button" onClick={onClose}>Đóng</button>
                    <button className="btn primary" disabled={loading}>{loading ? "Đang lưu..." : "Lưu thay đổi"}</button>
                </div>
            </form>
        </div>
    );
}

function TicketActions({ ticket, refresh, onEdit }) {
    const { user } = useAuth();
    const toast = useToast();
    const confirm = useConfirm();
    const [loading, setLoading] = React.useState(false);
    const [now, setNow] = React.useState(Date.now());
    const [feedbackOpen, setFeedbackOpen] = React.useState(false);

    React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const run = async (message, fn) => {
        setLoading(true);
        try {
            await fn();
            toast(message, "success");
            await refresh();
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setLoading(false);
        }
    };

    if (user.role_code === "REQUESTER") {
        const editInfo = ticketEditInfo(ticket, now);
        const hasFeedback = ticket.feedback_rating !== undefined && ticket.feedback_rating !== null;
        return (
            <>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16, width: "100%" }}>
                    {["NEW", "ASSIGNED"].includes(ticket.status_code) && (
                        <button className="btn danger" disabled={loading} onClick={async () => {
                            const ok = await confirm({ title: "Hủy yêu cầu", message: "Bạn chắc chắn muốn hủy yêu cầu này?" });
                            if (ok) run("Đã hủy yêu cầu", () => api.put(`/tickets/${ticket.id}/cancel`, { reason: "Người dùng đã hủy yêu cầu" }));
                        }}>Hủy yêu cầu</button>
                    )}
                    {["RESOLVED", "CLOSED"].includes(ticket.status_code) && (
                        hasFeedback
                            ? <div className="feedback-result"><span>Đã đánh giá</span><RatingStars rating={ticket.feedback_rating} showValue /></div>
                            : <button className="btn primary" disabled={loading} onClick={() => setFeedbackOpen(true)}>Đánh giá</button>
                    )}
                    <button
                        className="btn ghost"
                        type="button"
                        style={{ marginLeft: "auto" }}
                        disabled={loading || !editInfo.canEdit}
                        title={editInfo.reason}
                        onClick={onEdit}
                    >
                        <Icon name="edit" />
                        {editInfo.canEdit ? `Chỉnh sửa (${formatCountdown(editInfo.remainingMs)})` : "Hết thời gian sửa"}
                    </button>
                </div>
                {feedbackOpen && (
                    <FeedbackModal
                        ticket={ticket}
                        onClose={() => setFeedbackOpen(false)}
                        onSubmitted={async () => {
                            setFeedbackOpen(false);
                            await refresh();
                        }}
                    />
                )}
            </>
        );
    }

    if (user.role_code === "SUPPORT") {
        const myStatus = currentAssigneeStatus(ticket, user);
        const canAccept = ["ASSIGNED", "WAITING_FOR_USER", "IN_PROGRESS"].includes(ticket.status_code) && !["IN_PROGRESS", "RESOLVED"].includes(myStatus);
        const canWork = ticket.status_code === "IN_PROGRESS" && myStatus === "IN_PROGRESS";
        const waitingForTeamStart = ticket.status_code === "ASSIGNED" && myStatus === "IN_PROGRESS";
        const waitingForTeamResolve = ticket.status_code === "IN_PROGRESS" && myStatus === "RESOLVED";

        return (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                <Badge value={`Bạn: ${assigneeStatusLabel(myStatus)}`} type={assigneeStatusType(myStatus)} />
                {canAccept && <button className="btn primary" disabled={loading} onClick={() => run("Đã ghi nhận tiếp nhận", () => api.put(`/tickets/${ticket.id}/start`))}>Tiếp nhận</button>}
                {canWork && <button className="btn ghost" disabled={loading} onClick={() => run("Đã ghi nhận chờ người dùng", () => api.put(`/tickets/${ticket.id}/status`, { statusCode: "WAITING_FOR_USER", note: "Cần người dùng bổ sung thông tin" }))}>Chờ người dùng bổ sung</button>}
                {canWork && <button className="btn primary" disabled={loading} onClick={() => run("Đã ghi nhận hoàn tất", () => api.put(`/tickets/${ticket.id}/resolve`, { resolution: "Nhân viên IT đã xử lý xong" }))}>Hoàn tất xử lý</button>}
                {waitingForTeamStart && <span className="muted" style={{ alignSelf: "center", fontWeight: 800 }}>Đã tiếp nhận, chờ các nhân viên còn lại</span>}
                {waitingForTeamResolve && <span className="muted" style={{ alignSelf: "center", fontWeight: 800 }}>Đã hoàn tất phần của bạn, chờ các nhân viên còn lại</span>}
            </div>
        );
    }

    return null;
}

function FeedbackModal({ ticket, onClose, onSubmitted }) {
    const toast = useToast();
    const [rating, setRating] = React.useState(5);
    const [comment, setComment] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const commentRef = React.useRef(null);
    const requiresComment = rating < 3;

    React.useEffect(() => {
        commentRef.current?.setCustomValidity("");
    }, [requiresComment]);

    const submit = async (event) => {
        event.preventDefault();

        if (requiresComment && !comment.trim()) {
            toast("Cần nhập lý do đánh giá", "error");
            return;
        }

        setLoading(true);
        try {
            await api.post(`/tickets/${ticket.id}/feedback`, {
                rating,
                comment: comment.trim()
            });
            toast("Đã gửi đánh giá", "success");
            await onSubmitted();
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <form className="modal form" onSubmit={submit}>
                <div>
                    <h3 style={{ margin: 0 }}>Đánh giá yêu cầu</h3>
                    <p className="muted" style={{ margin: "6px 0 0" }}>{ticket.code} - {ticket.title}</p>
                </div>
                <Field label="Số sao">
                    <div className="star-rating" role="radiogroup" aria-label="Số sao đánh giá">
                        {[1, 2, 3, 4, 5].map((value) => (
                            <button
                                key={value}
                                className={`star-button ${value <= rating ? "active" : ""}`}
                                type="button"
                                onClick={() => setRating(value)}
                                aria-label={`${value} sao`}
                                aria-checked={rating === value}
                                role="radio"
                            >
                                <span className="material-symbols-outlined">star</span>
                            </button>
                        ))}
                    </div>
                </Field>
                <Field label={requiresComment ? "Lý do chưa hài lòng" : "Bình luận thêm"}>
                    <textarea
                        ref={commentRef}
                        className="textarea"
                        value={comment}
                        onChange={(event) => {
                            event.target.setCustomValidity("");
                            setComment(event.target.value);
                        }}
                        onInvalid={(event) => event.target.setCustomValidity("Cần nhập lý do đánh giá")}
                        required={requiresComment}
                        placeholder={requiresComment ? "Vui lòng nêu lý do để bộ phận IT cải thiện" : "Không bắt buộc"}
                    />
                </Field>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button className="btn ghost" type="button" onClick={onClose} disabled={loading}>Đóng</button>
                    <button className="btn primary" disabled={loading}>{loading ? "Đang gửi..." : "Gửi đánh giá"}</button>
                </div>
            </form>
        </div>
    );
}

const assigneeIdsFromTicket = (ticket = {}) => {
    const rawIds = ticket.assigned_support_ids || ticket.assigned_to || "";
    return [...new Set(String(rawIds).split(",")
        .map((value) => value.trim())
        .filter(Boolean))];
};

const assigneeStatusLabel = (statusCode) => ({
    ASSIGNED: "Chưa tiếp nhận",
    IN_PROGRESS: "Đang xử lý",
    WAITING_FOR_USER: "Chờ người dùng",
    RESOLVED: "Đã hoàn thành"
}[statusCode] || statusCode || "Chưa tiếp nhận");

const assigneeStatusType = (statusCode) => ({
    ASSIGNED: "status-assigned",
    IN_PROGRESS: "status-in-progress",
    WAITING_FOR_USER: "status-waiting-for-user",
    RESOLVED: "status-resolved"
}[statusCode] || "primary");

const assigneeStatusMapFromTicket = (ticket = {}) => {
    const pairs = String(ticket.assigned_support_statuses || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    return pairs.reduce((map, pair) => {
        const [id, statusCode] = pair.split(":");
        if (id) map[id] = statusCode || "ASSIGNED";
        return map;
    }, {});
};

const assigneeDetailsFromTicket = (ticket = {}) => {
    const ids = assigneeIdsFromTicket(ticket);
    const names = String(ticket.assigned_support_names || ticket.assigned_to_name || "")
        .split(", ")
        .map((name) => name.trim());
    const statusMap = assigneeStatusMapFromTicket(ticket);

    return ids.map((id, index) => ({
        id,
        name: names[index] || `Nhân viên #${id}`,
        statusCode: statusMap[id] || "ASSIGNED"
    }));
};

const currentAssigneeStatus = (ticket, user) => {
    const statusMap = assigneeStatusMapFromTicket(ticket);
    return statusMap[String(user?.id)] || "ASSIGNED";
};

function AssigneeProgress({ ticket }) {
    const assignees = assigneeDetailsFromTicket(ticket);

    if (!assignees.length) {
        return "Chưa phân công";
    }

    return (
        <div className="assignee-progress">
            {assignees.map((assignee) => (
                <span key={assignee.id} className="assignee-progress-item">
                    <span>{assignee.name}</span>
                    <Badge value={assigneeStatusLabel(assignee.statusCode)} type={assigneeStatusType(assignee.statusCode)} />
                </span>
            ))}
        </div>
    );
}

function ManagerTicketPanel({ ticket, refresh }) {
    const toast = useToast();
    const confirm = useConfirm();
    const supportUsersPath = `/support-users${ticket.room ? `?room=${encodeURIComponent(ticket.room)}` : ""}`;
    const { data: supportUsers } = useApi(supportUsersPath, []);
    const { data: priorities } = useApi("/priorities", []);
    const [supportIds, setSupportIds] = React.useState(() => assigneeIdsFromTicket(ticket));
    const [priorityId, setPriorityId] = React.useState(ticket.priority_id || "");

    React.useEffect(() => {
        setSupportIds(assigneeIdsFromTicket(ticket));
    }, [ticket.id, ticket.assigned_support_ids, ticket.assigned_to]);

    const toggleSupport = (supportId) => {
        const normalizedId = String(supportId);
        setSupportIds((current) => current.includes(normalizedId)
            ? current.filter((id) => id !== normalizedId)
            : [...current, normalizedId]);
    };

    const assign = async () => {
        if (!supportIds.length) return toast("Chọn nhân viên IT trước", "error");
        const ok = await confirm({ title: "Phân công yêu cầu", message: "Xác nhận phân công/tái phân công yêu cầu này?" });
        if (!ok) return;
        await api.put(`/tickets/${ticket.id}/${assigneeIdsFromTicket(ticket).length ? "reassign" : "assign"}`, { supportIds });
        toast("Phân công thành công", "success");
        refresh();
    };

    const updatePriority = async () => {
        await api.put(`/tickets/${ticket.id}/priority`, { priorityId });
        toast("Cập nhật ưu tiên thành công", "success");
        refresh();
    };

    return (
        <Section title="Điều phối của Quản lý/Quản trị">
            <div className="form-grid ticket-dispatch-grid">
                <Field label={`Nhân viên IT (${supportIds.length} đã chọn)`}>
                    <div className="assignee-picker">
                        {supportUsers.map((user) => {
                            const checked = supportIds.includes(String(user.id));
                            return (
                                <label key={user.id} className={`assignee-choice ${checked ? "active" : ""}`}>
                                    <span>
                                        <strong>{user.full_name}</strong>
                                        <small>{user.assigned_department_names || user.email}</small>
                                    </span>
                                    <input type="checkbox" checked={checked} onChange={() => toggleSupport(user.id)} />
                                </label>
                            );
                        })}
                        {supportUsers.length === 0 && <div className="empty">Chưa có nhân viên IT phù hợp</div>}
                    </div>
                </Field>
                <Field label="Mức ưu tiên">
                    <select className="select" value={priorityId} onChange={(e) => setPriorityId(e.target.value)}>
                        {priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
                    </select>
                </Field>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button className="btn primary" onClick={assign} disabled={!supportIds.length}>Phân công / Tái phân công</button>
                <button className="btn ghost" onClick={updatePriority}>Cập nhật ưu tiên</button>
            </div>
        </Section>
    );
}

function CommentBox({ ticket, onDone }) {
    const { user } = useAuth();
    const toast = useToast();
    const [content, setContent] = React.useState("");
    const [isInternal, setIsInternal] = React.useState(false);

    const submit = async (event) => {
        event.preventDefault();
        if (!content.trim()) return;
        try {
            await api.post(`/tickets/${ticket.id}/comments`, { content, isInternal });
            setContent("");
            setIsInternal(false);
            toast("Đã gửi phản hồi", "success");
            onDone();
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };

    return (
        <form className="form" onSubmit={submit}>
            <textarea className="textarea" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Nhập phản hồi..." />
            {user.role_code !== "REQUESTER" && (
                <label style={{ display: "flex", gap: 8 }}>
                    <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                    Ghi chú nội bộ
                </label>
            )}
            <button className="btn primary">Gửi phản hồi</button>
        </form>
    );
}

function UploadBox({ ticket, onDone }) {
    const toast = useToast();
    const [file, setFile] = React.useState(null);

    const upload = async () => {
        if (!file) return;
        const form = new FormData();
        form.append("file", file);
        try {
            await api.post(`/tickets/${ticket.id}/attachments`, form, { headers: { "Content-Type": "multipart/form-data" } });
            setFile(null);
            toast("Tải file thành công", "success");
            onDone();
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };

    return (
        <div className="form" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
                <input className="input" type="file" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,image/jpeg,image/png" onChange={(e) => setFile(e.target.files[0] || null)} />
                <button className="btn ghost" type="button" onClick={upload}>Tải lên</button>
            </div>
            {file && (
                <div className="attachment-grid">
                    <LocalFilePreview file={file} />
                </div>
            )}
        </div>
    );
}
