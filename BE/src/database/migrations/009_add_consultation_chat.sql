USE utc_helpdesk;

CREATE TABLE IF NOT EXISTS consultation_conversations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  requester_id BIGINT UNSIGNED NOT NULL,
  assigned_to BIGINT UNSIGNED NULL,
  status ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  last_message_at TIMESTAMP NULL DEFAULT NULL,
  last_sender_id BIGINT UNSIGNED NULL,
  last_sender_role_code VARCHAR(50) NULL,
  requester_last_read_at DATETIME NULL,
  staff_last_read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_consultation_conversations_requester (requester_id),
  CONSTRAINT fk_consultation_conversations_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_consultation_conversations_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_consultation_conversations_last_sender FOREIGN KEY (last_sender_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_consultation_conversations_status_last (status, last_message_at),
  INDEX idx_consultation_conversations_assigned (assigned_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consultation_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  sender_role_code VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_consultation_messages_conversation FOREIGN KEY (conversation_id) REFERENCES consultation_conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_consultation_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_consultation_messages_conversation (conversation_id, created_at, id),
  INDEX idx_consultation_messages_sender (sender_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
