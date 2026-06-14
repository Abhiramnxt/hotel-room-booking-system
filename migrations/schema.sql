-- MySQL schema for Sai Nirvana Plaza booking system

CREATE TABLE IF NOT EXISTS guests (
  guest_id INT PRIMARY KEY,
  full_name VARCHAR(255),
  email VARCHAR(255),
  mobile_number VARCHAR(50),
  address TEXT,
  government_id VARCHAR(255),
  created_at DATETIME
);

CREATE TABLE IF NOT EXISTS guest_accounts (
  account_id INT PRIMARY KEY,
  guest_id_str VARCHAR(100),
  username VARCHAR(255),
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  mobile_number VARCHAR(50),
  email VARCHAR(255),
  stay_duration VARCHAR(100),
  room_preference VARCHAR(255),
  is_activated TINYINT(1),
  first_login_password_changed TINYINT(1),
  created_at DATETIME
);

CREATE TABLE IF NOT EXISTS bookings (
  booking_id INT PRIMARY KEY,
  guest_id INT,
  room_id INT,
  check_in_date DATE,
  check_out_date DATE,
  booking_status VARCHAR(50),
  booking_source VARCHAR(100),
  assigned_staff VARCHAR(255),
  created_at DATETIME,
  is_archived TINYINT(1)
);

CREATE TABLE IF NOT EXISTS communication_logs (
  log_id INT PRIMARY KEY,
  guest_id_str VARCHAR(100),
  guest_name VARCHAR(255),
  communication_type VARCHAR(255),
  channel VARCHAR(50),
  status_info VARCHAR(255),
  timestamp DATETIME,
  staff_member VARCHAR(255),
  delivery_attempts INT,
  failure_reason TEXT
);

-- Additional tables for future use
CREATE TABLE IF NOT EXISTS active_stays (
  stay_id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT,
  guest_id INT,
  room_id INT,
  check_in_at DATETIME,
  expected_check_out DATETIME,
  status VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS checkin_records (
  checkin_id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT,
  guest_id INT,
  staff_id INT,
  checkin_time DATETIME,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS checkout_records (
  checkout_id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT,
  guest_id INT,
  staff_id INT,
  checkout_time DATETIME,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS frontdesk_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ref_type VARCHAR(100),
  ref_id INT,
  payload JSON,
  created_at DATETIME
);
