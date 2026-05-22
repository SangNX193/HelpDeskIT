const { badRequest } = require('../utils/response');

const valueOf = (body, ...fields) => {
    for (const field of fields) {
        if (body[field] !== undefined && body[field] !== null && String(body[field]).trim() !== '') {
            return body[field];
        }
    }
    return undefined;
};

const requireFields = (...groups) => (req, res, next) => {
    const errors = [];

    groups.forEach((group) => {
        const value = valueOf(req.body, ...group.fields);
        if (value === undefined) {
            errors.push({
                field: group.fields[0],
                message: group.message || `Vui lòng nhập ${group.label || group.fields[0]}`
            });
        }
    });

    if (errors.length > 0) {
        return badRequest(res, 'Dữ liệu không hợp lệ', errors);
    }

    return next();
};

const validateCreateTicket = requireFields(
    { fields: ['title'], label: 'tiêu đề' },
    { fields: ['description'], label: 'mô tả', message: 'Hãy mô tả sự cố' },
    { fields: ['room'], label: 'phòng cần hỗ trợ' },
    { fields: ['serviceId', 'service_id'], label: 'dịch vụ' }
);

const validateComment = requireFields({ fields: ['content', 'comment'], label: 'nội dung phản hồi' });

const validateFeedback = (req, res, next) => {
    const rating = Number(valueOf(req.body, 'rating'));
    const comment = valueOf(req.body, 'comment', 'reason');

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return badRequest(res, 'Dữ liệu không hợp lệ', [
            { field: 'rating', message: 'Điểm đánh giá phải là số nguyên từ 1 đến 5' }
        ]);
    }

    if (rating < 3 && comment === undefined) {
        return badRequest(res, 'Dữ liệu không hợp lệ', [
            { field: 'comment', message: 'Cần nhập lý do đánh giá' }
        ]);
    }

    return next();
};

const validateAssignTicket = requireFields({ fields: ['supportIds', 'support_ids', 'supportId', 'support_id', 'assignedTo', 'assigned_to'], label: 'nhân viên IT' });
const validateUpdateStatus = requireFields({ fields: ['statusId', 'status_id', 'statusCode', 'status_code'], label: 'trạng thái' });
const validateUpdatePriority = requireFields({ fields: ['priorityId', 'priority_id', 'priorityCode', 'priority_code'], label: 'mức ưu tiên' });

module.exports = {
    validateCreateTicket,
    validateComment,
    validateFeedback,
    validateAssignTicket,
    validateUpdateStatus,
    validateUpdatePriority
};
