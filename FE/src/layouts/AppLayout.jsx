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
