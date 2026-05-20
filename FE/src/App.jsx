const {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    Link,
    NavLink,
    Outlet,
    useNavigate,
    useParams,
    useLocation
} = ReactRouterDOM;

const API_BASE = localStorage.getItem("appApiBase") || "http://localhost:3000/api";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const STATUS_ORDER = ["NEW", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED", "CANCELLED"];
const api = axios.create({ baseURL: API_BASE });

const AuthContext = React.createContext(null);
const ToastContext = React.createContext(null);
const ConfirmContext = React.createContext(null);

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("helpdeskToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

function App() {
    return (
        <ToastProvider>
            <ConfirmProvider>
                <AuthProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/" element={<Navigate to="/login" replace />} />
                            <Route path="/login" element={<LoginPage />} />

                            <Route element={<ProtectedRoute />}>
                                <Route path="/notifications" element={<AppLayout sharedPage="notifications"><NotificationsPage /></AppLayout>} />
                                <Route path="/profile" element={<AppLayout sharedPage="profile"><ProfileEditorPage /></AppLayout>} />

                                <Route element={<RoleRoute roles={["REQUESTER"]} />}>
                                    <Route path="/requester/dashboard" element={<AppLayout><RequesterDashboard /></AppLayout>} />
                                    <Route path="/requester/tickets" element={<AppLayout><TicketList mode="requester" /></AppLayout>} />
                                    <Route path="/requester/tickets/create" element={<AppLayout><CreateTicketPage /></AppLayout>} />
                                    <Route path="/requester/tickets/create/success" element={<AppLayout><CreateResultPage type="success" /></AppLayout>} />
                                    <Route path="/requester/tickets/create/error" element={<AppLayout><CreateResultPage type="error" /></AppLayout>} />
                                    <Route path="/requester/tickets/:id" element={<AppLayout><TicketDetailPage /></AppLayout>} />
                                    <Route path="/requester/reports" element={<AppLayout><RequesterReports /></AppLayout>} />
                                </Route>

                                <Route element={<RoleRoute roles={["SUPPORT"]} />}>
                                    <Route path="/support/dashboard" element={<AppLayout><SupportDashboard /></AppLayout>} />
                                    <Route path="/support/tickets" element={<AppLayout><TicketList mode="support" /></AppLayout>} />
                                    <Route path="/support/tickets/:id" element={<AppLayout><TicketDetailPage /></AppLayout>} />
                                    <Route path="/support/history" element={<AppLayout><SupportHistory /></AppLayout>} />
                                    <Route path="/support/reports" element={<AppLayout><SupportReports /></AppLayout>} />
                                </Route>

                                <Route element={<RoleRoute roles={["MANAGER"]} />}>
                                    <Route path="/manager/dashboard" element={<AppLayout><ManagerDashboard /></AppLayout>} />
                                    <Route path="/manager/tickets" element={<AppLayout><TicketList mode="manager" /></AppLayout>} />
                                    <Route path="/manager/tickets/:id" element={<AppLayout><TicketDetailPage /></AppLayout>} />
                                    <Route path="/manager/reports" element={<AppLayout><SystemReports /></AppLayout>} />
                                </Route>

                                <Route element={<RoleRoute roles={["ADMIN"]} />}>
                                    <Route path="/admin/dashboard" element={<AppLayout><ManagerDashboard admin /></AppLayout>} />
                                    <Route path="/admin/catalog" element={<AppLayout><AdminCatalog /></AppLayout>} />
                                    <Route path="/admin/catalog/users" element={<AppLayout><AdminUsers roleCode="REQUESTER" title="Sinh viên / Người dùng" /></AppLayout>} />
                                    <Route path="/admin/catalog/managers" element={<AppLayout><AdminUsers roleCode="MANAGER" title="Quản lý tòa" /></AppLayout>} />
                                    <Route path="/admin/catalog/staff" element={<AppLayout><AdminUsers roleCode="SUPPORT" title="Nhân viên IT" /></AppLayout>} />
                                    <Route path="/admin/catalog/departments" element={<AppLayout><AdminDepartments /></AppLayout>} />
                                    <Route path="/admin/catalog/services" element={<AppLayout><AdminServices /></AppLayout>} />
                                    <Route path="/admin/catalog/services/create" element={<AppLayout><ServiceCreatePage /></AppLayout>} />
                                    <Route path="/admin/catalog/services/:categoryId" element={<AppLayout><ServiceCategoryDetailPage /></AppLayout>} />
                                    <Route path="/admin/tickets" element={<AppLayout><TicketList mode="admin" /></AppLayout>} />
                                    <Route path="/admin/tickets/:id" element={<AppLayout><TicketDetailPage /></AppLayout>} />
                                    <Route path="/admin/reports" element={<AppLayout><SystemReports /></AppLayout>} />
                                    <Route path="/admin/permissions" element={<AppLayout><PermissionsPage /></AppLayout>} />
                                    <Route path="/admin/permissions/create-user" element={<AppLayout><CreateUserPage /></AppLayout>} />
                                    <Route path="/admin/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
                                </Route>
                            </Route>

                            <Route path="*" element={<Navigate to="/login" replace />} />
                        </Routes>
                    </BrowserRouter>
                </AuthProvider>
            </ConfirmProvider>
        </ToastProvider>
    );
}

function AuthProvider({ children }) {
    const [token, setToken] = React.useState(localStorage.getItem("helpdeskToken") || "");
    const [user, setUser] = React.useState(() => {
        try {
            return JSON.parse(localStorage.getItem("helpdeskUser") || "null");
        } catch {
            return null;
        }
    });

    const login = async (email, password) => {
        const { data } = await api.post("/auth/login", { email, password });
        localStorage.setItem("helpdeskToken", data.data.token);
        localStorage.setItem("helpdeskUser", JSON.stringify(data.data.user));
        setToken(data.data.token);
        setUser(data.data.user);
        return data.data.user;
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } catch {
            // Logout is local even when the token is already invalid.
        }
        localStorage.removeItem("helpdeskToken");
        localStorage.removeItem("helpdeskUser");
        setToken("");
        setUser(null);
    };

    const refreshProfile = async () => {
        const { data } = await api.get("/auth/profile");
        localStorage.setItem("helpdeskUser", JSON.stringify(data.data));
        setUser(data.data);
        return data.data;
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

function useAuth() {
    return React.useContext(AuthContext);
}

function ToastProvider({ children }) {
    const [toasts, setToasts] = React.useState([]);
    const push = (message, type = "success") => {
        const id = Date.now() + Math.random();
        setToasts((items) => [...items, { id, message, type }]);
        setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4200);
    };

    return (
        <ToastContext.Provider value={push}>
            {children}
            <div className="toast-stack">
                {toasts.map((toast) => <div key={toast.id} className={`toast ${toast.type}`}>{toast.message}</div>)}
            </div>
        </ToastContext.Provider>
    );
}

function useToast() {
    return React.useContext(ToastContext);
}

function ConfirmProvider({ children }) {
    const [options, setOptions] = React.useState(null);
    const confirm = (nextOptions) => new Promise((resolve) => {
        setOptions({
            title: "Xác nhận thao tác",
            message: "Bạn chắc chắn muốn tiếp tục?",
            confirmText: "Xác nhận",
            cancelText: "Hủy",
            ...nextOptions,
            resolve
        });
    });

    const close = (result) => {
        options?.resolve(result);
        setOptions(null);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {options && (
                <div className="modal-backdrop">
                    <div className="modal">
                        <h3 style={{ marginTop: 0 }}>{options.title}</h3>
                        <p className="muted">{options.message}</p>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                            <button className="btn ghost" onClick={() => close(false)}>{options.cancelText}</button>
                            <button className="btn primary" onClick={() => close(true)}>{options.confirmText}</button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

function useConfirm() {
    return React.useContext(ConfirmContext);
}

function ProtectedRoute() {
    const { token } = useAuth();
    if (!token) return <Navigate to="/login" replace />;
    return <Outlet />;
}

function RoleRoute({ roles }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (!roles.includes(user.role_code)) return <Navigate to={dashboardPath(user.role_code)} replace />;
    return <Outlet />;
}

function dashboardPath(roleCode) {
    const map = {
        REQUESTER: "/requester/dashboard",
        SUPPORT: "/support/dashboard",
        MANAGER: "/manager/dashboard",
        ADMIN: "/admin/dashboard"
    };
    return map[roleCode] || "/login";
}

const roleMenus = {
    REQUESTER: [
        { label: "Bảng điều khiển cá nhân", icon: "dashboard", to: "/requester/dashboard" },
        { label: "Tạo yêu cầu", icon: "add_circle", to: "/requester/tickets/create" },
        { label: "Yêu cầu của tôi", icon: "confirmation_number", to: "/requester/tickets" },
        { label: "Báo cáo cá nhân", icon: "bar_chart", to: "/requester/reports" }
    ],
    SUPPORT: [
        { label: "Bảng điều khiển nhân viên", icon: "dashboard", to: "/support/dashboard" },
        { label: "Yêu cầu được giao", icon: "assignment", to: "/support/tickets" },
        { label: "Lịch sử xử lý", icon: "history", to: "/support/history" },
        { label: "Hiệu suất cá nhân", icon: "bar_chart", to: "/support/reports" }
    ],
    MANAGER: [
        { label: "Bảng điều khiển quản lý", icon: "dashboard", to: "/manager/dashboard" },
        { label: "Quản lý yêu cầu", icon: "assignment_turned_in", to: "/manager/tickets" },
        { label: "Báo cáo thống kê", icon: "bar_chart", to: "/manager/reports" }
    ],
    ADMIN: [
        { label: "Bảng điều khiển quản trị", icon: "dashboard", to: "/admin/dashboard" },
        { label: "Danh mục và người dùng", icon: "category", to: "/admin/catalog" },
        { label: "Quản lý yêu cầu", icon: "assignment_turned_in", to: "/admin/tickets" },
        { label: "Báo cáo thống kê", icon: "bar_chart", to: "/admin/reports" },
        { label: "Phân quyền", icon: "security", to: "/admin/permissions" },
        { label: "Cấu hình hệ thống", icon: "settings", to: "/admin/settings" }
    ]
};

function AppLayout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const menu = roleMenus[user?.role_code] || [];

    const handleLogout = async () => {
        await logout();
        navigate("/login", { replace: true });
    };

    const isMenuActive = (item) => {
        const pathname = location.pathname;

        if (item.to === "/requester/tickets/create") {
            return [
                "/requester/tickets/create",
                "/requester/tickets/create/success",
                "/requester/tickets/create/error"
            ].includes(pathname);
        }

        if (item.to === "/requester/tickets") {
            return pathname === "/requester/tickets" || (pathname !== "/requester/tickets/create" && /^\/requester\/tickets\/[^/]+$/.test(pathname));
        }

        return pathname === item.to || pathname.startsWith(`${item.to}/`);
    };

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="brand">
                    <div className="brand-mark">UTC</div>
                    <div>
                        <div className="brand-title">UTC IT Helpdesk</div>
                        <div className="brand-subtitle">{roleName(user?.role_code)}</div>
                    </div>
                </div>
                <nav className="nav-list">
                    {menu.map((item) => (
                        <Link key={item.to} to={item.to} className={`nav-link ${isMenuActive(item) ? "active" : ""}`}>
                            <span className="material-symbols-outlined">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div className="sidebar-footer nav-list">
                    <NavLink to="/notifications" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                        <span className="material-symbols-outlined">notifications</span>
                        Thông báo
                    </NavLink>
                    <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                        <span className="material-symbols-outlined">person</span>
                        Hồ sơ
                    </NavLink>
                    <button className="nav-link" onClick={handleLogout} style={{ border: 0, width: "100%" }}>
                        <span className="material-symbols-outlined">logout</span>
                        Đăng xuất
                    </button>
                </div>
            </aside>
            <div className="main">
                <header className="topbar">
                    <div className="topbar-user">
                        <Avatar user={user} size="sm" />
                        <div>
                        <strong>{user?.full_name || "Người dùng"}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>{user?.email}</div>
                        </div>
                    </div>
                    <div className="badge primary">{roleName(user?.role_code)}</div>
                </header>
                <main className="content">{children}</main>
            </div>
        </div>
    );
}

function LoginPage() {
    const { login } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [form, setForm] = React.useState({ email: "", password: "" });
    const [loading, setLoading] = React.useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            const user = await login(form.email, form.password);
            toast("Đăng nhập thành công", "success");
            navigate(dashboardPath(user.role_code), { replace: true });
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <section className="login-visual">
                <div>
                    <div className="brand-mark" style={{ width: 72, height: 72, marginBottom: 24 }}>UTC</div>
                    <h1 style={{ fontSize: 42, lineHeight: "52px", margin: 0 }}>Hệ thống quản lý yêu cầu hỗ trợ CNTT</h1>
                    <p style={{ fontSize: 18, lineHeight: "28px", maxWidth: 560 }}>
                        Sản phẩm nội bộ cho Trường Đại học Giao thông Vận tải: tiếp nhận tập trung, phân công rõ ràng, xử lý theo SLA.
                    </p>
                </div>
            </section>
            <section className="login-panel">
                <form className="login-card form" onSubmit={submit}>
                    <div>
                        <h2 className="page-title">Đăng nhập</h2>
                    </div>
                    <Field label="Tài khoản / Email">
                        <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Nhập email của bạn" />
                    </Field>
                    <Field label="Mật khẩu">
                        <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Nhập mật khẩu" />
                    </Field>
                    <button className="btn primary" disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
                    <div className="card" style={{ fontSize: 13 }}>
                        <strong>Lưu ý: Để đăng nhập</strong>
                        <ol style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                            <li>Đối với cán bộ - giảng viên sử dụng tài khoản u-smart.</li>
                            <li>Đối với sinh viên sử dụng tài khoản Office365 theo cấu trúc [Tên sinh viên][Mã sinh viên]@lms.utc.edu.vn.</li>
                        </ol>
                    </div>
                </form>
            </section>
        </div>
    );
}

function Field({ label, children }) {
    return <label className="field"><span>{label}</span>{children}</label>;
}

function PageHeader({ title, subtitle, action }) {
    return (
        <div className="toolbar">
            <div>
                <h1 className="page-title">{title}</h1>
                {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

function RequesterDashboard() {
    const { data: tickets } = useApi("/tickets/my", []);

    return (
        <>
            <PageHeader title="Bảng điều khiển cá nhân" subtitle="Theo dõi các yêu cầu hỗ trợ của bạn." action={<Link className="btn primary" to="/requester/tickets/create"><Icon name="add" />Tạo yêu cầu</Link>} />
            <TicketStatusFilter tickets={tickets} title="Yêu cầu theo trạng thái" pageSize={5} />
        </>
    );
}

function SupportDashboard() {
    const { data: tickets } = useApi("/tickets/assigned-to-me", []);
    return (
        <>
            <PageHeader title="Bảng điều khiển nhân viên IT" subtitle="Yêu cầu được giao và hiệu suất xử lý cá nhân." />
            <TicketStatusFilter tickets={tickets} title="Yêu cầu được giao theo trạng thái" pageSize={5} />
        </>
    );
}

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

function Stats({ values }) {
    return (
        <div className="grid cols-4" style={{ marginBottom: 22 }}>
            {values.map(([label, value]) => (
                <div key={label} className="card">
                    <p className="stat-label">{label}</p>
                    <p className="stat-value">{value}</p>
                </div>
            ))}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <section className="card" style={{ marginBottom: 18 }}>
            <h2 style={{ marginTop: 0 }}>{title}</h2>
            {children}
        </section>
    );
}

function usePagination(items, initialPageSize = DEFAULT_PAGE_SIZE) {
    const safeItems = Array.isArray(items) ? items : [];
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSizeValue] = React.useState(initialPageSize);
    const totalItems = safeItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = (safePage - 1) * pageSize;

    React.useEffect(() => {
        setPage((current) => Math.min(Math.max(current, 1), totalPages));
    }, [totalPages]);

    const setPageSize = (value) => {
        setPageSizeValue(Number(value) || initialPageSize);
        setPage(1);
    };

    return {
        items: safeItems.slice(startIndex, startIndex + pageSize),
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
        start: totalItems ? startIndex + 1 : 0,
        end: Math.min(startIndex + pageSize, totalItems),
        setPage,
        setPageSize
    };
}

function Pagination({ page, pageSize, totalItems, totalPages, start, end, setPage, setPageSize, label = "mục" }) {
    if (totalItems <= pageSize && totalPages <= 1) return null;
    const sizeOptions = PAGE_SIZE_OPTIONS.includes(pageSize)
        ? PAGE_SIZE_OPTIONS
        : [...PAGE_SIZE_OPTIONS, pageSize].sort((left, right) => left - right);

    return (
        <div className="pagination">
            <div className="pagination-info">
                Hiển thị {start}-{end} / {totalItems} {label}
            </div>
            <div className="pagination-controls">
                <label className="pagination-size">
                    <span>Số dòng</span>
                    <select className="select compact" value={pageSize} onChange={(event) => setPageSize(event.target.value)}>
                        {sizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                </label>
                <button className="btn ghost icon-btn" type="button" disabled={page <= 1} onClick={() => setPage(1)} aria-label="Trang đầu">
                    <Icon name="first_page" />
                </button>
                <button className="btn ghost icon-btn" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Trang trước">
                    <Icon name="chevron_left" />
                </button>
                <span className="pagination-page">Trang {page}/{totalPages}</span>
                <button className="btn ghost icon-btn" type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Trang sau">
                    <Icon name="chevron_right" />
                </button>
                <button className="btn ghost icon-btn" type="button" disabled={page >= totalPages} onClick={() => setPage(totalPages)} aria-label="Trang cuối">
                    <Icon name="last_page" />
                </button>
            </div>
        </div>
    );
}

function PaginatedGrid({ items, pageSize, label, emptyText, className = "grid", children }) {
    const pagination = usePagination(items, pageSize);

    if (!pagination.totalItems) return <Empty text={emptyText} />;

    return (
        <>
            <div className={className}>
                {pagination.items.map(children)}
            </div>
            <Pagination {...pagination} label={label} />
        </>
    );
}

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

function clearInputValidity(event) {
    event.target.setCustomValidity("");
}

function setInputValidityMessage(message) {
    return (event) => {
        event.target.setCustomValidity(message);
    };
}

function CreateTicketPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const { data: services } = useApi("/services", []);
    const { data: priorities } = useApi("/priorities", []);
    const { data: departments } = useApi("/catalog/departments", []);
    const [form, setForm] = React.useState({ title: "", description: "", departmentId: "", room: "", serviceId: "", priorityId: "" });
    const [files, setFiles] = React.useState([]);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (services[0] && !form.serviceId) setForm((state) => ({ ...state, serviceId: services[0].id }));
    }, [services]);
    React.useEffect(() => {
        const medium = priorities.find((item) => item.code === "P3") || priorities[0];
        if (medium && !form.priorityId) setForm((state) => ({ ...state, priorityId: medium.id }));
    }, [priorities]);
    React.useEffect(() => {
        if (departments[0] && !form.departmentId) setForm((state) => ({ ...state, departmentId: departments[0].id }));
    }, [departments]);

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post("/tickets", form);
            const ticketId = data.data.id;

            for (const file of files) {
                const attachment = new FormData();
                attachment.append("file", file);
                await api.post(`/tickets/${ticketId}/attachments`, attachment, { headers: { "Content-Type": "multipart/form-data" } });
            }

            toast(files.length ? "Tạo yêu cầu và tải file thành công" : "Tạo yêu cầu thành công", "success");
            navigate(`/requester/tickets/create/success?id=${ticketId}`);
        } catch (error) {
            toast(errorMessage(error), "error");
            navigate("/requester/tickets/create/error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <PageHeader title="Tạo yêu cầu hỗ trợ" subtitle="Gợi ý: lỗi Wi-Fi, máy chiếu, tài khoản, phần mềm." />
            <form className="card form" onSubmit={submit}>
                <Field label="Tiêu đề">
                    <input className="input" value={form.title} onChange={(e) => { clearInputValidity(e); setForm({ ...form, title: e.target.value }); }} onInvalid={setInputValidityMessage("Vui lòng nhập tiêu đề yêu cầu")} placeholder="Lỗi Wi-Fi tại phòng học A2" required />
                </Field>
                <Field label="Tòa/khu">
                    <select className="select" value={form.departmentId} onChange={(e) => { clearInputValidity(e); setForm({ ...form, departmentId: e.target.value }); }} onInvalid={setInputValidityMessage("Vui lòng chọn tòa/khu cần hỗ trợ")} required>
                        {departments.map((department) => <option key={department.id} value={department.id}>{department.code} - {department.name}</option>)}
                    </select>
                </Field>
                <Field label="Phòng cần hỗ trợ">
                    <input className="input" value={form.room} onChange={(e) => { clearInputValidity(e); setForm({ ...form, room: e.target.value }); }} onInvalid={setInputValidityMessage("Vui lòng nhập số phòng cụ thể, ví dụ: 302")} placeholder="Ví dụ: 302" maxLength={60} pattern=".*[0-9].*" required />
                </Field>
                <Field label="Dịch vụ">
                    <select className="select" value={form.serviceId} onChange={(e) => { clearInputValidity(e); setForm({ ...form, serviceId: e.target.value }); }} onInvalid={setInputValidityMessage("Vui lòng chọn dịch vụ cần hỗ trợ")} required>
                        {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                    </select>
                </Field>
                <Field label="Mức ưu tiên">
                    <select className="select" value={form.priorityId} onChange={(e) => { clearInputValidity(e); setForm({ ...form, priorityId: e.target.value }); }} onInvalid={setInputValidityMessage("Vui lòng chọn mức ưu tiên")} required>
                        {priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
                    </select>
                </Field>
                <Field label="Mô tả chi tiết">
                    <textarea
                        className="textarea"
                        value={form.description}
                        onChange={(e) => {
                            clearInputValidity(e);
                            setForm({ ...form, description: e.target.value });
                        }}
                        onInvalid={setInputValidityMessage("Vui lòng mô tả sự cố")}
                        placeholder="Mô tả hiện tượng, vị trí, thời gian xảy ra..."
                        required
                    />
                </Field>
                <Field label="Ảnh/file minh chứng">
                    <input className="input" type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,image/jpeg,image/png" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                </Field>
                {files.length > 0 && (
                    <div className="attachment-grid">
                        {files.map((file, index) => (
                            <LocalFilePreview key={`${file.name}-${index}`} file={file} />
                        ))}
                    </div>
                )}
                <button className="btn primary" disabled={loading || !departments.length}>{loading ? "Đang gửi..." : "Gửi yêu cầu"}</button>
            </form>
        </>
    );
}

function CreateResultPage({ type }) {
    const id = new URLSearchParams(useLocation().search).get("id");
    return (
        <div className="card" style={{ maxWidth: 720 }}>
            <Badge value={type === "success" ? "Thành công" : "Thất bại"} type={type === "success" ? "success" : "danger"} />
            <h1>{type === "success" ? "Tạo yêu cầu thành công" : "Gửi yêu cầu thất bại"}</h1>
            <p className="muted">{type === "success" ? `Mã yêu cầu đã tạo: ${id || "vừa tạo"}.` : "Hãy kiểm tra dữ liệu hoặc thử lại sau."}</p>
            <Link className="btn primary" to={type === "success" && id ? `/requester/tickets/${id}` : "/requester/tickets/create"}>{type === "success" ? "Xem yêu cầu" : "Tạo lại"}</Link>
        </div>
    );
}

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
                        ["Nhân viên xử lý", ticket.assigned_to_name || "Chưa phân công"],
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
        return (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                {["ASSIGNED", "WAITING_FOR_USER"].includes(ticket.status_code) && <button className="btn primary" disabled={loading} onClick={() => run("Đã tiếp nhận yêu cầu", () => api.put(`/tickets/${ticket.id}/start`))}>Tiếp nhận</button>}
                {ticket.status_code === "IN_PROGRESS" && <button className="btn ghost" disabled={loading} onClick={() => run("Đã chuyển sang chờ người dùng", () => api.put(`/tickets/${ticket.id}/status`, { statusCode: "WAITING_FOR_USER", note: "Cần người dùng bổ sung thông tin" }))}>Chờ người dùng bổ sung</button>}
                {ticket.status_code === "IN_PROGRESS" && <button className="btn primary" disabled={loading} onClick={() => run("Đã hoàn tất xử lý", () => api.put(`/tickets/${ticket.id}/resolve`, { resolution: "Nhân viên IT đã xử lý xong" }))}>Hoàn tất xử lý</button>}
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

function ManagerTicketPanel({ ticket, refresh }) {
    const toast = useToast();
    const confirm = useConfirm();
    const supportUsersPath = `/support-users${ticket.room ? `?room=${encodeURIComponent(ticket.room)}` : ""}`;
    const { data: supportUsers } = useApi(supportUsersPath, []);
    const { data: priorities } = useApi("/priorities", []);
    const [supportId, setSupportId] = React.useState("");
    const [priorityId, setPriorityId] = React.useState(ticket.priority_id || "");

    const assign = async () => {
        if (!supportId) return toast("Chọn nhân viên IT trước", "error");
        const ok = await confirm({ title: "Phân công yêu cầu", message: "Xác nhận phân công/tái phân công yêu cầu này?" });
        if (!ok) return;
        await api.put(`/tickets/${ticket.id}/${ticket.assigned_to ? "reassign" : "assign"}`, { supportId });
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
            <div className="form-grid">
                <Field label="Nhân viên IT">
                    <select className="select" value={supportId} onChange={(e) => setSupportId(e.target.value)}>
                        <option value="">Chọn nhân viên</option>
                        {supportUsers.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                    </select>
                </Field>
                <Field label="Mức ưu tiên">
                    <select className="select" value={priorityId} onChange={(e) => setPriorityId(e.target.value)}>
                        {priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
                    </select>
                </Field>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button className="btn primary" onClick={assign}>Phân công / Tái phân công</button>
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

function SupportHistory() {
    const { data: tickets } = useApi("/tickets/assigned-to-me", []);
    return (
        <>
            <PageHeader title="Lịch sử xử lý" subtitle="Các yêu cầu đã xử lý hoặc đã đóng." />
            <TicketTable tickets={tickets.filter(isClosed)} />
        </>
    );
}

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

function SystemReports() {
    const { user } = useAuth();
    const [range, setRange] = React.useState(() => reportRangeForPreset("30D"));
    const [activeTab, setActiveTab] = React.useState("overview");
    const reportQuery = React.useMemo(() => reportQueryString(range), [range]);
    const { data: tickets } = useApi(`/tickets${reportQuery}`, []);
    const { data: ticketReport } = useApi(`/reports/tickets${reportQuery}`, { summary: {}, daily: [] });
    const { data: slaReport } = useApi(`/reports/sla${reportQuery}`, {});
    const { data: feedbackReport } = useApi(`/reports/feedback${reportQuery}`, []);
    const { data: supportReport } = useApi(`/reports/support-performance${reportQuery}`, []);
    const supportPagination = usePagination(supportReport, 10);
    const summary = normalizeReportSummary(ticketReport.summary, tickets);
    const sla = normalizeSlaSummary(slaReport);
    const riskTickets = tickets.filter((ticket) => isOverdue(ticket) || isLateResolved(ticket));

    return (
        <>
            <PageHeader
                title="Báo cáo thống kê hệ thống"
                subtitle={user.role_code === "MANAGER" ? "Dữ liệu giới hạn theo khu/tòa bạn phụ trách." : "Dữ liệu toàn hệ thống cho quản trị."}
            />
            <ReportPeriodFilter range={range} onChange={setRange} />
            <ReportStats items={[
                { label: "Tổng yêu cầu", value: summary.total, icon: "confirmation_number" },
                { label: "Đang mở", value: summary.open, helper: `${summary.overdue} quá hạn`, icon: "pending_actions" },
                { label: "Đã đóng", value: summary.closed, helper: `${summary.cancelled} đã hủy`, icon: "task_alt" },
                { label: "SLA đúng hạn", value: formatPercent(sla.onTimePercent), helper: `${sla.onTime}/${sla.resolved} đã xử lý`, icon: "timer" },
                { label: "TB xử lý", value: formatMinutes(summary.avgResolutionMinutes), icon: "schedule" },
                { label: "Đánh giá TB", value: summary.avgRating || "-", helper: `${summary.feedbackCount} phản hồi`, icon: "star" }
            ]} />
            <ReportTabs
                active={activeTab}
                onChange={setActiveTab}
                tabs={[
                    { value: "overview", label: "Tổng quan", icon: "insights" },
                    { value: "sla", label: "SLA", icon: "timer" },
                    { value: "support", label: "Nhân viên IT", icon: "support_agent" },
                    { value: "services", label: "Dịch vụ", icon: "category" },
                    { value: "feedback", label: "Phản hồi", icon: "reviews" }
                ]}
            />
            {activeTab === "overview" && (
                <div className="grid cols-2">
                    <Section title="Xu hướng yêu cầu theo ngày">
                        <ReportBarList items={dailyRowsFromApi(ticketReport.daily, tickets)} emptyText="Chưa có yêu cầu trong kỳ" pageSize={10} label="ngày" />
                    </Section>
                    <Section title="Yêu cầu theo trạng thái">
                        <ReportBarList items={statusReportRows(tickets)} />
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
                    <Section title="Yêu cầu vi phạm hoặc có nguy cơ">
                        <TicketTable tickets={riskTickets} pageSize={5} />
                    </Section>
                </div>
            )}
            {activeTab === "support" && (
                <Section title="Hiệu suất nhân viên IT">
                    <ReportTable
                        rows={supportPagination.items}
                        getKey={(row) => row.support_id}
                        columns={[
                            { key: "support_name", label: "Nhân viên" },
                            { key: "assigned_tickets", label: "Được giao", render: (row) => row.assigned_tickets || 0 },
                            { key: "closed_tickets", label: "Đã đóng", render: (row) => row.closed_tickets || 0 },
                            { key: "open_tickets", label: "Đang mở", render: (row) => row.open_tickets || 0 },
                            { key: "overdue_tickets", label: "Quá hạn", render: (row) => row.overdue_tickets || 0 },
                            { key: "avg_response_minutes", label: "TB phản hồi", render: (row) => formatMinutes(row.avg_response_minutes) },
                            { key: "avg_resolution_minutes", label: "TB xử lý", render: (row) => formatMinutes(row.avg_resolution_minutes) },
                            { key: "avg_rating", label: "Đánh giá", render: (row) => row.avg_rating || "-" }
                        ]}
                    />
                    <Pagination {...supportPagination} label="nhân viên" />
                </Section>
            )}
            {activeTab === "services" && (
                <div className="grid cols-2">
                    <Section title="Dịch vụ phát sinh nhiều">
                        <ReportBarList items={serviceReportRows(tickets)} emptyText="Chưa có dữ liệu dịch vụ" pageSize={8} label="dịch vụ" />
                    </Section>
                    <Section title="Mức ưu tiên">
                        <ReportBarList items={priorityReportRows(tickets)} emptyText="Chưa có dữ liệu ưu tiên" />
                    </Section>
                </div>
            )}
            {activeTab === "feedback" && (
                <div className="grid cols-2">
                    <Section title="Phân bố đánh giá">
                        <ReportBarList items={feedbackRowsFromApi(feedbackReport, tickets)} emptyText="Chưa có phản hồi trong kỳ" />
                    </Section>
                    <Section title="Yêu cầu đánh giá thấp">
                        <LowFeedbackRequests tickets={tickets} />
                    </Section>
                </div>
            )}
        </>
    );
}

function AdminCatalog() {
    const cards = [
        { label: "Sinh viên / Người dùng", icon: "person", to: "/admin/catalog/users", description: "Quản lý tài khoản người gửi yêu cầu." },
        { label: "Quản lý tòa", icon: "supervisor_account", to: "/admin/catalog/managers", description: "Gán mỗi quản lý phụ trách một tòa." },
        { label: "Nhân viên IT", icon: "support_agent", to: "/admin/catalog/staff", description: "Quản lý tài khoản nhân viên xử lý." },
        { label: "Phòng ban", icon: "domain", to: "/admin/catalog/departments", description: "Quản lý khu/tòa như A2, A3, A7." },
        { label: "Dịch vụ", icon: "category", to: "/admin/catalog/services", description: "Quản lý nhóm dịch vụ và hạng mục hỗ trợ." }
    ];
    return (
        <>
            <PageHeader title="Danh mục và người dùng" subtitle="Quản lý người dùng, khu/tòa và các danh mục hỗ trợ." />
            <div className="grid cols-4">
                {cards.map(({ label, icon, to, description }) => (
                    <Link key={to} className="card" to={to}>
                        <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 34 }}>{icon}</span>
                        <h3>{label}</h3>
                        <p className="muted">{description}</p>
                    </Link>
                ))}
            </div>
        </>
    );
}

function AdminDepartments() {
    const { data: departments, refresh } = useApi("/departments", []);
    const toast = useToast();
    const confirm = useConfirm();
    const [formOpen, setFormOpen] = React.useState(false);
    const [editingDepartment, setEditingDepartment] = React.useState(null);
    const [form, setForm] = React.useState({ name: "", code: "", description: "", isActive: true });
    const [saving, setSaving] = React.useState(false);
    const pagination = usePagination(departments, 10);

    const openCreate = () => {
        setEditingDepartment(null);
        setForm({ name: "", code: "", description: "", isActive: true });
        setFormOpen(true);
    };

    const openEdit = (department) => {
        setEditingDepartment(department);
        setForm({
            name: department.name || "",
            code: department.code || "",
            description: department.description || "",
            isActive: Number(department.is_active) === 1
        });
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingDepartment(null);
        setForm({ name: "", code: "", description: "", isActive: true });
    };

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                code: form.code
            };
            if (editingDepartment) {
                await api.put(`/departments/${editingDepartment.id}`, payload);
                toast("Cập nhật phòng ban thành công", "success");
            } else {
                await api.post("/departments", { ...payload, isActive: true });
                toast("Tạo phòng ban thành công", "success");
            }
            await refresh();
            closeForm();
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setSaving(false);
        }
    };

    const deleteDepartment = async (department) => {
        const ok = await confirm({
            title: "Xóa phòng ban",
            message: `Xác nhận vô hiệu hóa ${department.name}?`,
            confirmText: "Xóa"
        });
        if (!ok) return;
        try {
            await api.delete(`/departments/${department.id}`);
            toast("Đã vô hiệu hóa phòng ban", "success");
            refresh();
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };

    return (
        <>
            <PageHeader
                title="Phòng ban"
                subtitle="Quản lý các khu/tòa dùng khi phân loại người dùng và địa điểm hỗ trợ."
                action={<button className="btn primary" type="button" onClick={openCreate}><Icon name="add" />Thêm phòng ban</button>}
            />
            {pagination.totalItems ? (
                <>
                    <div className="card table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Mã</th>
                                    <th>Tên phòng ban</th>
                                    <th>Mô tả</th>
                                    <th>Trạng thái</th>
                                    <th>Cập nhật</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagination.items.map((department) => (
                                    <tr key={department.id}>
                                        <td><strong>{department.code}</strong></td>
                                        <td>{department.name}</td>
                                        <td>{department.description || "-"}</td>
                                        <td><Badge value={Number(department.is_active) === 1 ? "ACTIVE" : "INACTIVE"} type={Number(department.is_active) === 1 ? "success" : "danger"} /></td>
                                        <td>{formatDate(department.updated_at || department.created_at)}</td>
                                        <td>
                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                <button className="btn ghost" type="button" onClick={() => openEdit(department)}><Icon name="edit" />Sửa</button>
                                                <button className="btn danger" type="button" onClick={() => deleteDepartment(department)}><Icon name="delete" />Xóa</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination {...pagination} label="phòng ban" />
                </>
            ) : (
                <div className="card"><Empty text="Chưa có phòng ban" /></div>
            )}
            {formOpen && (
                <div className="modal-backdrop">
                    <form className="modal form" onSubmit={submit}>
                        <div>
                            <h3 style={{ margin: 0 }}>{editingDepartment ? "Sửa phòng ban" : "Thêm phòng ban"}</h3>
                            <p className="muted" style={{ margin: "6px 0 0" }}>Có thể dùng cho các tòa như A2, A3, A7 hoặc khu vực cần quản lý.</p>
                        </div>
                        <Field label="Tên phòng ban">
                            <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Tòa A2" required />
                        </Field>
                        <Field label="Mã tòa">
                            <input className="input" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="A2" required />
                        </Field>
                        <Field label="Mô tả">
                            <textarea className="textarea" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Các phòng học, phòng máy hoặc khu vực thuộc tòa này" />
                        </Field>
                        {editingDepartment && (
                            <Field label="Trạng thái">
                                <select className="select" value={String(form.isActive)} onChange={(event) => setForm({ ...form, isActive: event.target.value === "true" })}>
                                    <option value="true">Hoạt động</option>
                                    <option value="false">Vô hiệu hóa</option>
                                </select>
                            </Field>
                        )}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button className="btn ghost" type="button" onClick={closeForm} disabled={saving}>Đóng</button>
                            <button className="btn primary" disabled={saving}>{saving ? "Đang lưu..." : editingDepartment ? "Lưu thay đổi" : "Lưu phòng ban"}</button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}

function AdminUsers({ roleCode, title }) {
    const { data: users, refresh } = useApi(`/users?roleCode=${roleCode}`, []);
    const { data: departments } = useApi("/departments", []);
    const toast = useToast();
    const confirm = useConfirm();
    const [departmentUser, setDepartmentUser] = React.useState(null);
    const [editingUser, setEditingUser] = React.useState(null);
    const [selectedDepartments, setSelectedDepartments] = React.useState([]);
    const [savingDepartments, setSavingDepartments] = React.useState(false);
    const canAssignDepartments = ["MANAGER", "SUPPORT"].includes(roleCode);

    const setStatus = async (user, status) => {
        const ok = await confirm({ title: status === "LOCKED" ? "Khóa tài khoản" : "Mở khóa tài khoản", message: `Xác nhận cập nhật ${user.full_name}?` });
        if (!ok) return;
        await api.put(`/users/${user.id}/status`, { status });
        toast("Cập nhật tài khoản thành công", "success");
        refresh();
    };

    const assignedDepartmentIds = (user) => String(user.assigned_department_ids || user.department_id || "")
        .split(",")
        .map((value) => Number(value))
        .filter(Boolean);

    const openDepartmentAssign = (user) => {
        setDepartmentUser(user);
        setSelectedDepartments(assignedDepartmentIds(user));
    };

    const toggleDepartment = (departmentId) => {
        setSelectedDepartments((items) => (
            items.includes(departmentId)
                ? items.filter((item) => item !== departmentId)
                : [...items, departmentId]
        ));
    };

    const saveDepartmentAssign = async (event) => {
        event.preventDefault();
        if (!departmentUser) return;
        setSavingDepartments(true);
        try {
            await api.put(`/users/${departmentUser.id}/departments`, { departmentIds: selectedDepartments });
            toast("Cập nhật phân công tòa thành công", "success");
            setDepartmentUser(null);
            setSelectedDepartments([]);
            refresh();
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setSavingDepartments(false);
        }
    };

    const deleteUser = async (user) => {
        const ok = await confirm({
            title: "Xóa người dùng",
            message: `Xác nhận xóa vĩnh viễn tài khoản ${user.full_name} khỏi database?`,
            confirmText: "Xóa"
        });
        if (!ok) return;
        try {
            await api.delete(`/users/${user.id}`);
            toast("Đã xóa người dùng", "success");
            refresh();
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };

    return (
        <>
            <PageHeader title={title} action={<Link className="btn primary" to="/admin/permissions/create-user"><Icon name="add" />Thêm người dùng</Link>} />
            <UserTable
                users={users}
                onStatus={setStatus}
                onEdit={setEditingUser}
                onDelete={deleteUser}
                onDepartmentAssign={canAssignDepartments ? openDepartmentAssign : null}
            />
            {departmentUser && (
                <div className="modal-backdrop">
                    <form className="modal form" onSubmit={saveDepartmentAssign}>
                        <div>
                            <h3 style={{ margin: 0 }}>Phân công tòa</h3>
                            <p className="muted" style={{ margin: "6px 0 0" }}>{departmentUser.full_name}</p>
                        </div>
                        <Field label={roleCode === "MANAGER" ? "Tòa quản lý" : "Tòa hỗ trợ"}>
                            <DepartmentPicker
                                departments={departments}
                                selectedIds={selectedDepartments}
                                onToggle={toggleDepartment}
                            />
                        </Field>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button className="btn ghost" type="button" onClick={() => setDepartmentUser(null)} disabled={savingDepartments}>Đóng</button>
                            <button className="btn primary" disabled={savingDepartments}>{savingDepartments ? "Đang lưu..." : "Lưu phân công"}</button>
                        </div>
                    </form>
                </div>
            )}
            {editingUser && (
                <UserEditModal
                    user={editingUser}
                    departments={departments}
                    onClose={() => setEditingUser(null)}
                    onSaved={() => {
                        setEditingUser(null);
                        refresh();
                    }}
                />
            )}
        </>
    );
}

function UserTable({ users, roles = [], onStatus, onRoleChange, onDepartmentAssign, onEdit, onDelete }) {
    const pagination = usePagination(users, 10);

    if (!pagination.totalItems) return <Empty text="Chưa có người dùng" />;

    return (
        <>
            <div className="card table-wrap">
                <table className="table">
                    <thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Phòng ban</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                    <tbody>
                        {pagination.items.map((user) => (
                            <tr key={user.id}>
                                <td>{user.full_name}</td>
                                <td>{user.email}</td>
                                <td>
                                    {roles.length > 0 && onRoleChange ? (
                                        <select className="select compact" value={user.role_id || ""} onChange={(event) => onRoleChange(user, event.target.value)}>
                                            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                                        </select>
                                    ) : roleName(user.role_code)}
                                </td>
                                <td>{user.assigned_department_names || user.department_name || "-"}</td>
                                <td><Badge value={user.status} type={user.status === "ACTIVE" ? "success" : "danger"} /></td>
                                <td>
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        {onEdit && <button className="btn ghost" type="button" onClick={() => onEdit(user)}><Icon name="edit" />Sửa</button>}
                                        {onDepartmentAssign && (
                                            <button className="btn ghost" type="button" onClick={() => onDepartmentAssign(user)}>
                                                Phân tòa
                                            </button>
                                        )}
                                        {onStatus && (
                                            <button className="btn ghost" type="button" onClick={() => onStatus(user, user.status === "ACTIVE" ? "LOCKED" : "ACTIVE")}>
                                                {user.status === "ACTIVE" ? "Khóa" : "Mở khóa"}
                                            </button>
                                        )}
                                        {onDelete && <button className="btn danger" type="button" onClick={() => onDelete(user)}><Icon name="delete" />Xóa</button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination {...pagination} label="người dùng" />
        </>
    );
}

function UserEditModal({ user, departments = [], onClose, onSaved }) {
    const toast = useToast();
    const [saving, setSaving] = React.useState(false);
    const [form, setForm] = React.useState({
        fullName: user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        departmentIds: userDepartmentIds(user)
    });

    React.useEffect(() => {
        setForm({
            fullName: user.full_name || "",
            email: user.email || "",
            phone: user.phone || "",
            departmentIds: userDepartmentIds(user)
        });
    }, [user]);

    const toggleDepartment = (departmentId) => {
        setForm((state) => ({
            ...state,
            departmentIds: state.departmentIds.includes(departmentId)
                ? state.departmentIds.filter((item) => item !== departmentId)
                : [...state.departmentIds, departmentId]
        }));
    };

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            await api.put(`/users/${user.id}`, {
                fullName: form.fullName,
                email: form.email,
                phone: form.phone
            });
            if (!sameNumberList(form.departmentIds, userDepartmentIds(user))) {
                await api.put(`/users/${user.id}/departments`, {
                    departmentIds: form.departmentIds
                });
            }
            toast("Cập nhật người dùng thành công", "success");
            onSaved();
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <form className="modal form" onSubmit={submit}>
                <div>
                    <h3 style={{ margin: 0 }}>Sửa người dùng</h3>
                    <p className="muted" style={{ margin: "6px 0 0" }}>{roleName(user.role_code)}</p>
                </div>
                <div className="form-grid">
                    <Field label="Họ tên">
                        <input className="input" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
                    </Field>
                    <Field label="Email">
                        <input className="input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
                    </Field>
                    <Field label="Số điện thoại">
                        <input className="input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Chưa cập nhật" />
                    </Field>
                    <div className="field span-2">
                        <span>Phòng ban</span>
                        <DepartmentPicker
                            departments={departments}
                            selectedIds={form.departmentIds}
                            onToggle={toggleDepartment}
                        />
                    </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button className="btn ghost" type="button" onClick={onClose} disabled={saving}>Đóng</button>
                    <button className="btn primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</button>
                </div>
            </form>
        </div>
    );
}

function DepartmentPicker({ departments = [], selectedIds = [], onToggle }) {
    if (!departments.length) return <Empty text="Chưa có phòng ban" />;

    return (
        <div className="department-picker">
            {departments.map((department) => {
                const checked = selectedIds.includes(department.id);
                return (
                    <button
                        key={department.id}
                        className={`department-choice ${checked ? "active" : ""}`}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() => onToggle(department.id)}
                    >
                        <span>
                            <strong>{department.name}</strong>
                            <small>{department.code}</small>
                        </span>
                        <span className="department-choice-dot">
                            {checked && <Icon name="check" />}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function userDepartmentIds(user) {
    const assignedIds = String(user?.assigned_department_ids || "")
        .split(",")
        .map((value) => Number(value))
        .filter(Boolean);

    if (assignedIds.length) return assignedIds;
    return user?.department_id ? [Number(user.department_id)] : [];
}

function sameNumberList(left = [], right = []) {
    const normalize = (items) => [...new Set(items.map((item) => Number(item)).filter(Boolean))].sort((a, b) => a - b);
    const normalizedLeft = normalize(left);
    const normalizedRight = normalize(right);
    return normalizedLeft.length === normalizedRight.length && normalizedLeft.every((item, index) => item === normalizedRight[index]);
}

function AdminServices() {
    const { data: categories, refresh } = useApi("/service-categories", []);
    const { data: services } = useApi("/services", []);
    const toast = useToast();
    const confirm = useConfirm();
    const [editingCategory, setEditingCategory] = React.useState(null);
    const [form, setForm] = React.useState({ name: "", code: "", description: "", isActive: true });
    const [saving, setSaving] = React.useState(false);

    const openEdit = (category) => {
        setEditingCategory(category);
        setForm({
            name: category.name || "",
            code: category.code || "",
            description: category.description || "",
            isActive: Number(category.is_active) === 1
        });
    };

    const closeEdit = () => {
        setEditingCategory(null);
        setForm({ name: "", code: "", description: "", isActive: true });
    };

    const submitEdit = async (event) => {
        event.preventDefault();
        if (!editingCategory) return;
        setSaving(true);
        try {
            await api.put(`/service-categories/${editingCategory.id}`, {
                ...form,
                code: form.code || slugCode(form.name)
            });
            toast("Cập nhật nhóm dịch vụ thành công", "success");
            await refresh();
            closeEdit();
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setSaving(false);
        }
    };

    const deleteCategory = async (category) => {
        const ok = await confirm({
            title: "Xóa nhóm dịch vụ",
            message: `Xác nhận vô hiệu hóa nhóm ${category.name}?`,
            confirmText: "Xóa"
        });
        if (!ok) return;
        try {
            await api.delete(`/service-categories/${category.id}`);
            toast("Đã vô hiệu hóa nhóm dịch vụ", "success");
            refresh();
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };

    return (
        <>
            <PageHeader title="Danh mục dịch vụ" subtitle="Chọn một nhóm để xem và quản lý các dịch vụ bên trong." action={<Link className="btn primary" to="/admin/catalog/services/create"><Icon name="add" />Thêm nhóm dịch vụ</Link>} />
            <PaginatedGrid items={categories} pageSize={6} label="nhóm dịch vụ" emptyText="Chưa có nhóm dịch vụ" className="grid cols-3">
                {(category) => (
                    <ServiceCategoryCard key={category.id} category={category} services={services} onEdit={openEdit} onDelete={deleteCategory} />
                )}
            </PaginatedGrid>
            {editingCategory && (
                <div className="modal-backdrop">
                    <form className="modal form" onSubmit={submitEdit}>
                        <div>
                            <h3 style={{ margin: 0 }}>Sửa nhóm dịch vụ</h3>
                            <p className="muted" style={{ margin: "6px 0 0" }}>Cập nhật thông tin nhóm đang chứa các dịch vụ bên trong.</p>
                        </div>
                        <Field label="Tên nhóm">
                            <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                        </Field>
                        <Field label="Mã nhóm">
                            <input className="input" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="Tự tạo nếu để trống" />
                        </Field>
                        <Field label="Mô tả">
                            <textarea className="textarea" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                        </Field>
                        <Field label="Trạng thái">
                            <select className="select" value={String(form.isActive)} onChange={(event) => setForm({ ...form, isActive: event.target.value === "true" })}>
                                <option value="true">Hoạt động</option>
                                <option value="false">Vô hiệu hóa</option>
                            </select>
                        </Field>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button className="btn ghost" type="button" onClick={closeEdit} disabled={saving}>Đóng</button>
                            <button className="btn primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}

function ServiceCategoryCard({ category, services, onEdit, onDelete }) {
    const categoryServices = services.filter((service) => service.category_id === category.id);

    return (
        <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 34 }}>folder</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Badge value={`${categoryServices.length} dịch vụ`} type="primary" />
                    <Badge value={Number(category.is_active) === 1 ? "ACTIVE" : "INACTIVE"} type={Number(category.is_active) === 1 ? "success" : "danger"} />
                </div>
            </div>
            <h3>{category.name}</h3>
            <p className="muted">{category.description || "Chưa có mô tả"}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link className="btn ghost" to={`/admin/catalog/services/${category.id}`}>Xem dịch vụ</Link>
                {onEdit && <button className="btn ghost" type="button" onClick={() => onEdit(category)}><Icon name="edit" />Sửa</button>}
                {onDelete && <button className="btn danger" type="button" onClick={() => onDelete(category)}><Icon name="delete" />Xóa</button>}
            </div>
        </div>
    );
}

function ServiceCategoryDetailPage() {
    const { categoryId } = useParams();
    const toast = useToast();
    const confirm = useConfirm();
    const { data: categories } = useApi("/service-categories", []);
    const { data: services, refresh } = useApi("/services", []);
    const category = categories.find((item) => Number(item.id) === Number(categoryId));
    const categoryServices = services.filter((service) => Number(service.category_id) === Number(categoryId));
    const pagination = usePagination(categoryServices, 10);
    const [formOpen, setFormOpen] = React.useState(false);
    const [editingService, setEditingService] = React.useState(null);
    const [form, setForm] = React.useState({ name: "", code: "", description: "", isActive: true });
    const [saving, setSaving] = React.useState(false);

    const openCreate = () => {
        setEditingService(null);
        setForm({ name: "", code: "", description: "", isActive: true });
        setFormOpen(true);
    };

    const openEdit = (service) => {
        setEditingService(service);
        setForm({
            name: service.name || "",
            code: service.code || "",
            description: service.description || "",
            isActive: Number(service.is_active) === 1
        });
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingService(null);
        setForm({ name: "", code: "", description: "", isActive: true });
    };

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = {
                categoryId,
                ...form,
                code: form.code || slugCode(form.name)
            };
            if (editingService) {
                await api.put(`/services/${editingService.id}`, payload);
                toast("Cập nhật dịch vụ thành công", "success");
            } else {
                await api.post("/services", { ...payload, isActive: true });
                toast("Tạo dịch vụ thành công", "success");
            }
            await refresh();
            closeForm();
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setSaving(false);
        }
    };

    const deleteService = async (service) => {
        const ok = await confirm({
            title: "Xóa dịch vụ",
            message: `Xác nhận vô hiệu hóa dịch vụ ${service.name}?`,
            confirmText: "Xóa"
        });
        if (!ok) return;
        try {
            await api.delete(`/services/${service.id}`);
            toast("Đã vô hiệu hóa dịch vụ", "success");
            refresh();
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };

    return (
        <>
            <PageHeader
                title={category?.name || "Chi tiết nhóm dịch vụ"}
                subtitle={category?.description || "Danh sách dịch vụ thuộc nhóm."}
                action={(
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link className="btn ghost" to="/admin/catalog/services"><Icon name="arrow_back" />Nhóm dịch vụ</Link>
                        <button className="btn primary" type="button" onClick={openCreate}><Icon name="add" />Thêm dịch vụ</button>
                    </div>
                )}
            />
            {pagination.totalItems ? (
                <>
                    <div className="card table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Mã</th>
                                    <th>Dịch vụ</th>
                                    <th>Mô tả</th>
                                    <th>Trạng thái</th>
                                    <th>Cập nhật</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagination.items.map((service) => (
                                    <tr key={service.id}>
                                        <td><strong>{service.code}</strong></td>
                                        <td>{service.name}</td>
                                        <td>{service.description || "-"}</td>
                                        <td><Badge value={Number(service.is_active) === 1 ? "ACTIVE" : "INACTIVE"} type={Number(service.is_active) === 1 ? "success" : "danger"} /></td>
                                        <td>{formatDate(service.updated_at || service.created_at)}</td>
                                        <td>
                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                <button className="btn ghost" type="button" onClick={() => openEdit(service)}><Icon name="edit" />Sửa</button>
                                                <button className="btn danger" type="button" onClick={() => deleteService(service)}><Icon name="delete" />Xóa</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination {...pagination} label="dịch vụ" />
                </>
            ) : (
                <div className="card"><Empty text="Chưa có dịch vụ trong nhóm này" /></div>
            )}
            {formOpen && (
                <div className="modal-backdrop">
                    <form className="modal form" onSubmit={submit}>
                        <div>
                            <h3 style={{ margin: 0 }}>{editingService ? "Sửa dịch vụ" : "Thêm dịch vụ"}</h3>
                            <p className="muted" style={{ margin: "6px 0 0" }}>{category?.name || "Nhóm dịch vụ"}</p>
                        </div>
                        <Field label="Tên dịch vụ">
                            <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                        </Field>
                        <Field label="Mã dịch vụ">
                            <input className="input" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="Tự tạo nếu để trống" />
                        </Field>
                        <Field label="Mô tả">
                            <textarea className="textarea" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                        </Field>
                        {editingService && (
                            <Field label="Trạng thái">
                                <select className="select" value={String(form.isActive)} onChange={(event) => setForm({ ...form, isActive: event.target.value === "true" })}>
                                    <option value="true">Hoạt động</option>
                                    <option value="false">Vô hiệu hóa</option>
                                </select>
                            </Field>
                        )}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button className="btn ghost" type="button" onClick={closeForm} disabled={saving}>Đóng</button>
                            <button className="btn primary" disabled={saving}>{saving ? "Đang lưu..." : editingService ? "Lưu thay đổi" : "Lưu dịch vụ"}</button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}

function ServiceCreatePage() {
    const toast = useToast();
    const navigate = useNavigate();
    const [form, setForm] = React.useState({ name: "", code: "", description: "" });
    const submit = async (event) => {
        event.preventDefault();
        await api.post("/service-categories", { ...form, code: form.code || slugCode(form.name), isActive: true });
        toast("Tạo nhóm dịch vụ thành công", "success");
        navigate("/admin/catalog/services");
    };
    return (
        <>
            <PageHeader title="Thêm nhóm dịch vụ mới" />
            <form className="card form" onSubmit={submit}>
                <Field label="Tên nhóm"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
                <Field label="Mã nhóm"><input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Tự tạo nếu để trống" /></Field>
                <Field label="Mô tả"><textarea className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
                <button className="btn primary">Lưu nhóm dịch vụ</button>
            </form>
        </>
    );
}

function PermissionsPage() {
    const { data: users, refresh } = useApi("/users", []);
    const { data: roles } = useApi("/roles", []);
    const { data: departments } = useApi("/departments", []);
    const toast = useToast();
    const confirm = useConfirm();
    const [editingUser, setEditingUser] = React.useState(null);

    const setStatus = async (user, status) => {
        const ok = await confirm({ title: status === "LOCKED" ? "Khóa tài khoản" : "Mở khóa tài khoản", message: `Xác nhận cập nhật ${user.full_name}?` });
        if (!ok) return;
        await api.put(`/users/${user.id}/status`, { status });
        toast("Cập nhật tài khoản thành công", "success");
        refresh();
    };

    const changeRole = async (user, roleId) => {
        const ok = await confirm({ title: "Đổi vai trò người dùng", message: `Xác nhận đổi vai trò cho ${user.full_name}?` });
        if (!ok) return;
        await api.put(`/users/${user.id}/change-role`, { roleId });
        toast("Đổi vai trò thành công", "success");
        refresh();
    };

    const deleteUser = async (user) => {
        const ok = await confirm({
            title: "Xóa người dùng",
            message: `Xác nhận xóa vĩnh viễn tài khoản ${user.full_name} khỏi database?`,
            confirmText: "Xóa"
        });
        if (!ok) return;
        try {
            await api.delete(`/users/${user.id}`);
            toast("Đã xóa người dùng", "success");
            refresh();
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };

    return (
        <>
            <PageHeader
                title="Phân quyền hệ thống"
                action={(
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link className="btn ghost" to="/admin/settings"><Icon name="tune" />Thiết lập chỉ số</Link>
                        <Link className="btn primary" to="/admin/permissions/create-user"><Icon name="add" />Thêm người dùng mới</Link>
                    </div>
                )}
            />
            <UserTable users={users} roles={roles} onStatus={setStatus} onRoleChange={changeRole} onEdit={setEditingUser} onDelete={deleteUser} />
            {editingUser && (
                <UserEditModal
                    user={editingUser}
                    departments={departments}
                    onClose={() => setEditingUser(null)}
                    onSaved={() => {
                        setEditingUser(null);
                        refresh();
                    }}
                />
            )}
        </>
    );
}

function CreateUserPage() {
    const toast = useToast();
    const navigate = useNavigate();
    const { data: roles } = useApi("/roles", []);
    const { data: departments } = useApi("/departments", []);
    const [form, setForm] = React.useState({ fullName: "", email: "", password: "", roleId: "", departmentIds: [], status: "ACTIVE" });

    React.useEffect(() => {
        if (roles[0] && !form.roleId) setForm((state) => ({ ...state, roleId: roles[0].id }));
    }, [roles]);

    const toggleDepartment = (departmentId) => {
        setForm((state) => ({
            ...state,
            departmentIds: state.departmentIds.includes(departmentId)
                ? state.departmentIds.filter((item) => item !== departmentId)
                : [...state.departmentIds, departmentId]
        }));
    };

    const submit = async (event) => {
        event.preventDefault();
        await api.post("/users", form);
        toast("Tạo người dùng thành công", "success");
        navigate("/admin/permissions");
    };

    return (
        <>
            <PageHeader title="Thêm mới người dùng" />
            <form className="card form" onSubmit={submit}>
                <div className="form-grid">
                    <Field label="Họ tên"><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></Field>
                    <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
                    <Field label="Mật khẩu tạm thời"><input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Nhập mật khẩu tạm thời" required /></Field>
                    <Field label="Vai trò">
                        <select className="select" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
                            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                        </select>
                    </Field>
                    <div className="field span-2">
                        <span>Phòng ban</span>
                        <DepartmentPicker
                            departments={departments}
                            selectedIds={form.departmentIds}
                            onToggle={toggleDepartment}
                        />
                    </div>
                </div>
                <button className="btn primary">Lưu người dùng</button>
            </form>
        </>
    );
}

function SettingsPage() {
    const { data: statuses, setData: setStatuses, refresh: refreshStatuses } = useApi("/ticket-statuses", []);
    const { data: priorities, setData: setPriorities, refresh: refreshPriorities } = useApi("/priorities", []);
    const { data: slaPolicies, setData: setSlaPolicies, refresh: refreshSlaPolicies } = useApi("/sla-policies", []);
    const toast = useToast();
    const statusPagination = usePagination(statuses, 8);
    const priorityPagination = usePagination(priorities, 8);
    const slaPagination = usePagination(slaPolicies, 10);

    const updateStatusValue = (id, field, value) => {
        setStatuses((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
    };

    const saveStatus = async (status) => {
        await api.put(`/ticket-statuses/${status.id}`, {
            code: status.code,
            name: status.name,
            color: status.color,
            sortOrder: status.sort_order,
            isDefault: status.is_default,
            isClosed: status.is_closed,
            isSystem: status.is_system
        });
        toast("Cập nhật trạng thái thành công", "success");
        refreshStatuses();
    };

    const updatePriorityValue = (id, field, value) => {
        setPriorities((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
    };

    const savePriority = async (priority) => {
        await api.put(`/priorities/${priority.id}`, {
            code: priority.code,
            name: priority.name,
            level: priority.level,
            color: priority.color,
            responseTimeMinutes: priority.response_time_minutes,
            resolveTimeMinutes: priority.resolve_time_minutes,
            isActive: priority.is_active
        });
        toast("Cập nhật mức ưu tiên thành công", "success");
        refreshPriorities();
    };

    const updateSlaValue = (id, field, value) => {
        setSlaPolicies((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
    };

    const saveSla = async (policy) => {
        await api.put(`/sla-policies/${policy.id}`, {
            serviceId: policy.service_id,
            priorityId: policy.priority_id,
            responseTimeMinutes: policy.response_time_minutes,
            resolveTimeMinutes: policy.resolve_time_minutes,
            isActive: policy.is_active
        });
        toast("Cập nhật SLA thành công", "success");
        refreshSlaPolicies();
    };

    return (
        <>
            <PageHeader title="Cấu hình hệ thống" subtitle="Chỉ Quản trị được thiết lập trạng thái, mức ưu tiên và chỉ số SLA." />
            <div className="grid">
                <Section title="Trạng thái yêu cầu">
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Mã</th><th>Tên</th><th>Màu</th><th>Thứ tự</th><th>Đóng yêu cầu</th><th></th></tr></thead>
                            <tbody>
                                {statusPagination.items.map((status) => (
                                    <tr key={status.id}>
                                        <td>{status.code}</td>
                                        <td><input className="input compact" value={status.name || ""} onChange={(event) => updateStatusValue(status.id, "name", event.target.value)} /></td>
                                        <td><input className="input compact" value={status.color || ""} onChange={(event) => updateStatusValue(status.id, "color", event.target.value)} /></td>
                                        <td><input className="input compact" type="number" value={status.sort_order || ""} onChange={(event) => updateStatusValue(status.id, "sort_order", event.target.value)} /></td>
                                        <td>
                                            <select className="select compact" value={String(status.is_closed ?? 0)} onChange={(event) => updateStatusValue(status.id, "is_closed", Number(event.target.value))}>
                                                <option value="0">Chưa đóng</option>
                                                <option value="1">Đã đóng</option>
                                            </select>
                                        </td>
                                        <td><button className="btn ghost" onClick={() => saveStatus(status)}>Lưu</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination {...statusPagination} label="trạng thái" />
                </Section>
            </div>
            <div className="grid cols-2" style={{ marginTop: 16 }}>
                <Section title="Mức ưu tiên">
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Mã</th><th>Tên</th><th>Cấp</th><th>Phản hồi</th><th>Xử lý</th><th></th></tr></thead>
                            <tbody>
                                {priorityPagination.items.map((priority) => (
                                    <tr key={priority.id}>
                                        <td>{priority.code}</td>
                                        <td><input className="input compact" value={priority.name || ""} onChange={(event) => updatePriorityValue(priority.id, "name", event.target.value)} /></td>
                                        <td><input className="input compact" type="number" value={priority.level || ""} onChange={(event) => updatePriorityValue(priority.id, "level", event.target.value)} /></td>
                                        <td><input className="input compact" type="number" value={priority.response_time_minutes || ""} onChange={(event) => updatePriorityValue(priority.id, "response_time_minutes", event.target.value)} /></td>
                                        <td><input className="input compact" type="number" value={priority.resolve_time_minutes || ""} onChange={(event) => updatePriorityValue(priority.id, "resolve_time_minutes", event.target.value)} /></td>
                                        <td><button className="btn ghost" onClick={() => savePriority(priority)}>Lưu</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination {...priorityPagination} label="mức ưu tiên" />
                </Section>
            </div>
            <Section title="Chỉ số SLA">
                <div className="table-wrap">
                    <table className="table">
                        <thead><tr><th>Dịch vụ</th><th>Ưu tiên</th><th>Thời gian phản hồi (phút)</th><th>Thời gian xử lý (phút)</th><th></th></tr></thead>
                        <tbody>
                            {slaPagination.items.map((policy) => (
                                <tr key={policy.id}>
                                    <td>{policy.service_name || "Mặc định toàn hệ thống"}</td>
                                    <td>{policy.priority_name}</td>
                                    <td><input className="input compact" type="number" value={policy.response_time_minutes || ""} onChange={(event) => updateSlaValue(policy.id, "response_time_minutes", event.target.value)} /></td>
                                    <td><input className="input compact" type="number" value={policy.resolve_time_minutes || ""} onChange={(event) => updateSlaValue(policy.id, "resolve_time_minutes", event.target.value)} /></td>
                                    <td><button className="btn ghost" onClick={() => saveSla(policy)}>Lưu</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination {...slaPagination} label="chỉ số SLA" />
            </Section>
        </>
    );
}

function NotificationsPage() {
    const { data: notifications, refresh } = useApi("/notifications", []);
    const toast = useToast();
    const markAll = async () => {
        await api.put("/notifications/read-all");
        toast("Đã đánh dấu tất cả là đã đọc", "success");
        refresh();
    };
    return (
        <>
            <PageHeader title="Thông báo" action={<button className="btn ghost" onClick={markAll}>Đánh dấu đã đọc</button>} />
            <PaginatedGrid items={notifications} pageSize={10} label="thông báo" emptyText="Chưa có thông báo">
                {(item) => (
                    <div key={item.id} className="card">
                        <Badge value={item.is_read ? "Đã đọc" : "Mới"} type={item.is_read ? "" : "primary"} />
                        <h3>{item.title}</h3>
                        <p className="muted">{item.message}</p>
                        <p className="muted">{formatDate(item.created_at)}</p>
                    </div>
                )}
            </PaginatedGrid>
        </>
    );
}

function ProfilePage() {
    const { user, refreshProfile } = useAuth();
    const toast = useToast();
    const [password, setPassword] = React.useState({ currentPassword: "", newPassword: "" });
    const submit = async (event) => {
        event.preventDefault();
        await api.put("/auth/change-password", password);
        setPassword({ currentPassword: "", newPassword: "" });
        toast("Đổi mật khẩu thành công", "success");
        refreshProfile();
    };

    return (
        <>
            <PageHeader title="Hồ sơ người dùng" />
            <div className="grid cols-2">
                <Section title="Thông tin tài khoản">
                    <InfoRows rows={[
                        ["Họ tên", user?.full_name],
                        ["Email", user?.email],
                        ["Vai trò", roleName(user?.role_code)],
                        ["Phòng ban", user?.department_name || "-"]
                    ]} />
                </Section>
                <Section title="Đổi mật khẩu">
                    <form className="form" onSubmit={submit}>
                        <Field label="Mật khẩu hiện tại"><input className="input" type="password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} required /></Field>
                        <Field label="Mật khẩu mới"><input className="input" type="password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} required /></Field>
                        <button className="btn primary">Đổi mật khẩu</button>
                    </form>
                </Section>
            </div>
        </>
    );
}

function ProfileEditorPage() {
    const { user, refreshProfile } = useAuth();
    const toast = useToast();
    const [profile, setProfile] = React.useState({ fullName: "", email: "", phone: "" });
    const [avatarFile, setAvatarFile] = React.useState(null);
    const [avatarPreview, setAvatarPreview] = React.useState("");
    const [password, setPassword] = React.useState({ currentPassword: "", newPassword: "" });

    React.useEffect(() => {
        setProfile({
            fullName: user?.full_name || "",
            email: user?.email || "",
            phone: user?.phone || ""
        });
    }, [user?.id, user?.full_name, user?.email, user?.phone]);

    React.useEffect(() => {
        if (!avatarFile) {
            setAvatarPreview("");
            return;
        }
        const url = URL.createObjectURL(avatarFile);
        setAvatarPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [avatarFile]);

    const submitProfile = async (event) => {
        event.preventDefault();
        const form = new FormData();
        form.append("fullName", profile.fullName);
        form.append("email", profile.email);
        form.append("phone", profile.phone);
        if (avatarFile) form.append("avatar", avatarFile);

        try {
            await api.put("/auth/profile", form, { headers: { "Content-Type": "multipart/form-data" } });
            await refreshProfile();
            setAvatarFile(null);
            toast("Cập nhật hồ sơ thành công", "success");
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };

    const submitPassword = async (event) => {
        event.preventDefault();
        try {
            await api.put("/auth/change-password", password);
            setPassword({ currentPassword: "", newPassword: "" });
            toast("Đổi mật khẩu thành công", "success");
            refreshProfile();
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };

    return (
        <>
            <PageHeader title="Hồ sơ người dùng" />
            <div className="grid cols-2">
                <Section title="Cập nhật hồ sơ">
                    <form className="form" onSubmit={submitProfile}>
                        <div className="profile-avatar-row">
                            <Avatar user={user} src={avatarPreview || mediaUrl(user?.avatar_url)} size="lg" />
                            <div>
                                <strong>{user?.full_name || "Người dùng"}</strong>
                                <p className="muted" style={{ margin: "4px 0 10px" }}>{roleName(user?.role_code)} - {user?.department_name || "Chưa có phòng ban"}</p>
                                <input className="input" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(event) => setAvatarFile(event.target.files[0] || null)} />
                            </div>
                        </div>
                        <Field label="Họ tên">
                            <input className="input" value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} required />
                        </Field>
                        <Field label="Email">
                            <input className="input" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} required />
                        </Field>
                        <Field label="Số điện thoại">
                            <input className="input" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="Chưa cập nhật" />
                        </Field>
                        <button className="btn primary">Lưu hồ sơ</button>
                    </form>
                </Section>
                <Section title="Đổi mật khẩu">
                    <form className="form" onSubmit={submitPassword}>
                        <Field label="Mật khẩu hiện tại"><input className="input" type="password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} required /></Field>
                        <Field label="Mật khẩu mới"><input className="input" type="password" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} required /></Field>
                        <button className="btn primary">Đổi mật khẩu</button>
                    </form>
                </Section>
            </div>
        </>
    );
}

function InfoRows({ rows }) {
    return (
        <div className="grid">
            {rows.map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span className="muted">{label}</span>
                    <strong>{value || "-"}</strong>
                </div>
            ))}
        </div>
    );
}

function SimpleList({ items, getLabel, getValue, pageSize = 0, label = "mục" }) {
    const safeItems = Array.isArray(items) ? items : [];
    const pagination = usePagination(safeItems, pageSize || Math.max(safeItems.length, 1));
    const visibleItems = pageSize ? pagination.items : safeItems;

    if (!safeItems.length) return <Empty text="Chưa có dữ liệu" />;

    return (
        <>
            <div className="grid">
                {visibleItems.map((item, index) => (
                    <div key={item.id || item.support_id || index} className="card" style={{ boxShadow: "none", padding: 12, display: "flex", justifyContent: "space-between" }}>
                        <span>{getLabel(item)}</span>
                        <strong>{getValue(item)}</strong>
                    </div>
                ))}
            </div>
            {pageSize > 0 && <Pagination {...pagination} label={label} />}
        </>
    );
}

function Badge({ value, type = "" }) {
    return <span className={`badge ${type}`}>{value || "-"}</span>;
}

function RatingStars({ rating, showValue = false }) {
    const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));

    return (
        <span className="rating-stars" aria-label={`${safeRating} sao`}>
            {[1, 2, 3, 4, 5].map((value) => (
                <span key={value} className={`material-symbols-outlined ${value <= safeRating ? "active" : ""}`}>star</span>
            ))}
            {showValue && <strong>{safeRating}/5</strong>}
        </span>
    );
}

function Icon({ name }) {
    return <span className="material-symbols-outlined">{name}</span>;
}

function Avatar({ user, src, size = "md" }) {
    const imageSrc = src || mediaUrl(user?.avatar_url);
    return (
        <div className={`avatar ${size}`}>
            {imageSrc ? <img src={imageSrc} alt={user?.full_name || "avatar"} /> : <span>{initials(user?.full_name || user?.email)}</span>}
        </div>
    );
}

function LocalFilePreview({ file }) {
    const [url, setUrl] = React.useState("");

    React.useEffect(() => {
        if (!file || !file.type.startsWith("image/")) {
            setUrl("");
            return;
        }

        const nextUrl = URL.createObjectURL(file);
        setUrl(nextUrl);
        return () => URL.revokeObjectURL(nextUrl);
    }, [file]);

    return (
        <div className="attachment-item">
            {url ? <img src={url} alt={file.name} /> : <Icon name="attach_file" />}
            <span>{file.name}</span>
        </div>
    );
}

function AttachmentPreview({ file }) {
    const url = mediaUrl(file.file_path);
    const isImage = isImageAttachment(file);

    return (
        <a className="attachment-item" href={url} target="_blank" rel="noreferrer">
            {isImage ? <img src={url} alt={file.original_name} /> : <Icon name="attach_file" />}
            <span>{file.original_name}</span>
        </a>
    );
}

function Empty({ text }) {
    return <div className="empty">{text}</div>;
}

function useApi(path, initialValue) {
    const [data, setData] = React.useState(initialValue);
    const [loading, setLoading] = React.useState(true);
    const toast = useToast();

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get(path);
            setData(response.data.data);
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setLoading(false);
        }
    }, [path]);

    React.useEffect(() => {
        load();
    }, [load]);

    return { data, setData, loading, refresh: load };
}

function roleName(roleCode) {
    const map = {
        REQUESTER: "Sinh viên / Người dùng",
        SUPPORT: "Nhân viên IT",
        MANAGER: "Quản lý",
        ADMIN: "Quản trị"
    };
    return map[roleCode] || roleCode || "";
}

const REPORT_PRESETS = [
    { value: "7D", label: "7 ngày" },
    { value: "30D", label: "30 ngày" },
    { value: "MONTH", label: "Tháng này" },
    { value: "ALL", label: "Tất cả" }
];

function reportRangeForPreset(preset = "30D") {
    const today = new Date();

    if (preset === "ALL") {
        return { preset, fromDate: "", toDate: "" };
    }

    if (preset === "MONTH") {
        return {
            preset,
            fromDate: dateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
            toDate: dateInputValue(today)
        };
    }

    const days = preset === "7D" ? 7 : 30;
    const from = new Date(today);
    from.setDate(today.getDate() - days + 1);

    return {
        preset,
        fromDate: dateInputValue(from),
        toDate: dateInputValue(today)
    };
}

function dateInputValue(date) {
    const safeDate = new Date(date);
    if (Number.isNaN(safeDate.getTime())) return "";
    safeDate.setMinutes(safeDate.getMinutes() - safeDate.getTimezoneOffset());
    return safeDate.toISOString().slice(0, 10);
}

function reportQueryString(range) {
    const params = new URLSearchParams();
    if (range.fromDate) params.set("fromDate", range.fromDate);
    if (range.toDate) params.set("toDate", range.toDate);
    const query = params.toString();
    return query ? `?${query}` : "";
}

function ticketStatusOptions(tickets) {
    const statusMap = new Map();

    tickets.forEach((ticket) => {
        const code = ticket.status_code || "UNKNOWN";
        const current = statusMap.get(code) || {
            code,
            name: ticket.status_name || code,
            count: 0
        };
        current.count += 1;
        statusMap.set(code, current);
    });

    return Array.from(statusMap.values()).sort((left, right) => {
        const leftIndex = STATUS_ORDER.indexOf(left.code);
        const rightIndex = STATUS_ORDER.indexOf(right.code);
        const safeLeft = leftIndex === -1 ? STATUS_ORDER.length : leftIndex;
        const safeRight = rightIndex === -1 ? STATUS_ORDER.length : rightIndex;

        if (safeLeft !== safeRight) return safeLeft - safeRight;
        return String(left.name).localeCompare(String(right.name), "vi");
    });
}

function ticketPriorityOptions(tickets) {
    const priorityMap = new Map();

    tickets.forEach((ticket) => {
        const code = ticketPriorityKey(ticket);
        const level = Number(ticket.priority_level);
        const current = priorityMap.get(code) || {
            code,
            name: ticket.priority_name || code,
            level: Number.isFinite(level) ? level : Number.MAX_SAFE_INTEGER,
            count: 0
        };
        current.count += 1;
        priorityMap.set(code, current);
    });

    return Array.from(priorityMap.values()).sort((left, right) => {
        if (left.level !== right.level) return left.level - right.level;
        return String(left.name).localeCompare(String(right.name), "vi");
    });
}

function ticketPriorityKey(ticket) {
    return String(ticket?.priority_code || ticket?.priority_id || "UNKNOWN");
}

function normalizeSearchValue(value) {
    return String(value || "")
        .toLocaleLowerCase("vi")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .trim();
}

function filterTicketsByRange(tickets, range) {
    const safeTickets = Array.isArray(tickets) ? tickets : [];
    const fromTime = range.fromDate ? new Date(`${range.fromDate}T00:00:00`).getTime() : -Infinity;
    const toTime = range.toDate ? new Date(`${range.toDate}T23:59:59`).getTime() : Infinity;

    return safeTickets.filter((ticket) => {
        const createdAt = new Date(ticket.created_at).getTime();
        if (!Number.isFinite(createdAt)) return false;
        return createdAt >= fromTime && createdAt <= toTime;
    });
}

function ticketReportSummary(tickets) {
    const safeTickets = Array.isArray(tickets) ? tickets : [];
    const closed = safeTickets.filter(isClosed).length;
    const handled = safeTickets.filter(isHandledTicket).length;
    const ratings = safeTickets
        .map((ticket) => Number(ticket.feedback_rating))
        .filter((rating) => Number.isFinite(rating) && rating > 0);

    return {
        total: safeTickets.length,
        closed,
        handled,
        open: safeTickets.length - closed,
        cancelled: safeTickets.filter((ticket) => ticket.status_code === "CANCELLED").length,
        overdue: safeTickets.filter(isOverdue).length,
        avgResponseMinutes: averageTicketMinutes(safeTickets, "created_at", "first_response_at"),
        avgResolutionMinutes: averageTicketMinutes(safeTickets, "created_at", "resolved_at"),
        avgRating: averageNumbers(ratings),
        feedbackCount: ratings.length
    };
}

function normalizeReportSummary(summary = {}, fallbackTickets = []) {
    const fallback = ticketReportSummary(fallbackTickets);
    return {
        total: Number(summary.total_tickets) || fallback.total,
        closed: Number(summary.closed_tickets) || fallback.closed,
        open: Number(summary.open_tickets) || fallback.open,
        cancelled: Number(summary.cancelled_tickets) || fallback.cancelled,
        overdue: Number(summary.overdue_tickets) || fallback.overdue,
        avgResponseMinutes: toNullableNumber(summary.avg_response_minutes) ?? fallback.avgResponseMinutes,
        avgResolutionMinutes: toNullableNumber(summary.avg_resolution_minutes) ?? fallback.avgResolutionMinutes,
        avgRating: toNullableNumber(summary.avg_rating) ?? fallback.avgRating,
        feedbackCount: Number(summary.feedback_count) || fallback.feedbackCount
    };
}

function ticketSlaSummary(tickets) {
    const resolved = (Array.isArray(tickets) ? tickets : []).filter((ticket) => ticket.resolved_at && ticket.due_resolve_at);
    const onTime = resolved.filter((ticket) => !isLateResolved(ticket)).length;
    const late = resolved.length - onTime;

    return {
        resolved: resolved.length,
        onTime,
        late,
        onTimePercent: resolved.length ? Math.round((onTime / resolved.length) * 10000) / 100 : 0
    };
}

function normalizeSlaSummary(row = {}) {
    const resolved = Number(row.resolved_tickets) || 0;
    const onTime = Number(row.resolved_on_time) || 0;
    const late = Number(row.resolved_late) || 0;
    const percent = toNullableNumber(row.on_time_percent);

    return {
        resolved,
        onTime,
        late,
        onTimePercent: percent ?? (resolved ? Math.round((onTime / resolved) * 10000) / 100 : 0)
    };
}

function statusReportRows(tickets) {
    return ticketStatusOptions(tickets).map((status) => ({
        key: status.code,
        label: status.name,
        value: status.count
    }));
}

function priorityReportRows(tickets) {
    return ticketPriorityOptions(tickets).map((priority) => ({
        key: priority.code,
        label: priority.name,
        value: priority.count
    }));
}

function serviceReportRows(tickets) {
    return groupedReportRows(tickets, (ticket) => ticket.service_id || ticket.service_code || "UNKNOWN", (ticket) => ticket.service_name || "Chưa phân loại");
}

function dailyReportRows(tickets) {
    const rows = groupedReportRows(tickets, (ticket) => dateInputValue(ticket.created_at), (ticket) => formatDateOnly(ticket.created_at));
    return rows.sort((left, right) => String(left.key).localeCompare(String(right.key)));
}

function dailyRowsFromApi(rows, fallbackTickets) {
    if (Array.isArray(rows) && rows.length) {
        return rows.map((row) => ({
            key: row.date,
            label: formatDateOnly(row.date),
            value: Number(row.total) || 0
        }));
    }

    return dailyReportRows(fallbackTickets);
}

function feedbackRowsFromApi(rows, fallbackTickets) {
    if (Array.isArray(rows) && rows.length) {
        return rows.map((row) => ({
            key: row.rating,
            label: `${row.rating} sao`,
            value: Number(row.total) || 0
        }));
    }

    return ticketFeedbackRows(fallbackTickets);
}

function ticketFeedbackRows(tickets) {
    const rows = groupedReportRows(
        (Array.isArray(tickets) ? tickets : []).filter((ticket) => Number(ticket.feedback_rating) > 0),
        (ticket) => Number(ticket.feedback_rating),
        (ticket) => `${ticket.feedback_rating} sao`
    );

    return rows.sort((left, right) => Number(left.key) - Number(right.key));
}

function groupedReportRows(items, keyGetter, labelGetter) {
    const map = new Map();
    (Array.isArray(items) ? items : []).forEach((item) => {
        const key = keyGetter(item);
        const current = map.get(key) || {
            key,
            label: labelGetter(item),
            value: 0
        };
        current.value += 1;
        map.set(key, current);
    });

    return Array.from(map.values()).sort((left, right) => {
        if (right.value !== left.value) return right.value - left.value;
        return String(left.label).localeCompare(String(right.label), "vi");
    });
}

function averageTicketMinutes(tickets, startField, endField) {
    const values = (Array.isArray(tickets) ? tickets : [])
        .map((ticket) => minutesBetween(ticket[startField], ticket[endField]))
        .filter((value) => Number.isFinite(value));
    return averageNumbers(values);
}

function averageNumbers(values) {
    if (!values.length) return null;
    const total = values.reduce((sum, value) => sum + Number(value), 0);
    return Math.round((total / values.length) * 100) / 100;
}

function minutesBetween(start, end) {
    if (!start || !end) return null;
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;
    return Math.max(0, Math.round((endTime - startTime) / 60000));
}

function toNullableNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function formatPercent(value) {
    const number = toNullableNumber(value) || 0;
    return `${number}%`;
}

function formatMinutes(value) {
    const minutes = toNullableNumber(value);
    if (minutes === null) return "-";
    if (minutes < 60) return `${Math.round(minutes)} phút`;
    const hours = Math.floor(minutes / 60);
    const rest = Math.round(minutes % 60);
    return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
}

function formatDateOnly(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(date);
}

function statusClassName(statusCode) {
    const normalized = String(statusCode || "UNKNOWN")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return `status-${normalized || "unknown"}`;
}

function isClosed(ticket) {
    return ["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.status_code) || Number(ticket.status_is_closed) === 1;
}

function isHandledTicket(ticket) {
    return ["RESOLVED", "CLOSED"].includes(ticket.status_code) || (Number(ticket.status_is_closed) === 1 && ticket.status_code !== "CANCELLED");
}

function isOverdue(ticket) {
    return ticket.due_resolve_at && new Date(ticket.due_resolve_at) < new Date() && !isClosed(ticket);
}

function isLateResolved(ticket) {
    return ticket.resolved_at && ticket.due_resolve_at && new Date(ticket.resolved_at) > new Date(ticket.due_resolve_at);
}

function ticketEditInfo(ticket, now = Date.now()) {
    const createdAt = new Date(ticket?.created_at).getTime();
    const expiresAt = createdAt + 5 * 60 * 1000;
    const remainingMs = Number.isFinite(createdAt) ? Math.max(0, expiresAt - now) : 0;
    const isInTime = remainingMs > 0;
    const isEditableStatus = ["NEW", "ASSIGNED"].includes(ticket?.status_code);

    if (!isInTime) {
        return { canEdit: false, remainingMs: 0, reason: "Đã quá 5 phút nên không thể chỉnh sửa yêu cầu" };
    }

    if (!isEditableStatus) {
        return { canEdit: false, remainingMs, reason: "Chỉ được chỉnh sửa khi yêu cầu mới tạo hoặc đã phân công" };
    }

    return { canEdit: true, remainingMs, reason: "" };
}

function formatCountdown(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
}

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function mediaUrl(value) {
    if (!value) return "";
    if (/^(https?:|data:|blob:)/i.test(value)) return value;
    return `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
}

function isImageAttachment(file) {
    const mime = String(file?.mime_type || "").toLowerCase();
    const name = String(file?.original_name || file?.file_name || file?.file_path || "").toLowerCase();
    return mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
}

function initials(value) {
    return String(value || "U")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function slugCode(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toUpperCase();
}

function errorMessage(error) {
    return error?.response?.data?.details?.[0]?.message || error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
