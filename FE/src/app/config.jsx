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

function resolveDefaultApiBase() {
    const runtimeApiBase = window.__HELPDESK_CONFIG__?.apiBase;
    if (runtimeApiBase) return runtimeApiBase;

    if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
        return "http://localhost:3000/api";
    }

    return `${window.location.origin}/api`;
}

function normalizeApiBase(value) {
    return String(value || "").replace(/\/+$/, "");
}

function resolveApiOrigin(apiBase) {
    const apiUrl = new URL(apiBase, window.location.origin);
    apiUrl.pathname = apiUrl.pathname.replace(/\/api\/?$/, "") || "/";
    apiUrl.search = "";
    apiUrl.hash = "";
    return `${apiUrl.origin}${apiUrl.pathname === "/" ? "" : apiUrl.pathname.replace(/\/$/, "")}`;
}

const API_BASE = normalizeApiBase(localStorage.getItem("appApiBase") || resolveDefaultApiBase());
const API_ORIGIN = resolveApiOrigin(API_BASE);
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
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            localStorage.removeItem("helpdeskToken");
            localStorage.removeItem("helpdeskUser");

            if (!window.location.pathname.startsWith("/login")) {
                window.location.replace("/login");
            }
        }

        return Promise.reject(error);
    }
);
