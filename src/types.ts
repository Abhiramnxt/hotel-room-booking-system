/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// User roles in the application
export type UserRole = 'Guest' | 'Front Desk Staff' | 'Housekeeping Staff' | 'Housekeeping Team' | 'Hotel Manager' | 'Accounts Staff';

// Tables definitions as in the requested MySQL Database
export interface Guest {
  guest_id: number;
  full_name: string;
  email: string;
  mobile_number: string;
  address: string;
  government_id: string; // Adhaar Card, PAN, Passport
  created_at: string;
  gender?: string;
  city?: string;
  preferred_room_type?: string;
  updated_at?: string;
}

export interface Room {
  room_id: number;
  room_number: string;
  room_type: 'Standard' | 'Deluxe' | 'Executive Suite' | 'Presidential Suite';
  capacity: number;
  amenities: string[]; // JSON stored as comma separated or JSON in DB
  price_per_night: number;
  room_status: 'Available' | 'Occupied' | 'Dirty' | 'Maintenance';
  image_url: string;
  created_at: string;
  room_name?: string;
  gallery_images?: string[];
  description?: string;
  size_sqft?: number;
  bed_type?: string;
  view_type?: string;
  reviews?: { reviewer: string; rating: number; comment: string; date: string }[];
}

export interface Booking {
  booking_id: number;
  guest_id: number;
  room_id: number;
  check_in_date: string;
  check_out_date: string;
  booking_status: 'Pending' | 'Confirmed' | 'Verified' | 'Checked-In' | 'Checked-Out' | 'Cancelled';
  booking_source: 'Website' | 'Phone' | 'Walk-in' | 'Corporate' | 'OTA';
  assigned_staff: string;
  created_at: string;
  // Join fields for UI ease
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  room_number?: string;
  room_type?: string;
  price_per_night?: number;
  is_archived?: boolean;
}

export interface Payment {
  payment_id: number;
  booking_id: number;
  amount: number;
  gst_amount: number;
  payment_method: 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Cash';
  payment_status: 'Pending' | 'Paid' | 'Refunded';
  transaction_reference: string;
  payment_date: string;
}

export interface HousekeepingTask {
  task_id: number;
  room_id: number;
  assigned_staff: string;
  task_status: 'Pending' | 'In Progress' | 'Completed';
  completion_time: string | null;
  created_at: string;
  // join fields
  room_number?: string;
  room_type?: string;
}

export interface RoomServiceRequest {
  request_id: number;
  guest_id: number;
  room_id: number;
  request_type: string; // e.g., Food, Towels, Water, Laundry
  request_status: 'Pending' | 'In Progress' | 'Delivered' | 'Cancelled';
  assigned_staff?: string;
  created_at: string;
  // join fields
  room_number?: string;
  guest_name?: string;
}

export interface Complaint {
  complaint_id: number;
  guest_id: number;
  room_id: number;
  booking_id: number;
  complaint_category:
    | 'Room Cleaning / Guest Services'
    | 'Air Conditioning Problem'
    | 'Wi-Fi Internet Disconnections'
    | 'Television / DTH Issue'
    | 'Plumbing / Water Leakage'
    | 'Environmental Noise Complaint'
    | 'Room Service Delay'
    | 'Other Specific Concerns';
  complaint_description: string;
  priority_level: 'Low' | 'Medium' | 'High' | 'Critical';
  complaint_status: 'Pending' | 'In Progress' | 'Resolved';
  assigned_staff?: string;
  created_at: string;
  // join fields
  guest_name?: string;
  room_number?: string;
}

export interface Feedback {
  feedback_id: number;
  guest_id: number;
  rating: number; // 1-5
  comments: string;
  submitted_at: string;
  // join fields
  guest_name?: string;
  guest_email?: string;
  // booking & room join fields
  booking_id?: number;
  room_number?: string;
  check_in_date?: string;
  check_out_date?: string;
  feedback_status?: 'Pending Review' | 'Reviewed';
}

export interface CorporateBooking {
  corporate_booking_id: number;
  company_name: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  number_of_rooms: number;
  booking_dates: string; // e.g. "2026-06-10 to 2026-06-15"
  booking_status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
}

export interface Staff {
  staff_id: number;
  staff_name: string;
  department: 'Administration' | 'Front Desk' | 'Housekeeping' | 'Food & Beverage' | 'Security';
  role: string;
  email: string;
  phone_number: string;
}

export interface RoomAvailability {
  availability_id: number;
  room_id: number;
  available_date: string;
  availability_status: 'Available' | 'Booked' | 'Blocked';
}

// Relational query log for UI display
export interface SqlQueryLog {
  id: string;
  timestamp: string;
  query: string;
  tables_involved: string[];
  execution_time_ms: number;
  status: 'SUCCESS' | 'ERROR';
}

// AI suggestions configuration
export interface AiRecommendation {
  original_room_id: number;
  recommended_room_id: number;
  reason: string;
  discount_applied_percent: number;
  extra_amenities_highlighted: string[];
}

export interface GuestAccount {
  account_id: number;
  guest_id_str: string; // SNP2026xxx
  username: string; // guest_snpxxx
  password_hash: string; // Clear text / Simple hash representing encrypted password
  full_name: string;
  mobile_number: string;
  email: string;
  stay_duration: string;
  is_activated: boolean;
  first_login_password_changed: boolean;
  created_at: string;
  gender?: string;
  city?: string;
  preferred_room_type?: string;
  updated_at?: string;
}

export interface CommunicationLog {
  log_id: number;
  guest_id_str: string;
  guest_name: string;
  communication_type: string; // "Guest Login Credentials"
  channel: 'WhatsApp' | 'Email';
  status_info: '🟢 Delivered Successfully' | '🟡 Pending Delivery' | '🔵 In Progress' | '🟠 Retrying' | '🔴 Delivery Failed';
  timestamp: string;
  staff_member: string;
  delivery_attempts: number;
  failure_reason: string;
  recipient_email?: string;
  api_response?: string;
  error_code?: string;
}


