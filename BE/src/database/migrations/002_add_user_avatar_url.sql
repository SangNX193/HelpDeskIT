USE utc_helpdesk;

SET @add_avatar_url_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL AFTER phone',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'avatar_url'
);

PREPARE add_avatar_url_stmt FROM @add_avatar_url_sql;
EXECUTE add_avatar_url_stmt;
DEALLOCATE PREPARE add_avatar_url_stmt;
