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
