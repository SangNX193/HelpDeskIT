function ConsultationChatWidget() {
    const { user } = useAuth();
    const toast = useToast();
    const isStaff = ["SUPPORT", "MANAGER", "ADMIN"].includes(user?.role_code);
    const [open, setOpen] = React.useState(false);
    const [summary, setSummary] = React.useState({ unread_count: 0 });
    const [conversations, setConversations] = React.useState([]);
    const [activeThread, setActiveThread] = React.useState({ conversation: null, messages: [] });
    const [selectedId, setSelectedId] = React.useState(null);
    const [staffFolder, setStaffFolder] = React.useState("all");
    const [draft, setDraft] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [sending, setSending] = React.useState(false);
    const messagesRef = React.useRef(null);
    const selectedIdRef = React.useRef(null);
    const suppressAutoSelectUntilRef = React.useRef(0);

    const unreadCount = Number(summary?.unread_count) || 0;
    const messages = Array.isArray(activeThread.messages) ? activeThread.messages : [];
    const staffFolders = [
        { value: "all", label: "Tổng tin nhắn", icon: "inbox", count: summary?.total_count ?? summary?.conversation_count ?? conversations.length },
        { value: "unread", label: "Chưa đọc", icon: "mark_chat_unread", count: summary?.unread_count || 0 },
        { value: "archived", label: "Lưu trữ", icon: "archive", count: summary?.archived_count || 0 },
        { value: "deleted", label: "Đã xóa", icon: "delete", count: summary?.deleted_count || 0 }
    ];

    const loadSummary = React.useCallback(async () => {
        try {
            const response = await api.get("/consultations/summary");
            setSummary(response.data.data || { unread_count: 0 });
        } catch {
            // The floating widget should stay quiet when a background refresh fails.
        }
    }, []);

    const loadRequesterThread = React.useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get("/consultations/my");
            setActiveThread(response.data.data || { conversation: null, messages: [] });
            await loadSummary();
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setLoading(false);
        }
    }, [loadSummary, toast]);

    const loadConversation = React.useCallback(async (conversationId, quiet = false) => {
        if (!conversationId) return;
        if (!quiet) setLoading(true);

        try {
            const response = await api.get(`/consultations/${conversationId}`);
            setActiveThread(response.data.data || { conversation: null, messages: [] });
            selectedIdRef.current = Number(conversationId);
            setSelectedId(Number(conversationId));
            await loadSummary();
        } catch (error) {
            if (!quiet) toast(errorMessage(error), "error");
        } finally {
            if (!quiet) setLoading(false);
        }
    }, [loadSummary, toast]);

    const loadStaffInbox = React.useCallback(async (preferredId = null, quiet = false) => {
        if (!quiet) setLoading(true);

        try {
            const response = await api.get(`/consultations?folder=${encodeURIComponent(staffFolder)}`);
            const items = Array.isArray(response.data.data) ? response.data.data : [];
            setConversations(items);

            const suppressAutoSelect = Date.now() < suppressAutoSelectUntilRef.current;
            const hasPreferred = !suppressAutoSelect && items.some((item) => Number(item.id) === Number(preferredId));
            const nextId = hasPreferred ? preferredId : null;
            if (nextId) {
                await loadConversation(nextId, true);
            } else {
                setActiveThread({ conversation: null, messages: [] });
                setSelectedId(null);
            }
            await loadSummary();
        } catch (error) {
            if (!quiet) toast(errorMessage(error), "error");
        } finally {
            if (!quiet) setLoading(false);
        }
    }, [loadConversation, loadSummary, staffFolder, toast]);

    React.useEffect(() => {
        selectedIdRef.current = selectedId;
    }, [selectedId]);

    React.useEffect(() => {
        loadSummary();
        const timer = setInterval(loadSummary, 30000);
        return () => clearInterval(timer);
    }, [loadSummary]);

    React.useEffect(() => {
        if (!open) return undefined;

        if (isStaff) {
            loadStaffInbox(selectedIdRef.current);
        } else {
            loadRequesterThread();
        }

        const timer = setInterval(() => {
            if (isStaff) {
                loadStaffInbox(selectedIdRef.current, true);
            } else {
                loadRequesterThread();
            }
        }, 15000);

        return () => clearInterval(timer);
    }, [isStaff, loadRequesterThread, loadStaffInbox, open]);

    React.useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [messages.length, open]);

    const send = async (event) => {
        event.preventDefault();
        const content = draft.trim();
        const conversationId = activeThread.conversation?.id;
        if (!content || sending || (isStaff && !conversationId)) return;

        const optimisticMessage = {
            id: `local-${Date.now()}`,
            sender_id: user.id,
            sender_role_code: user.role_code,
            sender_name: user.full_name || "Bạn",
            content,
            created_at: typeof nowAppIso === "function" ? nowAppIso() : new Date().toISOString()
        };

        setDraft("");
        setSending(true);
        setActiveThread((thread) => ({
            ...thread,
            messages: [...(Array.isArray(thread.messages) ? thread.messages : []), optimisticMessage]
        }));

        try {
            const path = isStaff
                ? `/consultations/${conversationId}/messages`
                : "/consultations/my/messages";
            const response = await api.post(path, { message: content });
            setActiveThread(response.data.data || { conversation: null, messages: [] });
            if (isStaff) {
                await loadStaffInbox(conversationId, true);
            }
            await loadSummary();
        } catch (error) {
            setDraft(content);
            setActiveThread((thread) => ({
                ...thread,
                messages: (Array.isArray(thread.messages) ? thread.messages : []).filter((message) => message.id !== optimisticMessage.id)
            }));
            toast(errorMessage(error), "error");
        } finally {
            setSending(false);
        }
    };

    const selectStaffFolder = (folder) => {
        setStaffFolder(folder);
        selectedIdRef.current = null;
        setSelectedId(null);
        setActiveThread({ conversation: null, messages: [] });
    };

    const runStaffAction = async (action) => {
        const conversationId = activeThread.conversation?.id;
        if (!conversationId || sending) return;

        const actions = {
            unread: {
                method: "put",
                path: `/consultations/${conversationId}/unread`,
                message: "Đã đặt lại chưa đọc",
                keepSelected: true
            },
            archive: {
                method: "put",
                path: `/consultations/${conversationId}/archive`,
                message: "Đã lưu trữ cuộc tư vấn"
            },
            delete: {
                method: "delete",
                path: `/consultations/${conversationId}`,
                message: "Đã xóa cuộc tư vấn khỏi hộp thư"
            },
            restore: {
                method: "put",
                path: `/consultations/${conversationId}/restore`,
                message: "Đã khôi phục cuộc tư vấn",
                keepSelected: true
            }
        };
        const config = actions[action];
        if (!config) return;

        setLoading(true);
        try {
            await api[config.method](config.path);
            toast(config.message, "success");
            await loadSummary();

            if (action === "unread") {
                suppressAutoSelectUntilRef.current = Date.now() + 5000;
                selectedIdRef.current = null;
                setSelectedId(null);
                setActiveThread({ conversation: null, messages: [] });
                await loadStaffInbox(null, true);
                return;
            }

            if (!config.keepSelected) {
                selectedIdRef.current = null;
            }
            await loadStaffInbox(config.keepSelected ? conversationId : null, true);
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setLoading(false);
        }
    };

    const openWidget = () => setOpen((value) => !value);
    const activeConversation = activeThread.conversation;
    const panelTitle = isStaff ? "Hộp tư vấn" : "Chat tư vấn";
    const panelSubtitle = isStaff ? "Trao đổi với người dùng" : "Nhắn với nhân viên hệ thống";

    return (
        <div className="consultation-chat-widget">
            {open && (
                <section className={`consultation-chat-panel ${isStaff ? "staff" : ""}`} aria-label={panelTitle}>
                    <header className="consultation-chat-head">
                        <div>
                            <h2>{panelTitle}</h2>
                            <p>{panelSubtitle}</p>
                        </div>
                        <button className="btn ghost icon-btn" type="button" onClick={() => setOpen(false)} title="Đóng">
                            <Icon name="close" />
                        </button>
                    </header>

                    <div className="consultation-chat-body">
                        {isStaff && (
                            <aside className="consultation-thread-list">
                                <div className="consultation-folder-list">
                                    {staffFolders.map((folder) => (
                                        <button
                                            key={folder.value}
                                            className={`consultation-folder-button ${staffFolder === folder.value ? "active" : ""}`}
                                            type="button"
                                            onClick={() => selectStaffFolder(folder.value)}
                                        >
                                            <Icon name={folder.icon} />
                                            <span>{folder.label}</span>
                                            <strong>{Number(folder.count) || 0}</strong>
                                        </button>
                                    ))}
                                </div>
                                <div className="consultation-thread-scroll">
                                    {conversations.length === 0 ? (
                                        <Empty text="Chưa có cuộc tư vấn" />
                                    ) : conversations.map((conversation) => (
                                        <button
                                            key={conversation.id}
                                            className={`consultation-thread-item ${Number(selectedId) === Number(conversation.id) ? "active" : ""}`}
                                            type="button"
                                            onClick={() => loadConversation(conversation.id)}
                                        >
                                            <span className="consultation-thread-avatar">{initials(conversation.requester_name || conversation.requester_email)}</span>
                                            <span className="consultation-thread-text">
                                                <strong>{conversation.requester_name || "Người dùng"}</strong>
                                                <small>{conversation.last_message_content || "Chưa có tin nhắn"}</small>
                                            </span>
                                            {Number(conversation.unread_count) > 0 && <span className="consultation-unread-dot" />}
                                        </button>
                                    ))}
                                </div>
                            </aside>
                        )}

                        <div className="consultation-chat-main">
                            {isStaff && activeConversation && (
                                <div className="consultation-active-user">
                                    <div>
                                        <strong>{activeConversation.requester_name}</strong>
                                        <span>{activeConversation.requester_email}</span>
                                    </div>
                                    <div className="consultation-thread-actions">
                                        {activeConversation.staff_state === "DELETED" ? (
                                            <button className="btn ghost" type="button" onClick={() => runStaffAction("restore")} disabled={loading}>
                                                <Icon name="restore_from_trash" />
                                                Khôi phục
                                            </button>
                                        ) : (
                                            <>
                                                <button className="btn ghost" type="button" onClick={() => runStaffAction("unread")} disabled={loading}>
                                                    <Icon name="mark_chat_unread" />
                                                    Đặt chưa đọc
                                                </button>
                                                {activeConversation.staff_state === "ARCHIVED" ? (
                                                    <button className="btn ghost" type="button" onClick={() => runStaffAction("restore")} disabled={loading}>
                                                        <Icon name="unarchive" />
                                                        Bỏ lưu trữ
                                                    </button>
                                                ) : (
                                                    <button className="btn ghost" type="button" onClick={() => runStaffAction("archive")} disabled={loading}>
                                                        <Icon name="archive" />
                                                        Lưu trữ
                                                    </button>
                                                )}
                                                <button className="btn danger" type="button" onClick={() => runStaffAction("delete")} disabled={loading}>
                                                    <Icon name="delete" />
                                                    Xóa
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="consultation-messages" ref={messagesRef}>
                                {loading && messages.length === 0 ? (
                                    <Empty text="Đang tải hội thoại..." />
                                ) : !activeConversation && isStaff ? (
                                    <Empty text="Chọn một cuộc tư vấn để trả lời" />
                                ) : messages.length === 0 ? (
                                    <Empty text="Hãy gửi câu hỏi đầu tiên" />
                                ) : messages.map((message) => {
                                    const isOwn = Number(message.sender_id) === Number(user.id);
                                    const senderLabel = isOwn ? "Bạn" : (message.sender_name || (message.sender_role_code === "REQUESTER" ? "Người dùng" : "Nhân viên hệ thống"));
                                    return (
                                        <div key={message.id} className={`consultation-message ${isOwn ? "own" : "other"}`}>
                                            <div className="consultation-bubble">
                                                <div className="consultation-meta">
                                                    <strong>{senderLabel}</strong>
                                                    <span>{formatDate(message.created_at)}</span>
                                                </div>
                                                <div className="consultation-content">{message.content}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <form className="consultation-form" onSubmit={send}>
                                <textarea
                                    className="input"
                                    rows="2"
                                    value={draft}
                                    onChange={(event) => setDraft(event.target.value)}
                                    placeholder={isStaff ? "Nhập phản hồi tư vấn" : "Nhập nội dung cần tư vấn"}
                                    disabled={sending || (isStaff && !activeConversation)}
                                />
                                <button className="consultation-send" type="submit" disabled={sending || !draft.trim() || (isStaff && !activeConversation)} title="Gửi">
                                    <Icon name={sending ? "hourglass_top" : "send"} />
                                </button>
                            </form>
                        </div>
                    </div>
                </section>
            )}

            <button className="consultation-chat-launcher" type="button" onClick={openWidget} title="Chat tư vấn">
                <Icon name={open ? "close" : "chat_bubble"} />
                {unreadCount > 0 && <span className="consultation-chat-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>
        </div>
    );
}
