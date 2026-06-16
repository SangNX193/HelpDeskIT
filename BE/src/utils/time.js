const DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DEFAULT_OFFSET_MINUTES = 7 * 60;

const parseOffsetMinutes = (value, fallback = DEFAULT_OFFSET_MINUTES) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    const text = String(value).trim();
    const match = text.match(/^([+-])(\d{2}):?(\d{2})$/);
    if (match) {
        const sign = match[1] === '-' ? -1 : 1;
        return sign * (Number(match[2]) * 60 + Number(match[3]));
    }

    const number = Number(text);
    return Number.isFinite(number) ? number : fallback;
};

const formatOffset = (minutes) => {
    const sign = minutes < 0 ? '-' : '+';
    const absolute = Math.abs(minutes);
    const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
    const rest = String(absolute % 60).padStart(2, '0');
    return `${sign}${hours}:${rest}`;
};

const APP_TIME_ZONE = process.env.APP_TIME_ZONE || DEFAULT_TIME_ZONE;
const APP_TIME_OFFSET_MINUTES = parseOffsetMinutes(
    process.env.APP_TIME_OFFSET_MINUTES || process.env.DB_TIMEZONE,
    DEFAULT_OFFSET_MINUTES
);
const APP_TIME_OFFSET = formatOffset(APP_TIME_OFFSET_MINUTES);

const appDateParts = (date = new Date()) => {
    const safeDate = date instanceof Date ? date : new Date(date);
    const shifted = new Date(safeDate.getTime() + APP_TIME_OFFSET_MINUTES * 60 * 1000);

    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
        hour: shifted.getUTCHours(),
        minute: shifted.getUTCMinutes(),
        second: shifted.getUTCSeconds()
    };
};

const pad = (value) => String(value).padStart(2, '0');

const toMysqlDate = (date = new Date()) => {
    const parts = appDateParts(date);
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
};

const toIsoWithOffset = (date = new Date()) => {
    const parts = appDateParts(date);
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}${APP_TIME_OFFSET}`;
};

const addMinutes = (minutes, fromDate = new Date()) => {
    const base = fromDate instanceof Date ? fromDate : new Date(fromDate);
    return toMysqlDate(new Date(base.getTime() + Number(minutes) * 60 * 1000));
};

const parseAppDate = (value) => {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const text = String(value).trim();
    if (!text) {
        return null;
    }

    if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) {
        const date = new Date(text);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    const normalized = text.includes('T') ? text : text.replace(' ', 'T');
    const hasTime = /\d{1,2}:\d{2}/.test(normalized);
    const date = new Date(`${normalized}${hasTime ? '' : 'T00:00:00'}${APP_TIME_OFFSET}`);
    return Number.isNaN(date.getTime()) ? null : date;
};

module.exports = {
    APP_TIME_ZONE,
    APP_TIME_OFFSET,
    APP_TIME_OFFSET_MINUTES,
    addMinutes,
    appDateParts,
    parseAppDate,
    toIsoWithOffset,
    toMysqlDate
};
