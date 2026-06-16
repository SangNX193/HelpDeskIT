USE utc_helpdesk;

SET @add_consultation_staff_state_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE consultation_conversations ADD COLUMN staff_state ENUM(''ACTIVE'', ''ARCHIVED'', ''DELETED'') NOT NULL DEFAULT ''ACTIVE'' AFTER status',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'consultation_conversations'
    AND column_name = 'staff_state'
);

PREPARE add_consultation_staff_state_stmt FROM @add_consultation_staff_state_sql;
EXECUTE add_consultation_staff_state_stmt;
DEALLOCATE PREPARE add_consultation_staff_state_stmt;

SET @add_consultation_archived_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE consultation_conversations ADD COLUMN staff_archived_at DATETIME NULL AFTER staff_last_read_at',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'consultation_conversations'
    AND column_name = 'staff_archived_at'
);

PREPARE add_consultation_archived_stmt FROM @add_consultation_archived_sql;
EXECUTE add_consultation_archived_stmt;
DEALLOCATE PREPARE add_consultation_archived_stmt;

SET @add_consultation_deleted_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE consultation_conversations ADD COLUMN staff_deleted_at DATETIME NULL AFTER staff_archived_at',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'consultation_conversations'
    AND column_name = 'staff_deleted_at'
);

PREPARE add_consultation_deleted_stmt FROM @add_consultation_deleted_sql;
EXECUTE add_consultation_deleted_stmt;
DEALLOCATE PREPARE add_consultation_deleted_stmt;

SET @add_consultation_staff_state_index_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE consultation_conversations ADD INDEX idx_consultation_conversations_staff_state (staff_state, last_message_at)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'consultation_conversations'
    AND index_name = 'idx_consultation_conversations_staff_state'
);

PREPARE add_consultation_staff_state_index_stmt FROM @add_consultation_staff_state_index_sql;
EXECUTE add_consultation_staff_state_index_stmt;
DEALLOCATE PREPARE add_consultation_staff_state_index_stmt;
