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
