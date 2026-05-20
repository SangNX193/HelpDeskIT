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
