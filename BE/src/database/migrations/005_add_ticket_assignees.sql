USE utc_helpdesk;

CREATE TABLE IF NOT EXISTS ticket_assignees (
  ticket_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  assigned_by BIGINT UNSIGNED NOT NULL,
  status_code VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED',
  accepted_at DATETIME NULL,
  resolved_at DATETIME NULL,
  resolution TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (ticket_id, user_id),
  CONSTRAINT fk_ticket_assignees_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_ticket_assignees_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_ticket_assignees_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id),
  INDEX idx_ticket_assignees_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO ticket_assignees (
  ticket_id,
  user_id,
  assigned_by,
  status_code,
  accepted_at,
  resolved_at,
  resolution,
  created_at
)
SELECT
  t.id,
  t.assigned_to,
  COALESCE(t.assigned_by, t.requester_id),
  CASE
    WHEN st.code = 'CLOSED' THEN 'RESOLVED'
    WHEN st.code IN ('IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED') THEN st.code
    ELSE 'ASSIGNED'
  END,
  CASE
    WHEN st.code IN ('IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED') THEN COALESCE(t.first_response_at, t.updated_at, t.created_at)
    ELSE NULL
  END,
  CASE
    WHEN st.code IN ('RESOLVED', 'CLOSED') THEN t.resolved_at
    ELSE NULL
  END,
  t.resolution,
  COALESCE(t.updated_at, t.created_at)
FROM tickets t
INNER JOIN ticket_statuses st ON st.id = t.status_id
WHERE t.assigned_to IS NOT NULL;
