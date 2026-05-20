USE utc_helpdesk;

SET @add_ticket_room_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE tickets ADD COLUMN room VARCHAR(100) NULL AFTER description',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'tickets'
    AND column_name = 'room'
);

PREPARE add_ticket_room_stmt FROM @add_ticket_room_sql;
EXECUTE add_ticket_room_stmt;
DEALLOCATE PREPARE add_ticket_room_stmt;
