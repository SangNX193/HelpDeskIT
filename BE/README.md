# Backend UTC IT Helpdesk

## Cấu hình

Sửa `.env` nếu MySQL của bạn khác mặc định:

```env
PORT=3000
CORS_ORIGIN=http://localhost:5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=utc_helpdesk
JWT_SECRET=change_to_a_long_random_secret_before_deploy
JWT_EXPIRES_IN=7d
```

## Database

Import theo thứ tự:

1. `src/database/migrations/001_init_schema.sql`
2. `src/database/migrations/002_add_user_avatar_url.sql`
3. `src/database/migrations/003_add_ticket_room.sql`
4. `src/database/migrations/004_add_user_departments.sql`
5. `src/database/migrations/005_add_ticket_assignees.sql`
6. `src/database/migrations/006_add_ticket_assignee_status.sql`
7. `src/database/migrations/007_add_ticket_ai_messages.sql`
8. `src/database/seeders/001_seed_master_data.sql`

Nên import bằng `mysql.exe` với `--default-character-set=utf8mb4` để không lỗi tiếng Việt. Nếu thư mục dự án không phải `D:\HelpDesk`, đổi lại đường dẫn cho đúng máy của bạn.

```powershell
cmd.exe /c "C:\xampp\mysql\bin\mysql.exe --protocol=tcp --host=127.0.0.1 --port=3306 --user=root --default-character-set=utf8mb4 < D:\HelpDesk\BE\src\database\migrations\001_init_schema.sql"
cmd.exe /c "C:\xampp\mysql\bin\mysql.exe --protocol=tcp --host=127.0.0.1 --port=3306 --user=root --default-character-set=utf8mb4 utc_helpdesk < D:\HelpDesk\BE\src\database\migrations\002_add_user_avatar_url.sql"
cmd.exe /c "C:\xampp\mysql\bin\mysql.exe --protocol=tcp --host=127.0.0.1 --port=3306 --user=root --default-character-set=utf8mb4 utc_helpdesk < D:\HelpDesk\BE\src\database\migrations\003_add_ticket_room.sql"
cmd.exe /c "C:\xampp\mysql\bin\mysql.exe --protocol=tcp --host=127.0.0.1 --port=3306 --user=root --default-character-set=utf8mb4 utc_helpdesk < D:\HelpDesk\BE\src\database\migrations\004_add_user_departments.sql"
cmd.exe /c "C:\xampp\mysql\bin\mysql.exe --protocol=tcp --host=127.0.0.1 --port=3306 --user=root --default-character-set=utf8mb4 utc_helpdesk < D:\HelpDesk\BE\src\database\migrations\005_add_ticket_assignees.sql"
cmd.exe /c "C:\xampp\mysql\bin\mysql.exe --protocol=tcp --host=127.0.0.1 --port=3306 --user=root --default-character-set=utf8mb4 utc_helpdesk < D:\HelpDesk\BE\src\database\migrations\006_add_ticket_assignee_status.sql"
cmd.exe /c "C:\xampp\mysql\bin\mysql.exe --protocol=tcp --host=127.0.0.1 --port=3306 --user=root --default-character-set=utf8mb4 utc_helpdesk < D:\HelpDesk\BE\src\database\migrations\007_add_ticket_ai_messages.sql"
cmd.exe /c "C:\xampp\mysql\bin\mysql.exe --protocol=tcp --host=127.0.0.1 --port=3306 --user=root --default-character-set=utf8mb4 utc_helpdesk < D:\HelpDesk\BE\src\database\seeders\001_seed_master_data.sql"
```

Nếu XAMPP/MySQL của bạn chạy port khác, sửa `DB_PORT` trong `.env` cho đúng trước khi start API.

## Chạy

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd start
```

API chạy tại `http://localhost:3000`.
