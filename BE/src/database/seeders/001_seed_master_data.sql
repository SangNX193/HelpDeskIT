USE utc_helpdesk;

INSERT INTO roles (code, name, description, is_system) VALUES
('ADMIN', 'Quản trị viên', 'Quản trị toàn bộ hệ thống', 1),
('MANAGER', 'Quản lý', 'Theo dõi, điều phối và phân công yêu cầu', 1),
('SUPPORT', 'Nhân viên IT', 'Nhân viên xử lý yêu cầu hỗ trợ CNTT', 1),
('REQUESTER', 'Người yêu cầu', 'Sinh viên/người dùng gửi yêu cầu hỗ trợ', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO departments (code, name, description) VALUES
('IT', 'Phòng Công nghệ thông tin', 'Đơn vị phụ trách hỗ trợ CNTT'),
('TRAINING', 'Phòng Đào tạo', 'Đơn vị quản lý đào tạo'),
('FINANCE', 'Phòng Tài chính', 'Đơn vị tài chính'),
('STUDENT', 'Sinh viên', 'Nhóm người dùng sinh viên'),
('A2', 'Tòa A2', 'Khu giảng đường A2'),
('A3', 'Tòa A3', 'Khu giảng đường A3'),
('A7', 'Tòa A7', 'Khu giảng đường A7')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_active = 1;

INSERT INTO service_categories (code, name, description) VALUES
('ACCOUNT', 'Tài khoản và truy cập', 'Yêu cầu về tài khoản, mật khẩu và quyền truy cập'),
('NETWORK', 'Mạng và Internet', 'Yêu cầu về Wi-Fi, mạng LAN và kết nối Internet'),
('DEVICE', 'Thiết bị và phòng học', 'Máy tính, máy in, máy chiếu và thiết bị phòng học'),
('SOFTWARE', 'Phần mềm và hệ thống', 'Phần mềm, hệ thống nội bộ và nền tảng học tập')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_active = 1;

INSERT INTO services (category_id, code, name, description)
SELECT c.id, 'RESET_PASSWORD', 'Đặt lại mật khẩu', 'Khôi phục tài khoản và đặt lại mật khẩu'
FROM service_categories c WHERE c.code = 'ACCOUNT'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_active = 1;

INSERT INTO services (category_id, code, name, description)
SELECT c.id, 'EMAIL_ACCESS', 'Truy cập email', 'Hỗ trợ email trường và Microsoft 365'
FROM service_categories c WHERE c.code = 'ACCOUNT'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_active = 1;

INSERT INTO services (category_id, code, name, description)
SELECT c.id, 'WIFI_NETWORK', 'Sự cố Wi-Fi/mạng', 'Hỗ trợ Wi-Fi, mạng LAN và kết nối Internet'
FROM service_categories c WHERE c.code = 'NETWORK'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_active = 1;

INSERT INTO services (category_id, code, name, description)
SELECT c.id, 'DEVICE_SUPPORT', 'Hỗ trợ thiết bị', 'Máy tính, máy in, máy chiếu và thiết bị ngoại vi'
FROM service_categories c WHERE c.code = 'DEVICE'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_active = 1;

INSERT INTO services (category_id, code, name, description)
SELECT c.id, 'LMS_SUPPORT', 'LMS/hệ thống nội bộ', 'Hệ thống học tập và các hệ thống nội bộ'
FROM service_categories c WHERE c.code = 'SOFTWARE'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_active = 1;

INSERT INTO priorities (code, name, level, color, response_time_minutes, resolve_time_minutes) VALUES
('P1', 'Khẩn cấp', 1, '#dc2626', 15, 120),
('P2', 'Cao', 2, '#f97316', 60, 240),
('P3', 'Trung bình', 3, '#2563eb', 240, 1440),
('P4', 'Thấp', 4, '#64748b', 1440, 4320)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
level = VALUES(level),
color = VALUES(color),
response_time_minutes = VALUES(response_time_minutes),
resolve_time_minutes = VALUES(resolve_time_minutes),
is_active = 1;

INSERT INTO ticket_statuses (code, name, color, sort_order, is_default, is_closed, is_system) VALUES
('NEW', 'Mới tạo', '#2563eb', 1, 1, 0, 1),
('ASSIGNED', 'Đã phân công', '#7c3aed', 2, 0, 0, 1),
('IN_PROGRESS', 'Đang xử lý', '#f97316', 3, 0, 0, 1),
('WAITING_FOR_USER', 'Chờ người dùng bổ sung', '#ca8a04', 4, 0, 0, 1),
('RESOLVED', 'Đã xử lý', '#16a34a', 5, 0, 1, 1),
('CLOSED', 'Đã đóng', '#475569', 6, 0, 1, 1),
('CANCELLED', 'Đã hủy', '#991b1b', 7, 0, 1, 1)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
color = VALUES(color),
sort_order = VALUES(sort_order),
is_default = VALUES(is_default),
is_closed = VALUES(is_closed),
is_system = VALUES(is_system);

DELETE FROM sla_policies WHERE service_id IS NULL;

INSERT INTO sla_policies (service_id, priority_id, response_time_minutes, resolve_time_minutes)
SELECT NULL, p.id, p.response_time_minutes, p.resolve_time_minutes
FROM priorities p
ORDER BY p.level;

INSERT INTO users (full_name, email, password_hash, role_id, department_id, status)
SELECT 'Quản trị hệ thống', 'admin@utc.edu.vn', '$2b$10$pvrFq3/GF0A1EvGKQHtYKOf2CJO.RlmfxtPNbsIX.0Ml2PQ1X8Khy', r.id, d.id, 'ACTIVE'
FROM roles r LEFT JOIN departments d ON d.code = 'IT'
WHERE r.code = 'ADMIN'
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role_id = VALUES(role_id), department_id = VALUES(department_id), status = 'ACTIVE';

INSERT INTO users (full_name, email, password_hash, role_id, department_id, status)
SELECT 'Quản lý IT', 'manager@utc.edu.vn', '$2b$10$KXSgFMGHVi2KyHtbCV4Itu81ENyXAsWzJeRZkjMj4baOw/Pi4.gfi', r.id, d.id, 'ACTIVE'
FROM roles r LEFT JOIN departments d ON d.code = 'IT'
WHERE r.code = 'MANAGER'
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role_id = VALUES(role_id), department_id = VALUES(department_id), status = 'ACTIVE';

INSERT INTO users (full_name, email, password_hash, role_id, department_id, status)
SELECT 'Nhân viên hỗ trợ IT', 'support@utc.edu.vn', '$2b$10$azsk0Y6x0VOK3II6GweLWeahK97rHzrBjEanVLKgr1gsALPxJqUmG', r.id, d.id, 'ACTIVE'
FROM roles r LEFT JOIN departments d ON d.code = 'IT'
WHERE r.code = 'SUPPORT'
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role_id = VALUES(role_id), department_id = VALUES(department_id), status = 'ACTIVE';

INSERT INTO users (full_name, email, password_hash, role_id, department_id, status)
SELECT 'Sinh viên Demo', 'user@utc.edu.vn', '$2b$10$1OmIIcKswdsV753IBLe.Dun1xt9kq7vz34eLfmLbLw5iZpMWoxn2q', r.id, d.id, 'ACTIVE'
FROM roles r LEFT JOIN departments d ON d.code = 'STUDENT'
WHERE r.code = 'REQUESTER'
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role_id = VALUES(role_id), department_id = VALUES(department_id), status = 'ACTIVE';
