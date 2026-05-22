USE utc_helpdesk;

SET @add_assignee_status_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE ticket_assignees ADD COLUMN status_code VARCHAR(50) NOT NULL DEFAULT ''ASSIGNED'' AFTER assigned_by',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'ticket_assignees'
    AND column_name = 'status_code'
);

PREPARE add_assignee_status_stmt FROM @add_assignee_status_sql;
EXECUTE add_assignee_status_stmt;
DEALLOCATE PREPARE add_assignee_status_stmt;

SET @add_assignee_accepted_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE ticket_assignees ADD COLUMN accepted_at DATETIME NULL AFTER status_code',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'ticket_assignees'
    AND column_name = 'accepted_at'
);

PREPARE add_assignee_accepted_stmt FROM @add_assignee_accepted_sql;
EXECUTE add_assignee_accepted_stmt;
DEALLOCATE PREPARE add_assignee_accepted_stmt;

SET @add_assignee_resolved_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE ticket_assignees ADD COLUMN resolved_at DATETIME NULL AFTER accepted_at',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'ticket_assignees'
    AND column_name = 'resolved_at'
);

PREPARE add_assignee_resolved_stmt FROM @add_assignee_resolved_sql;
EXECUTE add_assignee_resolved_stmt;
DEALLOCATE PREPARE add_assignee_resolved_stmt;

SET @add_assignee_resolution_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE ticket_assignees ADD COLUMN resolution TEXT NULL AFTER resolved_at',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'ticket_assignees'
    AND column_name = 'resolution'
);

PREPARE add_assignee_resolution_stmt FROM @add_assignee_resolution_sql;
EXECUTE add_assignee_resolution_stmt;
DEALLOCATE PREPARE add_assignee_resolution_stmt;

SET @add_assignee_updated_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE ticket_assignees ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'ticket_assignees'
    AND column_name = 'updated_at'
);

PREPARE add_assignee_updated_stmt FROM @add_assignee_updated_sql;
EXECUTE add_assignee_updated_stmt;
DEALLOCATE PREPARE add_assignee_updated_stmt;

UPDATE ticket_assignees ta
INNER JOIN tickets t ON t.id = ta.ticket_id
INNER JOIN ticket_statuses st ON st.id = t.status_id
SET
  ta.status_code = CASE
    WHEN st.code = 'CLOSED' THEN 'RESOLVED'
    WHEN st.code IN ('IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED') THEN st.code
    ELSE ta.status_code
  END,
  ta.accepted_at = CASE
    WHEN st.code IN ('IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED') THEN COALESCE(ta.accepted_at, t.first_response_at, t.updated_at, t.created_at)
    ELSE ta.accepted_at
  END,
  ta.resolved_at = CASE
    WHEN st.code IN ('RESOLVED', 'CLOSED') THEN COALESCE(ta.resolved_at, t.resolved_at)
    ELSE ta.resolved_at
  END,
  ta.resolution = COALESCE(ta.resolution, t.resolution);
