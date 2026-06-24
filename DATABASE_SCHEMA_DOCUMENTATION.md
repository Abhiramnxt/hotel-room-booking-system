# Sai Nirvana Plaza Hotel Booking System
## Railway MySQL Database — Complete Schema Documentation
### Prepared for Internship Report

---

> All content in this document is derived **directly** from the actual project source files:
> `migrations/hotel_management_schema.sql`, `src/server_db.ts`, `src/types.ts`, and `reset_db.cjs`
> Database: **hotel_management** hosted on **Railway MySQL** (`thomas.proxy.rlwy.net:32576`)

---

## 1. Entity-Relationship (ER) Diagram — Text-Based

```
╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
║               SAI NIRVANA PLAZA — MySQL DATABASE ER DIAGRAM                                     ║
║                    Database: hotel_management (Railway MySQL)                                    ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════╝

  ┌────────────────────┐          ┌──────────────────────────────┐
  │   staff_accounts   │          │        guest_accounts         │
  ├────────────────────┤          ├──────────────────────────────┤
  │ PK staff_id (AI)   │          │ PK account_id (AI)            │
  │    staff_name      │          │    guest_id_str (UNIQUE)      │
  │    department      │          │    username (UNIQUE)          │
  │    role            │          │    password_hash              │
  │    email (UNIQUE)  │          │    full_name                  │
  │    phone_number    │          │    mobile_number              │
  │    created_at      │          │    email (INDEX)              │
  └────────────────────┘          │    stay_duration              │
                                  │    is_activated               │
                                  │    first_login_pwd_changed    │
                                  │    gender*                    │
                                  │    city*                      │
                                  │    preferred_room_type*       │
                                  │    created_at                 │
                                  │    updated_at*                │
                                  └──────────────────────────────┘
                                                │
                                 (soft link via email — no hard FK)
                                                │
  ┌──────────────────────────────┐              │
  │            guests            │◄─────────────┘
  ├──────────────────────────────┤
  │ PK guest_id (AI)             │
  │    full_name                 │
  │    email (INDEX)             │
  │    mobile_number             │
  │    address                   │
  │    government_id             │
  │    gender*                   │
  │    city*                     │
  │    preferred_room_type*      │
  │    created_at                │
  │    updated_at*               │
  └──────────────────────────────┘
         │       │       │       │        │        │
         │ 1     │ 1     │ 1     │ 1      │ 1      │ 1
         │       │       │       │        │        │
         │ *     │ *     │ *     │ *      │ *      │ *
         ▼       ▼       ▼       ▼        ▼        ▼
    ┌─────────┐ ┌────────┐ ┌──────────┐ ┌────────┐┌───────────┐┌──────────────┐
    │bookings │ │feedback│ │complaints│ │rm_svc_ ││active_stys││ stay_history │
    │         │ │        │ │          │ │requests││            ││              │
    └─────────┘ └────────┘ └──────────┘ └────────┘└───────────┘└──────────────┘


  ┌──────────────────────────────────────────────────────────────────────┐
  │                              rooms                                    │
  ├──────────────────────────────────────────────────────────────────────┤
  │ PK room_id (AI)                                                       │
  │    room_number (UNIQUE)    room_type      room_name     capacity      │
  │    amenities (JSON)        price_per_night               room_status  │
  │    image_url               gallery_images (JSON)         description  │
  │    size_sqft               bed_type        view_type     reviews(JSON)│
  │    created_at                                                         │
  └──────────────────────────────────────────────────────────────────────┘
         │          │           │            │           │
         │ 1        │ 1         │ 1          │ 1         │ 1
         │          │           │            │           │
         │ *        │ *         │ *          │ *         │ *
         ▼          ▼           ▼            ▼           ▼
    ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
    │bookings │ │housekkpg │ │room_avail│ │rm_svc_rq │ │ stay_history │
    │         │ │          │ │ ability  │ │          │ │              │
    └─────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘


  ┌──────────────────────────────────────────────────────────────────────┐
  │                            bookings                                   │
  ├──────────────────────────────────────────────────────────────────────┤
  │ PK booking_id (AI)                                                    │
  │ FK guest_id  → guests(guest_id)  ON DELETE CASCADE                    │
  │ FK room_id   → rooms(room_id)    ON DELETE CASCADE                    │
  │    check_in_date    check_out_date    booking_status  booking_source  │
  │    assigned_staff   is_archived       created_at                      │
  └──────────────────────────────────────────────────────────────────────┘
         │ 1        │ 1            │ 1             │ 1
         │          │              │               │
         │ *        │ 1            │ 1             │ *
         ▼          ▼              ▼               ▼
    ┌──────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ payments │ │ active_stays │ │ stay_history │ │rm_svc_reqs / │
    │          │ │ (UNIQUE FK)  │ │ (UNIQUE FK)  │ │  complaints  │
    └──────────┘ └──────────────┘ └──────────────┘ └──────────────┘


  ┌──────────────────────────────────────────────────┐
  │              communication_history                │
  ├──────────────────────────────────────────────────┤
  │ PK log_id (AI)                                    │
  │    guest_id_str (VARCHAR, soft ref, INDEX)        │
  │    guest_name     communication_type   channel    │
  │    status_info    timestamp  staff_member         │
  │    delivery_attempts  failure_reason              │
  │    recipient_email    api_response  error_code    │
  └──────────────────────────────────────────────────┘
    (soft link via guest_id_str → guest_accounts.guest_id_str)

  ┌──────────────────────────────────────────────────┐
  │              corporate_bookings                   │
  ├──────────────────────────────────────────────────┤
  │ PK corporate_booking_id (AI)                      │
  │    company_name   contact_person   contact_email  │
  │    contact_phone  number_of_rooms  booking_dates  │
  │    booking_status  created_at                     │
  └──────────────────────────────────────────────────┘
    (Standalone table — no FK dependencies)

  ┌──────────────────────────────────────────────────┐
  │              front_desk_records                   │
  ├──────────────────────────────────────────────────┤
  │ PK id (AI)                                        │
  │    ref_type   ref_id   payload (JSON) created_at  │
  └──────────────────────────────────────────────────┘
    (Generic audit log — no FK dependencies)

  ═══════════════════════════════
  LEGEND
  ═══════════════════════════════
  (AI)      = AUTO_INCREMENT
  (UNIQUE)  = UNIQUE KEY constraint
  PK        = Primary Key
  FK        = Foreign Key
  *         = Column added dynamically via ALTER TABLE in server startup
  1         = "One" side of relationship
  *         = "Many" side of relationship
  →         = References (Foreign Key direction)
```

---

## 2. Database Tables Structure

### Table 1: `staff_accounts`
Stores hotel staff members across all departments.

| Column | Data Type | NULL | AUTO_INCREMENT | Notes |
|--------|-----------|------|----------------|-------|
| `staff_id` | INT | NOT NULL | YES (PK) | Unique staff identifier |
| `staff_name` | VARCHAR(255) | NOT NULL | — | Full name of staff member |
| `department` | ENUM | NOT NULL | — | 'Administration', 'Front Desk', 'Housekeeping', 'Food & Beverage', 'Security' |
| `role` | VARCHAR(100) | NOT NULL | — | e.g., Manager, Receptionist |
| `email` | VARCHAR(255) | NOT NULL | — | UNIQUE — Staff login email |
| `phone_number` | VARCHAR(50) | NOT NULL | — | Contact number |
| `created_at` | TIMESTAMP | NULL | — | DEFAULT CURRENT_TIMESTAMP |

---

### Table 2: `guests`
Stores all guest identity and contact information.

| Column | Data Type | NULL | AUTO_INCREMENT | Notes |
|--------|-----------|------|----------------|-------|
| `guest_id` | INT | NOT NULL | YES (PK) | Unique guest identifier |
| `full_name` | VARCHAR(255) | NOT NULL | — | Guest's full name |
| `email` | VARCHAR(255) | NOT NULL | — | INDEXED — Guest email |
| `mobile_number` | VARCHAR(50) | NOT NULL | — | Indian mobile (+91 formatted) |
| `address` | TEXT | NOT NULL | — | Residential address |
| `government_id` | VARCHAR(255) | NOT NULL | — | Aadhaar / PAN / Passport |
| `created_at` | TIMESTAMP | NULL | — | DEFAULT CURRENT_TIMESTAMP |
| `gender` | VARCHAR(50) | NULL | — | Added via ALTER TABLE at startup |
| `city` | VARCHAR(255) | NULL | — | Added via ALTER TABLE at startup |
| `preferred_room_type` | VARCHAR(100) | NULL | — | Added via ALTER TABLE at startup |
| `updated_at` | TIMESTAMP | NULL | — | Added via ALTER TABLE at startup |

---

### Table 3: `guest_accounts`
Stores login credentials for guest portal access.

| Column | Data Type | NULL | AUTO_INCREMENT | Notes |
|--------|-----------|------|----------------|-------|
| `account_id` | INT | NOT NULL | YES (PK) | Unique account identifier |
| `guest_id_str` | VARCHAR(100) | NOT NULL | — | UNIQUE — e.g. `SNP2026001` |
| `username` | VARCHAR(255) | NOT NULL | — | UNIQUE — Login username |
| `password_hash` | VARCHAR(255) | NOT NULL | — | Temporary plaintext password |
| `full_name` | VARCHAR(255) | NOT NULL | — | Guest's name |
| `mobile_number` | VARCHAR(50) | NOT NULL | — | Mobile number |
| `email` | VARCHAR(255) | NOT NULL | — | INDEXED — Soft link to guests |
| `stay_duration` | VARCHAR(100) | NULL | — | DEFAULT '2 Nights' |
| `is_activated` | TINYINT(1) | NULL | — | DEFAULT 1 (1=Active, 0=Disabled) |
| `first_login_password_changed` | TINYINT(1) | NULL | — | DEFAULT 0 |
| `created_at` | TIMESTAMP | NULL | — | DEFAULT CURRENT_TIMESTAMP |
| `gender` | VARCHAR(50) | NULL | — | Added via ALTER TABLE |
| `city` | VARCHAR(255) | NULL | — | Added via ALTER TABLE |
| `preferred_room_type` | VARCHAR(100) | NULL | — | Added via ALTER TABLE |
| `updated_at` | TIMESTAMP | NULL | — | ON UPDATE CURRENT_TIMESTAMP |

> NOTE: The `room_preference` column was removed via migration `remove_room_preference.sql` (2026-06-16).

---

### Table 4: `rooms`
Master room inventory. Stores all room types, pricing, amenities, and current status.

| Column | Data Type | NULL | AUTO_INCREMENT | Notes |
|--------|-----------|------|----------------|-------|
| `room_id` | INT | NOT NULL | YES (PK) | Unique room identifier |
| `room_number` | VARCHAR(50) | NOT NULL | — | UNIQUE — e.g., "101", "201A" |
| `room_type` | ENUM | NOT NULL | — | 'Standard', 'Deluxe', 'Executive Suite', 'Presidential Suite' |
| `room_name` | VARCHAR(255) | NOT NULL | — | Display name |
| `capacity` | INT | NOT NULL | — | Max number of guests |
| `amenities` | JSON | NOT NULL | — | Array of amenity strings |
| `price_per_night` | DECIMAL(10,2) | NOT NULL | — | Base tariff in INR |
| `room_status` | ENUM | NULL | — | DEFAULT 'Available'; 'Available', 'Occupied', 'Dirty', 'Maintenance' |
| `image_url` | TEXT | NOT NULL | — | Main room image URL |
| `gallery_images` | JSON | NULL | — | Array of additional image URLs |
| `description` | TEXT | NULL | — | Room marketing description |
| `size_sqft` | INT | NULL | — | Room size in square feet |
| `bed_type` | VARCHAR(100) | NULL | — | e.g., King, Twin, Queen |
| `view_type` | VARCHAR(100) | NULL | — | e.g., City View, Garden View |
| `reviews` | JSON | NULL | — | Array of review objects |
| `created_at` | TIMESTAMP | NULL | — | DEFAULT CURRENT_TIMESTAMP |

---

### Table 5: `bookings`
Core transactional table. Each record represents one room booking.

| Column | Data Type | NULL | AUTO_INCREMENT | Notes |
|--------|-----------|------|----------------|-------|
| `booking_id` | INT | NOT NULL | YES (PK) | Unique booking identifier |
| `guest_id` | INT | NOT NULL | — | FK → guests(guest_id) CASCADE |
| `room_id` | INT | NOT NULL | — | FK → rooms(room_id) CASCADE |
| `check_in_date` | DATE | NOT NULL | — | Planned check-in date |
| `check_out_date` | DATE | NOT NULL | — | Planned check-out date |
| `booking_status` | ENUM | NULL | — | DEFAULT 'Pending'; 'Pending', 'Confirmed', 'Verified', 'Checked-In', 'Checked-Out', 'Cancelled' |
| `booking_source` | ENUM | NULL | — | DEFAULT 'Website'; 'Website', 'Phone', 'Walk-in', 'Corporate', 'OTA' |
| `assigned_staff` | VARCHAR(255) | NULL | — | Staff member handling booking |
| `is_archived` | TINYINT(1) | NULL | — | DEFAULT 0 (soft-delete flag) |
| `created_at` | TIMESTAMP | NULL | — | DEFAULT CURRENT_TIMESTAMP |

> Indexes: `idx_booking_dates` (check_in_date, check_out_date), `idx_booking_status` (booking_status)

---

### Table 6: `active_stays`
Tracks guests who are currently checked in. Created on check-in; deleted on checkout.

| Column | Data Type | NULL | AUTO_INCREMENT | Notes |
|--------|-----------|------|----------------|-------|
| `stay_id` | INT | NOT NULL | YES (PK) | Unique stay identifier |
| `booking_id` | INT | NOT NULL | — | FK → bookings(booking_id) CASCADE; UNIQUE |
| `guest_id` | INT | NOT NULL | — | FK → guests(guest_id) CASCADE |
| `room_id` | INT | NOT NULL | — | FK → rooms(room_id) CASCADE |
| `check_in_at` | TIMESTAMP | NULL | — | DEFAULT CURRENT_TIMESTAMP |
| `expected_check_out` | TIMESTAMP | NOT NULL | — | Expected checkout datetime |
| `status` | VARCHAR(50) | NULL | — | DEFAULT 'Checked-In' |

---

### Table 7: `stay_history`
Permanent historical record of all completed or cancelled stays.

| Column | Data Type | NULL | AUTO_INCREMENT | Notes |
|--------|-----------|------|----------------|-------|
| `history_id` | INT | NOT NULL | YES (PK) | Unique history record ID |
| `booking_id` | INT | NOT NULL | — | FK → bookings(booking_id) CASCADE; UNIQUE |
| `guest_id` | INT | NOT NULL | — | FK → guests(guest_id) CASCADE |
| `room_id` | INT | NOT NULL | — | FK → rooms(room_id) CASCADE |
| `check_in_date` | DATE | NOT NULL | — | Original check-in date |
| `check_out_date` | DATE | NOT NULL | — | Original check-out date |
| `actual_checkout_at` | TIMESTAMP | NULL | — | DEFAULT CURRENT_TIMESTAMP |
| `status` | ENUM | NOT NULL | — | 'Checked-Out' or 'Cancelled' |
| `total_amount` | DECIMAL(10,2) | NULL | — | DEFAULT 0.00; SUM of payments |
| `notes` | TEXT | NULL | — | Optional remarks |

---

### Table 8: `payments`
Financial records linked to bookings.

| Column | Data Type | NULL | AUTO_INCREMENT | Notes |
|--------|-----------|------|----------------|-------|
| `payment_id` | INT | NOT NULL | YES (PK) | Unique payment identifier |
| `booking_id` | INT | NOT NULL | — | FK → bookings(booking_id) CASCADE |
| `amount` | DECIMAL(10,2) | NOT NULL | — | Total amount (base + GST) in INR |
| `gst_amount` | DECIMAL(10,2) | NOT NULL | — | GST component (12% or 18%) |
| `payment_method` | ENUM | NOT NULL | — | 'UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash' |
| `payment_status` | ENUM | NULL | — | DEFAULT 'Pending'; 'Pending', 'Paid', 'Refunded' |
| `transaction_reference` | VARCHAR(255) | NOT NULL | — | UNIQUE — System-generated TXN ref |
| `payment_date` | TIMESTAMP | NULL | — | DEFAULT CURRENT_TIMESTAMP |

---

### Table 9: `housekeeping`
Tracks room cleaning tasks. Auto-generated when a room becomes 'Dirty' after checkout.

| Column | Data Type | NULL | AUTO_INCREMENT | Notes |
|--------|-----------|------|----------------|-------|
| `task_id` | INT | NOT NULL | YES (PK) | Unique task identifier |
| `room_id` | INT | NOT NULL | — | FK → rooms(room_id) CASCADE |
| `assigned_staff` | VARCHAR(255) | NOT NULL | — | Staff assigned to clean |
| `task_status` | ENUM | NULL | — | DEFAULT 'Pending'; 'Pending', 'In Progress', 'Completed' |
| `completion_time` | TIMESTAMP | NULL | — | Set when status → 'Completed' |
| `created_at` | TIMESTAMP | NULL | — | DEFAULT CURRENT_TIMESTAMP |

---

### Table 10: `room_service_requests`
Guest in-room service orders during active stays.

| Column | Data Type | NULL | AUTO_INCREMENT | Notes |
|--------|-----------|------|----------------|-------|
| `request_id` | INT | NOT NULL | YES (PK) | Unique request identifier |
| `guest_id` | INT | NOT NULL | — | FK → guests(guest_id) CASCADE |
| `room_id` | INT | NOT NULL | — | FK → rooms(room_id) CASCADE |
| `booking_id` | INT | NULL | — | FK → bookings(booking_id) CASCADE (optional) |
| `request_type` | VARCHAR(255) | NOT NULL | — | e.g., "Masala Dosa", "Extra Towels" |
| `request_status` | ENUM | NULL | — | DEFAULT 'Pending'; 'Pending', 'In Progress', 'Delivered', 'Cancelled' |
| `created_at` | TIMESTAMP | NULL | — | DEFAULT CURRENT_TIMESTAMP |
| `assigned_staff` | VARCHAR(255) | NULL | — | Added via ALTER TABLE at startup |

---

### Table 11: `complaints`
Guest complaints with AI-determined priority levels.

| Column | Data Type | NULL | AUTO_INCREMENT | Notes |
|--------|-----------|------|----------------|-------|
| `complaint_id` | INT | NOT NULL | YES (PK) | Unique complaint identifier |
| `guest_id` | INT | NOT NULL | — | FK → guests(guest_id) CASCADE |
| `room_id` | INT | NULL | — | FK → rooms(room_id) CASCADE (optional) |
| `booking_id` | INT | NULL | — | FK → bookings(booking_id) CASCADE (optional) |
| `complaint_category` | VARCHAR(255) | NOT NULL | — | Category of complaint |
| `complaint_description` | TEXT | NOT NULL | — | Detailed description |
| `priority_level` | ENUM | NOT NULL | — | 'Low', 'Medium', 'High', 'Critical' — set by Gemini AI |
| `complaint_status` | ENUM | NULL | — | DEFAULT 'Pending'; 'Pending', 'In Progress', 'Resolved' |
| `created_at` | TIMESTAMP | NULL | — | DEFAULT CURRENT_TIMESTAMP |
| `assigned_staff` | VARCHAR(255) | NULL | — | Added via ALTER TABLE at startup |

---

### Table 12: `feedback`
Guest satisfaction ratings and comments.

| Column | Data Type | NULL | AUTO_INCREMENT | Notes |
|--------|-----------|------|----------------|-------|
| `feedback_id` | INT | NOT NULL | YES (PK) | Unique feedback identifier |
| `guest_id` | INT | NOT NULL | — | FK → guests(guest_id) CASCADE |
| `rating` | INT | NOT NULL | — | CHECK (1 ≤ rating ≤ 5) |
| `comments` | TEXT | NOT NULL | — | Guest's written feedback |
| `submitted_at` | TIMESTAMP | NULL | — | DEFAULT CURRENT_TIMESTAMP |

---

### Table 13: `corporate_bookings`
Standalone corporate / bulk booking inquiry requests.

| Column | Data Type | NULL | AUTO_INCREMENT | Notes |
|--------|-----------|------|----------------|-------|
| `corporate_booking_id` | INT | NOT NULL | YES (PK) | Unique corporate booking ID |
| `company_name` | VARCHAR(255) | NOT NULL | — | Requesting company name |
| `contact_person` | VARCHAR(255) | NOT NULL | — | Point of contact name |
| `contact_email` | VARCHAR(255) | NOT NULL | — | Contact email |
| `contact_phone` | VARCHAR(50) | NOT NULL | — | Contact phone |
| `number_of_rooms` | INT | NOT NULL | — | Number of rooms requested |
| `booking_dates` | VARCHAR(255) | NOT NULL | — | Date range string e.g. "2026-06-10 to 2026-06-15" |
| `booking_status` | ENUM | NULL | — | DEFAULT 'Pending'; 'Pending', 'Approved', 'Rejected' |
| `created_at` | TIMESTAMP | NULL | — | DEFAULT CURRENT_TIMESTAMP |

---

### Table 14: `room_availability`
Day-by-day availability calendar for each room.

| Column | Data Type | NULL | AUTO_INCREMENT | Notes |
|--------|-----------|------|----------------|-------|
| `availability_id` | INT | NOT NULL | YES (PK) | Unique slot identifier |
| `room_id` | INT | NOT NULL | — | FK → rooms(room_id) CASCADE |
| `available_date` | DATE | NOT NULL | — | Specific calendar date |
| `availability_status` | ENUM | NULL | — | DEFAULT 'Available'; 'Available', 'Booked', 'Blocked' |

> UNIQUE constraint: `uq_room_date (room_id, available_date)` — prevents duplicate date entries per room.
> Index: `idx_avail_date (available_date)`

---

### Table 15: `communication_history`
Logs all WhatsApp and Email communications sent to guests.

| Column | Data Type | NULL | AUTO_INCREMENT | Notes |
|--------|-----------|------|----------------|-------|
| `log_id` | INT | NOT NULL | YES (PK) | Unique log identifier |
| `guest_id_str` | VARCHAR(100) | NOT NULL | — | INDEXED — Soft ref to guest_accounts |
| `guest_name` | VARCHAR(255) | NOT NULL | — | Guest full name |
| `communication_type` | VARCHAR(255) | NOT NULL | — | e.g., "Guest Login Credentials" |
| `channel` | ENUM | NOT NULL | — | 'WhatsApp' or 'Email' |
| `status_info` | VARCHAR(255) | NOT NULL | — | Delivery status (emoji-coded) |
| `timestamp` | TIMESTAMP | NULL | — | DEFAULT CURRENT_TIMESTAMP |
| `staff_member` | VARCHAR(255) | NOT NULL | — | Staff who triggered dispatch |
| `delivery_attempts` | INT | NULL | — | DEFAULT 1 |
| `failure_reason` | TEXT | NULL | — | Error message if failed |
| `recipient_email` | VARCHAR(255) | NULL | — | Target email or phone |
| `api_response` | TEXT | NULL | — | Raw API response |
| `error_code` | VARCHAR(100) | NULL | — | API error code |

---

### Table 16: `front_desk_records`
Generic audit log for front desk events (JSON payloads).

| Column | Data Type | NULL | AUTO_INCREMENT | Notes |
|--------|-----------|------|----------------|-------|
| `id` | INT | NOT NULL | YES (PK) | Unique record identifier |
| `ref_type` | VARCHAR(100) | NOT NULL | — | Event type e.g. "GUEST_SELF_REGISTER" |
| `ref_id` | INT | NULL | — | Related record ID |
| `payload` | JSON | NOT NULL | — | Full event details as JSON |
| `created_at` | TIMESTAMP | NULL | — | DEFAULT CURRENT_TIMESTAMP |

---

## 3. Primary Keys and Foreign Keys Documentation

| # | Table Name | Primary Key | Foreign Key Column | Referenced Table | Relationship |
|---|-----------|-------------|-------------------|-----------------|--------------|
| 1 | `staff_accounts` | `staff_id` | — | — | Standalone, no FK |
| 2 | `guests` | `guest_id` | — | — | Root table, referenced by 6 child tables |
| 3 | `guest_accounts` | `account_id` | `email` (soft) | `guests` (email) | Soft link — One guest → One account |
| 4 | `rooms` | `room_id` | — | — | Root table, referenced by 5 child tables |
| 5 | `bookings` | `booking_id` | `guest_id` | `guests(guest_id)` | Many bookings → One guest (Many-to-One) |
| 6 | `bookings` | `booking_id` | `room_id` | `rooms(room_id)` | Many bookings → One room (Many-to-One) |
| 7 | `active_stays` | `stay_id` | `booking_id` (UNIQUE) | `bookings(booking_id)` | One active stay ↔ One booking (One-to-One) |
| 8 | `active_stays` | `stay_id` | `guest_id` | `guests(guest_id)` | Many stays → One guest (Many-to-One) |
| 9 | `active_stays` | `stay_id` | `room_id` | `rooms(room_id)` | Many stays → One room (Many-to-One) |
| 10 | `stay_history` | `history_id` | `booking_id` (UNIQUE) | `bookings(booking_id)` | One history ↔ One booking (One-to-One) |
| 11 | `stay_history` | `history_id` | `guest_id` | `guests(guest_id)` | Many history records → One guest |
| 12 | `stay_history` | `history_id` | `room_id` | `rooms(room_id)` | Many history records → One room |
| 13 | `payments` | `payment_id` | `booking_id` | `bookings(booking_id)` | Many payments → One booking (Many-to-One) |
| 14 | `housekeeping` | `task_id` | `room_id` | `rooms(room_id)` | Many tasks → One room (Many-to-One) |
| 15 | `room_service_requests` | `request_id` | `guest_id` | `guests(guest_id)` | Many requests → One guest (Many-to-One) |
| 16 | `room_service_requests` | `request_id` | `room_id` | `rooms(room_id)` | Many requests → One room (Many-to-One) |
| 17 | `room_service_requests` | `request_id` | `booking_id` | `bookings(booking_id)` | Many requests → One booking (Many-to-One) |
| 18 | `complaints` | `complaint_id` | `guest_id` | `guests(guest_id)` | Many complaints → One guest (Many-to-One) |
| 19 | `complaints` | `complaint_id` | `room_id` | `rooms(room_id)` | Many complaints → One room (optional FK) |
| 20 | `complaints` | `complaint_id` | `booking_id` | `bookings(booking_id)` | Many complaints → One booking (optional FK) |
| 21 | `feedback` | `feedback_id` | `guest_id` | `guests(guest_id)` | Many feedback entries → One guest (Many-to-One) |
| 22 | `room_availability` | `availability_id` | `room_id` | `rooms(room_id)` | Many date slots → One room (Many-to-One) |
| 23 | `corporate_bookings` | `corporate_booking_id` | — | — | Standalone, no FK |
| 24 | `communication_history` | `log_id` | `guest_id_str` (soft) | `guest_accounts` | Soft link via guest_id_str |
| 25 | `front_desk_records` | `id` | — | — | Generic audit log, no FK |

---

## 4. Railway MySQL Database Schema Documentation

### 4.1 Database Overview

The **hotel_management** database is hosted on **Railway MySQL** and contains **16 tables** organized into functional areas:

| Functional Area | Tables |
|-----------------|--------|
| Identity & Access | `guests`, `guest_accounts`, `staff_accounts` |
| Room Management | `rooms`, `room_availability` |
| Booking Lifecycle | `bookings`, `active_stays`, `stay_history` |
| Financial | `payments` |
| Operations | `housekeeping`, `room_service_requests` |
| Guest Experience | `complaints`, `feedback`, `corporate_bookings` |
| Audit & Communications | `communication_history`, `front_desk_records` |

---

### 4.2 Purpose of Each Table

#### `staff_accounts`
Stores all hotel employees across five departments: Administration, Front Desk, Housekeeping, Food & Beverage, and Security. Staff records are used for authentication and assignment of tasks. This table is **never cleared** during system resets — it is a permanent reference table preserved across all operational data resets.

#### `guests`
The primary identity table. Every guest who makes a booking gets a record here (identified by email to prevent duplicates). This table holds PII (Personally Identifiable Information): full name, email, phone, address, and government ID. All booking, complaint, feedback, room-service, and stay history records reference this table via `guest_id`.

#### `guest_accounts`
Provides controlled portal access to guests. Front desk staff create accounts manually, or guests self-register. Each account has a unique `guest_id_str` (e.g., `SNP2026001`) and a `username`. The `is_activated` flag is programmatically toggled: set to `1` (active) when the guest checks in, and `0` (deactivated) when they check out. Credentials are dispatched via WhatsApp and Email.

#### `rooms`
The master room inventory. Rooms are pre-seeded and never deleted. The `room_status` column changes dynamically through the guest lifecycle: `Available` → `Occupied` (check-in) → `Dirty` (checkout) → `Available` (housekeeping completed). Amenities, gallery images, and reviews are stored as MySQL **JSON** columns for flexibility.

#### `bookings`
The central transactional table. Created atomically in a MySQL transaction that simultaneously writes to `guests`, `payments`, and `room_availability`. The `booking_status` ENUM drives the entire guest lifecycle: Pending → Confirmed → Verified → Checked-In → Checked-Out / Cancelled. The `is_archived` flag soft-deletes completed records.

#### `active_stays`
A real-time snapshot of who is currently in the hotel. A record is inserted using `ON DUPLICATE KEY UPDATE` when booking status changes to `Checked-In`, and deleted when the guest checks out. This table is joined with `guests` and `rooms` for the Front Desk live dashboard.

#### `stay_history`
The permanent guest ledger. A record is written using `ON DUPLICATE KEY UPDATE` when a booking reaches `Checked-Out` or `Cancelled`. It stores `total_amount = SUM(payments.amount)` for that booking. This drives the guest-facing Receipts/Invoices tab and PDF invoice generation.

#### `payments`
Records each financial transaction. Created during the booking transaction with `payment_status = 'Paid'` and a system-generated `transaction_reference` (format: `TXN` + 12 digits). GST is calculated at **18%** for rooms priced ≥ ₹7,500/night and **12%** for lower-priced rooms, per Indian GST regulations.

#### `housekeeping`
Auto-generated when a room transitions to `Dirty` status after checkout. Each task is tracked through `Pending → In Progress → Completed`. When marked `Completed`, the system automatically sets `rooms.room_status = 'Available'`, removes stale `active_stays` records, and resets `room_availability` slots.

#### `room_service_requests`
Allows checked-in guests to submit dining and amenity requests through the guest portal's Dining tab. Each request links to the guest's active booking and room. Staff fulfill orders by updating `request_status` through `Pending → In Progress → Delivered / Cancelled`.

#### `complaints`
Receives guest complaints submitted through the Issues tab. Each complaint is automatically prioritized by **Google Gemini AI** (model: `gemini-2.5-flash`) into four levels: Low, Medium, High, or Critical. A deterministic rule-based fallback handles cases where AI is unavailable. The `room_id` and `booking_id` FKs are optional (NULL-able) and resolved from the guest's active booking at submission time.

#### `feedback`
Stores star ratings (1–5) and text comments submitted by guests. If the guest's email is not found in `guests`, a minimal record is auto-created. Feedback is joined with `bookings` and `rooms` in query results to display stay context in the Hotel Manager dashboard.

#### `corporate_bookings`
A standalone inquiry table for B2B bulk bookings. It does **not** create individual room or guest records — it is a preliminary inquiry form. Hotel managers approve or reject these requests. No FK relationships are defined; this is intentionally decoupled from the core booking system.

#### `room_availability`
A date-by-date slot table for each room. When a booking is created, one row per date (from check-in to day before check-out) is inserted with `availability_status = 'Booked'` using `ON DUPLICATE KEY UPDATE`. On cancellation, slots are reset to `'Available'`. This prevents double-booking and powers the Real-Time Availability Checker in the guest portal.

#### `communication_history`
Tracks all automated message dispatches (WhatsApp via Meta Business API and Email via Gmail/Nodemailer). Each dispatch creates two log entries (one per channel). Delivery status progresses through emoji-coded states:
`🔵 In Progress` → `🟡 Pending Delivery` → `🟢 Delivered Successfully` / `🔴 Delivery Failed`.
The `guest_id_str` is a soft reference (not a hard FK) to `guest_accounts` for flexibility.

#### `front_desk_records`
A generic JSON audit log for front desk events. Currently populated during guest self-registration with event type `GUEST_SELF_REGISTER`. The `payload` column stores structured JSON with full event details. This table is extensible — new event types can be logged without schema changes.

---

### 4.3 Table Relationships Explained

```
┌─────────────────────────────────────────────────────────────┐
│          COMPLETE RELATIONSHIP MAP                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  guests ──(1:N)──► bookings ──(1:1)──► active_stays        │
│    │                  │  │  └──(1:1)──► stay_history        │
│    │                  │  └──(1:N)────► payments             │
│    │                  │                                     │
│    ├──(1:N)──► feedback                                     │
│    ├──(1:N)──► complaints ◄─(FK)── rooms, bookings          │
│    └──(1:N)──► room_service_requests ◄─(FK)── rooms,booking │
│                                                             │
│  rooms ──(1:N)──► bookings                                  │
│    │                                                        │
│    ├──(1:N)──► housekeeping                                 │
│    ├──(1:N)──► room_availability                            │
│    ├──(1:N)──► active_stays                                 │
│    └──(1:N)──► stay_history                                 │
│                                                             │
│  guest_accounts ──(soft via email)──► guests                │
│  communication_history ──(soft via guest_id_str)──► guest_accounts │
│                                                             │
│  staff_accounts        — Independent (no FK)                │
│  corporate_bookings    — Independent (no FK)                │
│  front_desk_records    — Independent (no FK)                │
└─────────────────────────────────────────────────────────────┘
```

**Relationship Types:**
- `guests → bookings` : One guest can have many bookings (1:N)
- `rooms → bookings` : One room can be booked many times across different date periods (1:N)
- `bookings → active_stays` : One booking creates exactly one active stay (1:1, enforced by UNIQUE key)
- `bookings → stay_history` : One booking creates exactly one history record (1:1, enforced by UNIQUE key)
- `bookings → payments` : One booking has one payment record (functionally 1:1 in current flow)
- `rooms → housekeeping` : One room can have many housekeeping tasks over its lifetime (1:N)
- `rooms → room_availability` : One room has many date-availability slots (1:N)
- `guests → feedback/complaints/room_service_requests` : One guest → many records (1:N)

---

### 4.4 Data Flow — How Bookings Work (Step-by-Step)

```
STEP 1: Guest submits booking form (name, email, room, dates, payment method)
   │
   ▼
STEP 2: START TRANSACTION
   ├── Check if guest exists in `guests` by email
   │     ├── YES → reuse existing guest_id
   │     └── NO  → INSERT INTO guests (full_name, email, mobile_number, address, government_id)
   │
   ├── Verify room exists in `rooms` table
   │
   ├── Check `room_availability` for conflicting 'Booked' slots on requested dates
   │     └── If conflict found → ROLLBACK and return error
   │
   ├── INSERT INTO bookings (..., booking_status='Pending', booking_source='Website')
   │
   ├── For each date from check_in_date to check_out_date:
   │     INSERT INTO room_availability (room_id, available_date, availability_status='Booked')
   │     ON DUPLICATE KEY UPDATE availability_status='Booked'
   │
   ├── Calculate GST:
   │     price_per_night ≥ ₹7,500 → GST = 18%
   │     price_per_night <  ₹7,500 → GST = 12%
   │     total_amount = (price_per_night × nights) + gst_amount
   │
   ├── Generate transaction_reference = 'TXN' + 12-digit random number
   ├── INSERT INTO payments (booking_id, amount, gst_amount, method, status='Paid', txn_ref)
   │
   └── COMMIT → return booking, guest, payment objects to API

STEP 3: Front desk reviews → updates booking_status
        Pending → Confirmed → Verified

STEP 4: Front desk marks CHECK-IN:
   ├── UPDATE rooms SET room_status = 'Occupied'
   ├── UPDATE guest_accounts SET is_activated = 1
   └── INSERT INTO active_stays (booking_id, guest_id, room_id, expected_check_out)
         ON DUPLICATE KEY UPDATE status = 'Checked-In'

STEP 5: Front desk marks CHECK-OUT:
   ├── UPDATE rooms SET room_status = 'Dirty'
   ├── UPDATE guest_accounts SET is_activated = 0
   │     (only if guest has no other active checked-in bookings)
   ├── INSERT INTO housekeeping (room_id, assigned_staff, task_status='Pending')
   ├── DELETE FROM active_stays WHERE booking_id = ?
   └── INSERT INTO stay_history
         (booking_id, guest_id, room_id, check_in, check_out, status='Checked-Out',
          total_amount = COALESCE(SUM(payments.amount), 0.00))
         ON DUPLICATE KEY UPDATE status, total_amount

STEP 6: Housekeeping task marked COMPLETED:
   ├── UPDATE rooms SET room_status = 'Available'
   ├── DELETE FROM active_stays (stale records for that room)
   └── UPDATE room_availability SET availability_status = 'Available' (past booked slots)
```

---

### 4.5 Data Flow — How Payments Work

```
Booking Created
   └── payments record INSERTED (payment_status = 'Paid')
         ├── amount = price_per_night × nights + gst_amount
         ├── gst_amount = amount × GST_rate
         │     ├── price_per_night ≥ ₹7,500 → 18% GST
         │     └── price_per_night <  ₹7,500 → 12% GST
         └── transaction_reference = 'TXN' + 12-digit random

stay_history.total_amount
   └── = COALESCE(SELECT SUM(amount) FROM payments WHERE booking_id = ?, 0.00)
```

---

### 4.6 Data Flow — How Guest Accounts & Communication Work

```
ACCOUNT CREATION:
   Front desk creates account (POST /api/auth/guest-accounts)
      └── OR guest self-registers (POST /api/auth/register)
            └── Logs to front_desk_records (event: GUEST_SELF_REGISTER, payload: JSON)

CREDENTIAL DISPATCH:
   Two communication_history records created (WhatsApp + Email)
      ├── status_info = '🔵 In Progress'
      ├── Updated to '🟡 Pending Delivery'
      └── After async dispatch:
            ├── SUCCESS → '🟢 Delivered Successfully'
            └── FAILURE → '🔴 Delivery Failed' + failure_reason stored

GUEST PORTAL LOGIN:
   guest_accounts lookup by:
      username / guest_id_str / email / mobile_number + password

CHECK-IN:
   guest_accounts.is_activated = 1 (account enabled)

CHECK-OUT:
   guest_accounts.is_activated = 0 (account deactivated)
   (Only if no other active Checked-In bookings exist for this guest)
```

---

### 4.7 Data Flow — How Housekeeping Works

```
booking_status → 'Checked-Out'
   └── rooms.room_status = 'Dirty'
   └── INSERT INTO housekeeping (room_id, assigned_staff, task_status='Pending')

Staff updates housekeeping task:
   Pending → In Progress → Completed

On 'Completed':
   └── rooms.room_status = 'Available'
   └── DELETE FROM active_stays (stale room records)
   └── UPDATE room_availability SET availability_status = 'Available'
```

---

### 4.8 Data Flow — How Complaints & Feedback Work

```
COMPLAINTS:
Guest submits complaint (Issues tab)
   ├── System looks up guest_id from guests table by email
   ├── Resolves room_id and booking_id from active booking (if not provided)
   ├── Google Gemini AI (gemini-2.5-flash) classifies priority:
   │     Low / Medium / High / Critical
   │     (Falls back to rule-based logic if AI unavailable)
   └── INSERT INTO complaints (guest_id, room_id, booking_id, category, description, priority, status='Pending')

Staff updates complaint_status: Pending → In Progress → Resolved

FEEDBACK:
Guest submits rating + comments
   ├── System looks up guest_id by email
   │     └── Creates minimal guest record if not found
   └── INSERT INTO feedback (guest_id, rating, comments)
```

---

## 5. Summary Table — All 16 Tables at a Glance

| # | Table Name | PK Column | FK Count | AUTO_INCREMENT | Engine | Charset |
|---|-----------|-----------|----------|----------------|--------|---------|
| 1 | `staff_accounts` | `staff_id` | 0 | YES | InnoDB | utf8mb4 |
| 2 | `guests` | `guest_id` | 0 | YES | InnoDB | utf8mb4 |
| 3 | `guest_accounts` | `account_id` | 0 (soft) | YES | InnoDB | utf8mb4 |
| 4 | `rooms` | `room_id` | 0 | YES | InnoDB | utf8mb4 |
| 5 | `bookings` | `booking_id` | 2 | YES | InnoDB | utf8mb4 |
| 6 | `active_stays` | `stay_id` | 3 | YES | InnoDB | utf8mb4 |
| 7 | `stay_history` | `history_id` | 3 | YES | InnoDB | utf8mb4 |
| 8 | `payments` | `payment_id` | 1 | YES | InnoDB | utf8mb4 |
| 9 | `housekeeping` | `task_id` | 1 | YES | InnoDB | utf8mb4 |
| 10 | `room_service_requests` | `request_id` | 3 | YES | InnoDB | utf8mb4 |
| 11 | `complaints` | `complaint_id` | 3 | YES | InnoDB | utf8mb4 |
| 12 | `feedback` | `feedback_id` | 1 | YES | InnoDB | utf8mb4 |
| 13 | `corporate_bookings` | `corporate_booking_id` | 0 | YES | InnoDB | utf8mb4 |
| 14 | `room_availability` | `availability_id` | 1 | YES | InnoDB | utf8mb4 |
| 15 | `communication_history` | `log_id` | 0 (soft) | YES | InnoDB | utf8mb4 |
| 16 | `front_desk_records` | `id` | 0 | YES | InnoDB | utf8mb4 |

> **Total Hard Foreign Keys:** 20  
> **Total Soft Links (no FK constraint):** 2  
> **All tables:** InnoDB Engine | utf8mb4 Charset | ON DELETE CASCADE on all FKs

---

## 6. ENUM Values Quick Reference

| Table | Column | ENUM Values |
|-------|--------|-------------|
| `staff_accounts` | `department` | 'Administration', 'Front Desk', 'Housekeeping', 'Food & Beverage', 'Security' |
| `rooms` | `room_type` | 'Standard', 'Deluxe', 'Executive Suite', 'Presidential Suite' |
| `rooms` | `room_status` | 'Available', 'Occupied', 'Dirty', 'Maintenance' |
| `bookings` | `booking_status` | 'Pending', 'Confirmed', 'Verified', 'Checked-In', 'Checked-Out', 'Cancelled' |
| `bookings` | `booking_source` | 'Website', 'Phone', 'Walk-in', 'Corporate', 'OTA' |
| `payments` | `payment_method` | 'UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash' |
| `payments` | `payment_status` | 'Pending', 'Paid', 'Refunded' |
| `housekeeping` | `task_status` | 'Pending', 'In Progress', 'Completed' |
| `room_service_requests` | `request_status` | 'Pending', 'In Progress', 'Delivered', 'Cancelled' |
| `complaints` | `priority_level` | 'Low', 'Medium', 'High', 'Critical' |
| `complaints` | `complaint_status` | 'Pending', 'In Progress', 'Resolved' |
| `stay_history` | `status` | 'Checked-Out', 'Cancelled' |
| `corporate_bookings` | `booking_status` | 'Pending', 'Approved', 'Rejected' |
| `room_availability` | `availability_status` | 'Available', 'Booked', 'Blocked' |
| `communication_history` | `channel` | 'WhatsApp', 'Email' |

---

*Document generated from project source code — Sai Nirvana Plaza Hotel Room Booking System*
*Database: `hotel_management` | Host: Railway MySQL (thomas.proxy.rlwy.net:32576)*
*Engine: InnoDB | Charset: utf8mb4 | Total Tables: 16*
