CREATE DATABASE IF NOT EXISTS pump_modbus_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE pump_modbus_db;

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,

  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,

  is_active TINYINT(1) DEFAULT 1,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS modbus_devices (
  id INT AUTO_INCREMENT PRIMARY KEY,

  name VARCHAR(100) NOT NULL,
  host VARCHAR(100) NOT NULL,
  port INT NOT NULL DEFAULT 502,
  unit_id INT NOT NULL DEFAULT 1,

  timeout_ms INT NOT NULL DEFAULT 3000,
  poll_interval_ms INT NOT NULL DEFAULT 1000,

  is_enabled TINYINT(1) DEFAULT 1,

  created_by INT NULL,
  updated_by INT NULL,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_modbus_devices_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_modbus_devices_updated_by
    FOREIGN KEY (updated_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pumps (
  id INT AUTO_INCREMENT PRIMARY KEY,

  modbus_device_id INT NOT NULL,

  pump_code VARCHAR(50) NOT NULL,
  pump_name VARCHAR(100) NOT NULL,
  description TEXT NULL,

  display_order INT DEFAULT 0,
  is_enabled TINYINT(1) DEFAULT 1,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_pumps_modbus_device
    FOREIGN KEY (modbus_device_id) REFERENCES modbus_devices(id),

  UNIQUE KEY unique_pump_code (pump_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS modbus_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,

  modbus_device_id INT NOT NULL,
  pump_id INT NOT NULL,

  tag_key VARCHAR(100) NOT NULL,
  label VARCHAR(100) NOT NULL,

  register_type VARCHAR(50) NOT NULL,
  register_address INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,

  read_function_code INT NULL,
  write_function_code INT NULL,

  data_type VARCHAR(50) NOT NULL DEFAULT 'uint16',

  scale_value DOUBLE NOT NULL DEFAULT 1,
  offset_value DOUBLE NOT NULL DEFAULT 0,

  unit VARCHAR(30) NULL,

  is_readable TINYINT(1) DEFAULT 1,
  is_writable TINYINT(1) DEFAULT 0,

  min_value DOUBLE NULL,
  max_value DOUBLE NULL,

  byte_order VARCHAR(20) DEFAULT 'ABCD',
  word_order VARCHAR(20) DEFAULT 'ABCD',

  is_enabled TINYINT(1) DEFAULT 1,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_modbus_tags_device
    FOREIGN KEY (modbus_device_id) REFERENCES modbus_devices(id),

  CONSTRAINT fk_modbus_tags_pump
    FOREIGN KEY (pump_id) REFERENCES pumps(id),

  UNIQUE KEY unique_tag_per_pump (pump_id, tag_key),

  INDEX idx_modbus_tags_device (modbus_device_id),
  INDEX idx_modbus_tags_pump (pump_id),
  INDEX idx_modbus_tags_address (register_address)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS modbus_reading_batches (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  modbus_device_id INT NOT NULL,

  success TINYINT(1) DEFAULT 1,
  response_time_ms INT NULL,
  error_message TEXT NULL,

  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_batches_device
    FOREIGN KEY (modbus_device_id) REFERENCES modbus_devices(id),

  INDEX idx_batches_device_time (modbus_device_id, created_at),
  INDEX idx_batches_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS modbus_reading_values (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  batch_id BIGINT NOT NULL,
  pump_id INT NOT NULL,
  tag_id INT NOT NULL,

  raw_value VARCHAR(100) NULL,
  value_number DOUBLE NULL,
  value_text VARCHAR(100) NULL,

  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_reading_values_batch
    FOREIGN KEY (batch_id) REFERENCES modbus_reading_batches(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_reading_values_pump
    FOREIGN KEY (pump_id) REFERENCES pumps(id),

  CONSTRAINT fk_reading_values_tag
    FOREIGN KEY (tag_id) REFERENCES modbus_tags(id),

  INDEX idx_values_batch (batch_id),
  INDEX idx_values_created_at (created_at),
  INDEX idx_values_pump_tag_time (pump_id, tag_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS latest_modbus_values (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  pump_id INT NOT NULL,
  tag_id INT NOT NULL,
  last_batch_id BIGINT NULL,

  raw_value VARCHAR(100) NULL,
  value_number DOUBLE NULL,
  value_text VARCHAR(100) NULL,

  quality VARCHAR(30) DEFAULT 'good',

  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_latest_pump
    FOREIGN KEY (pump_id) REFERENCES pumps(id),

  CONSTRAINT fk_latest_tag
    FOREIGN KEY (tag_id) REFERENCES modbus_tags(id),

  CONSTRAINT fk_latest_batch
    FOREIGN KEY (last_batch_id) REFERENCES modbus_reading_batches(id)
    ON DELETE SET NULL,

  UNIQUE KEY unique_latest_value (pump_id, tag_id),

  INDEX idx_latest_pump (pump_id),
  INDEX idx_latest_tag (tag_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pump_command_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  user_id INT NULL,
  pump_id INT NOT NULL,
  tag_id INT NULL,

  command VARCHAR(100) NOT NULL,

  requested_value VARCHAR(100) NULL,
  raw_value VARCHAR(100) NULL,

  success TINYINT(1) DEFAULT 0,
  message TEXT NULL,

  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_command_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_command_pump
    FOREIGN KEY (pump_id) REFERENCES pumps(id),

  CONSTRAINT fk_command_tag
    FOREIGN KEY (tag_id) REFERENCES modbus_tags(id)
    ON DELETE SET NULL,

  INDEX idx_command_created_at (created_at),
  INDEX idx_command_pump_time (pump_id, created_at),
  INDEX idx_command_user_time (user_id, created_at)
) ENGINE=InnoDB;