-- MySQL schema for Sai Nirvana Plaza booking system migration
-- Target Database: hotel_management

CREATE DATABASE IF NOT EXISTS hotel_management;
USE hotel_management;

-- Drop tables in reverse order of dependencies if they already exist to allow clean replay
DROP TABLE IF EXISTS front_desk_records;
DROP TABLE IF EXISTS communication_history;
DROP TABLE IF EXISTS room_availability;
DROP TABLE IF EXISTS corporate_bookings;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS room_service_requests;
DROP TABLE IF EXISTS housekeeping;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS stay_history;
DROP TABLE IF EXISTS active_stays;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS guest_accounts;
DROP TABLE IF EXISTS guests;
DROP TABLE IF EXISTS staff_accounts;

-- 1. STAFF ACCOUNTS TABLE
CREATE TABLE staff_accounts (
  staff_id INT PRIMARY KEY AUTO_INCREMENT,
  staff_name VARCHAR(255) NOT NULL,
  department ENUM('Administration', 'Front Desk', 'Housekeeping', 'Food & Beverage', 'Security') NOT NULL,
  role VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. GUESTS TABLE
CREATE TABLE guests (
  guest_id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  government_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_guest_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. GUEST ACCOUNTS TABLE
CREATE TABLE guest_accounts (
  account_id INT PRIMARY KEY AUTO_INCREMENT,
  guest_id_str VARCHAR(100) UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  stay_duration VARCHAR(100) DEFAULT '2 Nights',
  is_activated TINYINT(1) DEFAULT 1,
  first_login_password_changed TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_guest_account_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. ROOMS TABLE
CREATE TABLE rooms (
  room_id INT PRIMARY KEY AUTO_INCREMENT,
  room_number VARCHAR(50) UNIQUE NOT NULL,
  room_type ENUM('Standard', 'Deluxe', 'Executive Suite', 'Presidential Suite') NOT NULL,
  room_name VARCHAR(255) NOT NULL,
  capacity INT NOT NULL,
  amenities JSON NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL,
  room_status ENUM('Available', 'Occupied', 'Dirty', 'Maintenance') DEFAULT 'Available',
  image_url TEXT NOT NULL,
  gallery_images JSON DEFAULT NULL,
  description TEXT DEFAULT NULL,
  size_sqft INT DEFAULT NULL,
  bed_type VARCHAR(100) DEFAULT NULL,
  view_type VARCHAR(100) DEFAULT NULL,
  reviews JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. BOOKINGS TABLE
CREATE TABLE bookings (
  booking_id INT PRIMARY KEY AUTO_INCREMENT,
  guest_id INT NOT NULL,
  room_id INT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  booking_status ENUM('Pending', 'Confirmed', 'Verified', 'Checked-In', 'Checked-Out', 'Cancelled') DEFAULT 'Pending',
  booking_source ENUM('Website', 'Phone', 'Walk-in', 'Corporate', 'OTA') DEFAULT 'Website',
  assigned_staff VARCHAR(255) DEFAULT NULL,
  is_archived TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guests(guest_id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
  INDEX idx_booking_dates (check_in_date, check_out_date),
  INDEX idx_booking_status (booking_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. ACTIVE STAYS TABLE
CREATE TABLE active_stays (
  stay_id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT UNIQUE NOT NULL,
  guest_id INT NOT NULL,
  room_id INT NOT NULL,
  check_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expected_check_out TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'Checked-In',
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (guest_id) REFERENCES guests(guest_id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. STAY HISTORY TABLE
CREATE TABLE stay_history (
  history_id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT UNIQUE NOT NULL,
  guest_id INT NOT NULL,
  room_id INT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  actual_checkout_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Checked-Out', 'Cancelled') NOT NULL,
  total_amount DECIMAL(10, 2) DEFAULT 0.00,
  notes TEXT DEFAULT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (guest_id) REFERENCES guests(guest_id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. PAYMENTS TABLE
CREATE TABLE payments (
  payment_id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  gst_amount DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash') NOT NULL,
  payment_status ENUM('Pending', 'Paid', 'Refunded') DEFAULT 'Pending',
  transaction_reference VARCHAR(255) UNIQUE NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. HOUSEKEEPING TABLE
CREATE TABLE housekeeping (
  task_id INT PRIMARY KEY AUTO_INCREMENT,
  room_id INT NOT NULL,
  assigned_staff VARCHAR(255) NOT NULL,
  task_status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
  completion_time TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. ROOM SERVICE REQUESTS TABLE
CREATE TABLE room_service_requests (
  request_id INT PRIMARY KEY AUTO_INCREMENT,
  guest_id INT NOT NULL,
  room_id INT NOT NULL,
  booking_id INT DEFAULT NULL,
  request_type VARCHAR(255) NOT NULL,
  request_status ENUM('Pending', 'In Progress', 'Delivered', 'Cancelled') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guests(guest_id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. COMPLAINTS TABLE
CREATE TABLE complaints (
  complaint_id INT PRIMARY KEY AUTO_INCREMENT,
  guest_id INT NOT NULL,
  room_id INT DEFAULT NULL,
  booking_id INT DEFAULT NULL,
  complaint_category VARCHAR(255) NOT NULL,
  complaint_description TEXT NOT NULL,
  priority_level ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL,
  complaint_status ENUM('Pending', 'In Progress', 'Resolved') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guests(guest_id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 12. FEEDBACK TABLE
CREATE TABLE feedback (
  feedback_id INT PRIMARY KEY AUTO_INCREMENT,
  guest_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comments TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guests(guest_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. CORPORATE BOOKINGS TABLE
CREATE TABLE corporate_bookings (
  corporate_booking_id INT PRIMARY KEY AUTO_INCREMENT,
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50) NOT NULL,
  number_of_rooms INT NOT NULL,
  booking_dates VARCHAR(255) NOT NULL,
  booking_status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. ROOM AVAILABILITY TABLE
CREATE TABLE room_availability (
  availability_id INT PRIMARY KEY AUTO_INCREMENT,
  room_id INT NOT NULL,
  available_date DATE NOT NULL,
  availability_status ENUM('Available', 'Booked', 'Blocked') DEFAULT 'Available',
  FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
  UNIQUE KEY uq_room_date (room_id, available_date),
  INDEX idx_avail_date (available_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. COMMUNICATION HISTORY TABLE
CREATE TABLE communication_history (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  guest_id_str VARCHAR(100) NOT NULL,
  guest_name VARCHAR(255) NOT NULL,
  communication_type VARCHAR(255) NOT NULL,
  channel ENUM('WhatsApp', 'Email') NOT NULL,
  status_info VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  staff_member VARCHAR(255) NOT NULL,
  delivery_attempts INT DEFAULT 1,
  failure_reason TEXT DEFAULT NULL,
  recipient_email VARCHAR(255) DEFAULT NULL,
  api_response TEXT DEFAULT NULL,
  error_code VARCHAR(100) DEFAULT NULL,
  INDEX idx_comm_guest (guest_id_str)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. FRONT DESK RECORDS TABLE
CREATE TABLE front_desk_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ref_type VARCHAR(100) NOT NULL,
  ref_id INT DEFAULT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
