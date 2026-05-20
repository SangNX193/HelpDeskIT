# UTC IT Helpdesk

Hệ thống quản lý yêu cầu hỗ trợ CNTT nội bộ cho Trường Đại học Giao thông Vận tải.

## Kiến trúc

- BE: Express + MySQL, chạy port `3000`.
- FE: React SPA + React Router + Axios, chạy port `5000`.
- Database: MySQL/XAMPP, database mặc định `utc_helpdesk`.

## Cấu trúc frontend

FE được chia theo nhóm trách nhiệm để dễ bảo trì:

```text
FE/src
├── app/                 # Cấu hình API, provider, guard phân quyền
├── components/          # Component dùng chung: bảng, phân trang, ticket, report
├── hooks/               # Hook gọi API
├── layouts/             # Layout chính theo role
├── pages/
│   ├── admin/           # Quản trị: danh mục, người dùng, phân quyền, cấu hình
│   ├── auth/            # Đăng nhập
│   ├── manager/         # Quản lý: dashboard, báo cáo hệ thống
│   ├── requester/       # Sinh viên/người dùng: tạo ticket, dashboard, báo cáo
│   ├── shared/          # Hồ sơ, thông báo
│   └── support/         # Nhân viên IT: dashboard, lịch sử, báo cáo cá nhân
├── utils/               # Format, validate form, helper dùng chung
├── App.jsx              # Khai báo route tổng
└── styles.css
```

## Role demo

| Role | Email | Password |
| --- | --- | --- |
| REQUESTER | `user@utc.edu.vn` | `User@123` |
| SUPPORT | `support@utc.edu.vn` | `Support@123` |
| MANAGER | `manager@utc.edu.vn` | `Manager@123` |
| ADMIN | `admin@utc.edu.vn` | `Admin@123` |

## Chuẩn bị database bằng XAMPP

1. Mở XAMPP và start `Apache` + `MySQL`.
2. Mở phpMyAdmin: `http://localhost/phpmyadmin`.
3. Import file:
   - `BE/src/database/migrations/001_init_schema.sql`
   - `BE/src/database/migrations/002_add_user_avatar_url.sql`
   - `BE/src/database/migrations/003_add_ticket_room.sql`
   - `BE/src/database/migrations/004_add_user_departments.sql`
   - `BE/src/database/seeders/001_seed_master_data.sql`
4. Kiểm tra có database `utc_helpdesk`.

Khuyến nghị import bằng lệnh dưới đây để giữ đúng tiếng Việt UTF-8. Nếu thư mục dự án không phải `D:\HelpDesk`, đổi lại đường dẫn cho đúng máy của bạn.

```powershell
cmd.exe /c "C:\xampp\mysql\bin\mysql.exe --protocol=tcp --host=127.0.0.1 --port=3306 --user=root --default-character-set=utf8mb4 < D:\HelpDesk\BE\src\database\migrations\001_init_schema.sql"
cmd.exe /c "C:\xampp\mysql\bin\mysql.exe --protocol=tcp --host=127.0.0.1 --port=3306 --user=root --default-character-set=utf8mb4 utc_helpdesk < D:\HelpDesk\BE\src\database\migrations\002_add_user_avatar_url.sql"
cmd.exe /c "C:\xampp\mysql\bin\mysql.exe --protocol=tcp --host=127.0.0.1 --port=3306 --user=root --default-character-set=utf8mb4 utc_helpdesk < D:\HelpDesk\BE\src\database\migrations\003_add_ticket_room.sql"
cmd.exe /c "C:\xampp\mysql\bin\mysql.exe --protocol=tcp --host=127.0.0.1 --port=3306 --user=root --default-character-set=utf8mb4 utc_helpdesk < D:\HelpDesk\BE\src\database\migrations\004_add_user_departments.sql"
cmd.exe /c "C:\xampp\mysql\bin\mysql.exe --protocol=tcp --host=127.0.0.1 --port=3306 --user=root --default-character-set=utf8mb4 utc_helpdesk < D:\HelpDesk\BE\src\database\seeders\001_seed_master_data.sql"
```

Nếu MySQL của bạn có mật khẩu root hoặc dùng port khác, sửa `BE/.env`:

```env
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=utc_helpdesk
DB_PORT=3306
JWT_SECRET=change_to_a_long_random_secret_before_deploy
```

## Chạy backend

```powershell
cd BE
Copy-Item .env.example .env
npm.cmd install
npm.cmd start
```

Backend chạy tại:

```text
http://localhost:3000
```

Kiểm tra nhanh:

```powershell
npm.cmd run check
```

## Chạy frontend

Frontend không cần build tool phức tạp. Server tĩnh nằm ở `FE/server.js`.

```powershell
cd FE
npm.cmd start
```

Frontend chạy tại:

```text
http://localhost:5000/login
```

FE dùng các thư viện React/React Router/Axios/Babel đã tải local trong `FE/vendor`, nên khi demo không cần internet cho các thư viện CDN.

## Route frontend chính

Public:

- `/login`

Shared:

- `/notifications`
- `/profile`

Requester:

- `/requester/dashboard`
- `/requester/tickets`
- `/requester/tickets/create`
- `/requester/tickets/create/success`
- `/requester/tickets/create/error`
- `/requester/tickets/:id`
- `/requester/reports`

Support:

- `/support/dashboard`
- `/support/tickets`
- `/support/tickets/:id`
- `/support/history`
- `/support/reports`

Manager:

- `/manager/dashboard`
- `/manager/tickets`
- `/manager/tickets/:id`
- `/manager/reports`

Admin:

- `/admin/dashboard`
- `/admin/catalog`
- `/admin/catalog/users`
- `/admin/catalog/managers`
- `/admin/catalog/staff`
- `/admin/catalog/departments`
- `/admin/catalog/services`
- `/admin/catalog/services/create`
- `/admin/catalog/services/:categoryId`
- `/admin/tickets`
- `/admin/tickets/:id`
- `/admin/reports`
- `/admin/permissions`
- `/admin/permissions/create-user`
- `/admin/settings`

## Luồng demo

1. Mở `http://localhost:5000/login`.
2. Login `user@utc.edu.vn` / `User@123`.
3. Tạo ticket lỗi Wi-Fi/máy chiếu.
4. Logout.
5. Login `manager@utc.edu.vn` / `Manager@123`.
6. Vào Quản lý Ticket và phân công cho `Support Staff`.
7. Logout.
8. Login `support@utc.edu.vn` / `Support@123`.
9. Xem ticket được giao, bấm Tiếp nhận.
10. Gửi phản hồi, upload minh chứng, Hoàn tất xử lý.
11. Logout.
12. Login lại sinh viên và đánh giá ticket.
13. Login `admin@utc.edu.vn` / `Admin@123`.
14. Xem dashboard, báo cáo, danh mục, phân quyền, cấu hình.

## Ghi chú quyền

- FE ẩn menu theo role bằng layout riêng.
- BE vẫn chặn quyền bằng middleware `auth.middleware.js` và `role.middleware.js`.
- Admin-only APIs nằm trong `BE/src/routes/admin.routes.js`.
- Manager/Admin dùng chung API quản lý ticket và report.
- `GET /api/services`, `GET /api/priorities`, `GET /api/service-categories`, `GET /api/ticket-statuses` được mở cho user đã đăng nhập để tạo/xem ticket; thao tác ghi vẫn chỉ Admin.
