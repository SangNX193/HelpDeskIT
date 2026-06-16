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

const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";
const APP_TIME_OFFSET = "+07:00";
const DATE_WITH_ZONE_PATTERN = /[zZ]|[+-]\d{2}:?\d{2}$/;

const appDateInputFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
});

function parseAppDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    const text = String(value).trim();
    if (!text) return null;

    if (DATE_WITH_ZONE_PATTERN.test(text)) {
        const zonedDate = new Date(text);
        return Number.isNaN(zonedDate.getTime()) ? null : zonedDate;
    }

    const normalized = text.includes("T") ? text : text.replace(" ", "T");
    const hasTime = /\d{1,2}:\d{2}/.test(normalized);
    const date = new Date(`${normalized}${hasTime ? "" : "T00:00:00"}${APP_TIME_OFFSET}`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function dateInputParts(value = new Date()) {
    const date = parseAppDate(value);
    if (!date) return null;

    return appDateInputFormatter.formatToParts(date).reduce((parts, part) => {
        if (part.type !== "literal") parts[part.type] = part.value;
        return parts;
    }, {});
}

function addDaysToInputDate(value, days) {
    const date = parseAppDate(`${value}T00:00:00`);
    if (!date) return "";
    date.setUTCDate(date.getUTCDate() + days);
    return dateInputValue(date);
}

function nowAppIso() {
    const date = new Date();
    const parts = dateInputParts(date);
    if (!parts) return date.toISOString();

    const timeParts = new Intl.DateTimeFormat("en-GB", {
        timeZone: APP_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).formatToParts(date).reduce((values, part) => {
        if (part.type !== "literal") values[part.type] = part.value;
        return values;
    }, {});

    return `${parts.year}-${parts.month}-${parts.day}T${timeParts.hour}:${timeParts.minute}:${timeParts.second}${APP_TIME_OFFSET}`;
}

function reportRangeForPreset(preset = "30D") {
    const today = dateInputValue(new Date());

    if (preset === "ALL") {
        return { preset, fromDate: "", toDate: "" };
    }

    if (preset === "MONTH") {
        const parts = dateInputParts(new Date());
        return {
            preset,
            fromDate: parts ? `${parts.year}-${parts.month}-01` : today,
            toDate: today
        };
    }

    const days = preset === "7D" ? 7 : 30;

    return {
        preset,
        fromDate: addDaysToInputDate(today, -days + 1),
        toDate: today
    };
}

function dateInputValue(date) {
    const parts = dateInputParts(date);
    return parts ? `${parts.year}-${parts.month}-${parts.day}` : "";
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

    return safeTickets.filter((ticket) => {
        const createdDate = dateInputValue(ticket.created_at);
        if (!createdDate) return false;
        if (range.fromDate && createdDate < range.fromDate) return false;
        if (range.toDate && createdDate > range.toDate) return false;
        return true;
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
    const startTime = parseAppDate(start)?.getTime();
    const endTime = parseAppDate(end)?.getTime();
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
    const date = parseAppDate(value);
    if (!date) return value;
    return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeZone: APP_TIME_ZONE }).format(date);
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
    const dueDate = parseAppDate(ticket.due_resolve_at);
    return dueDate && dueDate.getTime() < Date.now() && !isClosed(ticket);
}

function isLateResolved(ticket) {
    const resolvedAt = parseAppDate(ticket.resolved_at);
    const dueDate = parseAppDate(ticket.due_resolve_at);
    return resolvedAt && dueDate && resolvedAt.getTime() > dueDate.getTime();
}

function ticketEditInfo(ticket, now = Date.now()) {
    const createdAt = parseAppDate(ticket?.created_at)?.getTime();
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
    const date = parseAppDate(value);
    if (!date) return value;
    return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium", timeZone: APP_TIME_ZONE }).format(date);
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
