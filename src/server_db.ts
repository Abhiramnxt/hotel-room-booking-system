/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { 
  Guest, Room, Booking, Payment, HousekeepingTask, 
  RoomServiceRequest, Complaint, Feedback, CorporateBooking, 
  Staff, RoomAvailability, SqlQueryLog, GuestAccount, CommunicationLog
} from './types.js';
import { getRoomUniqueGalleryUrls } from './image_data.js';

// Define DB persistence path
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
const DB_FILE_PATH = isVercel
  ? path.join('/tmp', 'mock_mysql_data.json')
  : path.join(process.cwd(), 'mock_mysql_data.json');

// Interface for DB state
export interface DatabaseState {
  guests: Guest[];
  rooms: Room[];
  bookings: Booking[];
  payments: Payment[];
  housekeeping: HousekeepingTask[];
  room_service_requests: RoomServiceRequest[];
  complaints: Complaint[];
  feedback: Feedback[];
  corporate_bookings: CorporateBooking[];
  staff: Staff[];
  room_availability: RoomAvailability[];
  guest_accounts: GuestAccount[];
  communication_logs: CommunicationLog[];
}

// Initial records to bootstrap the operational database
const INITIAL_STAFF: Staff[] = [
  { staff_id: 1, staff_name: "Rahul Sharma", department: "Front Desk", role: "Manager", email: "rahul.desk@sai-nirvana.com", phone_number: "+91 9876543210" },
  { staff_id: 2, staff_name: "Amit Patel", department: "Housekeeping", role: "Supervisor", email: "amit.clean@sai-nirvana.com", phone_number: "+91 9876543211" },
  { staff_id: 3, staff_name: "Pooja Roy", department: "Administration", role: "General Admin", email: "pooja.admin@sai-nirvana.com", phone_number: "+91 9876543212" },
  { staff_id: 4, staff_name: "Karan Singh", department: "Housekeeping", role: "Cleaner", email: "karan.k@sai-nirvana.com", phone_number: "+91 9876543213" },
];

const GENERATED_ROOMS: Room[] = [];

// Base images for generation
const STANDARD_IMAGES = [
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c",
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511",
  "https://images.unsplash.com/photo-1584622650111-993a426fbf0a",
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c",
  "https://images.unsplash.com/photo-1618773928121-c32242e63f39",
  "https://images.unsplash.com/photo-1566665797739-1674de7a421a",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427",
  "https://images.unsplash.com/photo-1540518614846-7eded433c457",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3"
];

const DELUXE_IMAGES = [
  "https://images.unsplash.com/photo-1618773928121-c32242e63f39",
  "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427",
  "https://images.unsplash.com/photo-1591088398332-8a7791972843",
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
  "https://images.unsplash.com/photo-1540518614846-7eded433c457",
  "https://images.unsplash.com/photo-1566665797739-1674de7a421a",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3"
];

const EXECUTIVE_IMAGES = [
  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461",
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304",
  "https://images.unsplash.com/photo-1584622781564-1d987f7333c1",
  "https://images.unsplash.com/photo-1618773928121-c32242e63f39",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd",
  "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b",
  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461",
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511",
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c"
];

const PRESIDENTIAL_IMAGES = [
  "https://images.unsplash.com/photo-1611891405118-4783a66d1160",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427",
  "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b",
  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461",
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd",
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c",
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511",
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b"
];

const VIEWS = ["Garden View", "Poolside View", "Plaza Frontage", "Dwarka Skyline View", "Atrium Oasis", "Forest Edge", "City Panorama"];
const STANDARD_NAMES = ["Cozy Cabin", "Alpine Cabin", "Compact Cabin", "Hideaway Cabin", "Soloist Cabin", "Zen Cabin", "Nature Cabin", "Urban Cabin", "Vista Cabin", "Nest Cabin", "Pine Cabin", "Hearth Cabin", "Refuge Cabin"];
const DELUXE_NAMES = ["Grand Deluxe", "Oasis Deluxe", "Signature Deluxe", "Zen Deluxe", "Orchard Deluxe", "Saffron Deluxe", "Royal Heritage Deluxe", "Meridian Deluxe", "Aura Deluxe", "Plaza Deluxe", "Sands Deluxe", "Valley Deluxe", "Urbanite Deluxe"];
const EXECUTIVE_NAMES = ["Elite Suite", "Imperial Suite", "Summit Suite", "Sovereign Suite", "Club Lounge Suite", "Regency Suite", "Connoisseur Suite", "Aero Suite", "Metropolis Suite", "Aerie Suite", "Governor's Suite", "Bespoke Suite", "Diplomat Suite"];
const PRESIDENTIAL_NAMES = ["Maharaja Penthouse", "Kohinoor Royal Suite", "Viceroy Grand Suite", "Crown Sovereign Penthouse", "Antara Celestial Presidential", "Lotus Heaven Suite", "Nirvana Sanctuary", "Skyline Overlook Penthouse", "Infinity Haven Suite", "Oasis Regal Pavillion", "Mayur Royal Suite", "Grand Imperial Mansion", "Apex Sky Residence"];

// Helper to make unique images lists for each room
function makeGallery(images: string[], roomId: number): string[] {
  return images.map((img, idx) => `${img}?auto=format&fit=crop&w=1200&q=80&sig=${roomId * 100 + idx}`);
}

// Generate Standard Cabins (13 rooms)
for (let i = 0; i < 13; i++) {
  const roomId = i + 1;
  const roomNum = (101 + i).toString();
  const price = 2500 + i * 160; 
  const isAvailable = [0, 2, 4, 5, 7, 8, 10, 11, 12].includes(i); 
  const status = isAvailable ? 'Available' : (i % 3 === 0 ? 'Occupied' : (i % 3 === 1 ? 'Dirty' : 'Maintenance'));
  const gallery = getRoomUniqueGalleryUrls('Standard', i);
  
  GENERATED_ROOMS.push({
    room_id: roomId,
    room_number: roomNum,
    room_type: 'Standard',
    room_name: `Standard ${STANDARD_NAMES[i % STANDARD_NAMES.length]} ${roomNum}`,
    capacity: 2,
    amenities: ["Air Conditioning", "Free Wi-Fi", "Smart TV", "Hot Water Kettle", "Bathroom Amenities", "Safe Locker", "Workspace"],
    price_per_night: price,
    room_status: status as any,
    image_url: gallery[0],
    gallery_images: gallery,
    description: `A comfortable, well-appointed Standard Cabin offering exceptional value, space-efficient luxury, and premium linen at Sai Nirvana Plaza. Designed specifically for corporate solo travelers and couples seeking a quiet refuge.`,
    size_sqft: 280 + (i * 10),
    bed_type: i % 2 === 0 ? "Queen Sized Bed" : "Double Twin Beds",
    view_type: VIEWS[i % VIEWS.length],
    reviews: [
      { reviewer: "Amit Verma", rating: 5, comment: "Crisp cooling and super fast high speed Wi-Fi. Perfect cozy cabin stay!", date: "2026-05-15" },
      { reviewer: "Sneha Nair", rating: 4, comment: "Very clean bathrooms, great room service and support from reception.", date: "2026-05-22" }
    ],
    created_at: new Date().toISOString()
  });
}

// Generate Premium Deluxe (13 rooms)
for (let i = 0; i < 13; i++) {
  const roomId = i + 14;
  const roomNum = (201 + i).toString();
  const price = 5000 + i * 280; 
  const isAvailable = [0, 2, 3, 5, 6, 8, 9, 11, 12].includes(i);
  const status = isAvailable ? 'Available' : (i % 3 === 0 ? 'Occupied' : (i % 3 === 1 ? 'Dirty' : 'Maintenance'));
  const gallery = getRoomUniqueGalleryUrls('Deluxe', i);

  GENERATED_ROOMS.push({
    room_id: roomId,
    room_number: roomNum,
    room_type: 'Deluxe', 
    room_name: `Premium ${DELUXE_NAMES[i % DELUXE_NAMES.length]} ${roomNum}`,
    capacity: 3,
    amenities: ["Air Conditioning", "Smart TV", "Free Wi-Fi", "Mini Refrigerator", "Balcony", "Coffee Maker", "Workspace", "Safe Locker", "Room Service"],
    price_per_night: price,
    room_status: status as any,
    image_url: gallery[0],
    gallery_images: gallery,
    description: `Indulge in spacious comfort and custom wooden design details in our Premium Deluxe rooms. Each chamber opens to private balconies offering expansive resort views, modern mini coffee stations, and highly sanitized premium workspaces.`,
    size_sqft: 450 + (i * 15),
    bed_type: "King Sized Bed",
    view_type: VIEWS[(i + 2) % VIEWS.length],
    reviews: [
      { reviewer: "Rohan Kapoor", rating: 5, comment: "The balcony view is outstanding. Loved the French-press coffee maker setup!", date: "2026-05-18" },
      { reviewer: "Meera Das", rating: 4, comment: "Spacious layout, very luxurious bedding. Instant checkin support.", date: "2026-05-28" }
    ],
    created_at: new Date().toISOString()
  });
}

// Generate Executive Suite (13 rooms)
for (let i = 0; i < 13; i++) {
  const roomId = i + 27;
  const roomNum = (301 + i).toString();
  const price = 9000 + i * 480; 
  const isAvailable = [0, 1, 3, 4, 6, 7, 9, 10, 12].includes(i);
  const status = isAvailable ? 'Available' : (i % 3 === 0 ? 'Occupied' : (i % 3 === 1 ? 'Dirty' : 'Maintenance'));
  const gallery = getRoomUniqueGalleryUrls('Executive Suite', i);

  GENERATED_ROOMS.push({
    room_id: roomId,
    room_number: roomNum,
    room_type: 'Executive Suite',
    room_name: `Executive Suite - ${EXECUTIVE_NAMES[i % EXECUTIVE_NAMES.length]} ${roomNum}`,
    capacity: 4,
    amenities: ["Air Conditioning", "Free Wi-Fi", "Two Smart TVs", "Living Area", "Bathtub", "Mini Refrigerator", "Balcony", "Coffee Maker", "Safe Locker", "Room Service", "Workspace"],
    price_per_night: price,
    room_status: status as any,
    image_url: gallery[0],
    gallery_images: gallery,
    description: `Designed for executives and families, our Executive Suites integrate a completely separated master bedroom and an elegant living/reception lounge. Masterfully prepared with deep porcelain bathtubs, private workspace niches, and premium room service amenities.`,
    size_sqft: 850 + (i * 20),
    bed_type: "Grand King Premium Sized Bed",
    view_type: VIEWS[(i + 4) % VIEWS.length],
    reviews: [
      { reviewer: "Vijay Singhal", rating: 5, comment: "Perfect for family. Separate lounge allows and premium sound system was superb.", date: "2026-05-11" },
      { reviewer: "Kriti Sen", rating: 5, comment: "Excellent executive bathtub, clean linen and outstanding in-room menu offerings.", date: "2026-06-01" }
    ],
    created_at: new Date().toISOString()
  });
}

// Generate Presidential Suite (13 rooms)
for (let i = 0; i < 13; i++) {
  const roomId = i + 40;
  const roomNum = (401 + i).toString();
  const price = 18000 + i * 2600; 
  const isAvailable = [0, 1, 2, 4, 5, 7, 8, 9, 11, 12].includes(i);
  const status = isAvailable ? 'Available' : (i % 3 === 0 ? 'Occupied' : (i % 3 === 1 ? 'Dirty' : 'Maintenance'));
  const gallery = getRoomUniqueGalleryUrls('Presidential Suite', i);

  GENERATED_ROOMS.push({
    room_id: roomId,
    room_number: roomNum,
    room_type: 'Presidential Suite',
    room_name: `Presidential Suite: ${PRESIDENTIAL_NAMES[i % PRESIDENTIAL_NAMES.length]} ${roomNum}`,
    capacity: 6,
    amenities: ["Air Conditioning", "Free Wi-Fi", "Three Smart TVs", "Spacious Lounge", "Private Jacuzzi", "24/7 Butler Service", "Mini Refrigerator", "Balcony", "Bathtub", "Safe Locker", "Workspace", "Room Service"],
    price_per_night: price,
    room_status: status as any,
    image_url: gallery[0],
    gallery_images: gallery,
    description: `The pinnacle of luxury at Sai Nirvana Plaza. Experience state-of-the-art living dining area, bespoke hand-woven carpets, standard 24/7 designated private Butler attention, private wrap-around outdoor terrace, and a private Jacuzzi center with elite styling.`,
    size_sqft: 1800 + (i * 50),
    bed_type: "Super Emperor Royal Bed",
    view_type: "Full Skyline Panorama View",
    reviews: [
      { reviewer: "Nandini Goel", rating: 5, comment: "Words fail to describe the luxury. The private Jacuzzi and butler support was beyond royal standard.", date: "2026-05-20" },
      { reviewer: "Suresh Prabhu", rating: 5, comment: "Stayed here for a board meeting retreat. True architectural masterpiece.", date: "2026-06-03" }
    ],
    created_at: new Date().toISOString()
  });
}

const INITIAL_ROOMS: Room[] = GENERATED_ROOMS;

const INITIAL_GUESTS: Guest[] = [
  { guest_id: 1, full_name: "Rajesh Kumar", email: "rajesh@gmail.com", mobile_number: "+91 9812345678", address: "Sector 15, Dwarka, New Delhi", government_id: "Aadhaar: 1234-5678-9012", created_at: new Date().toISOString() },
  { guest_id: 2, full_name: "Priyanka Sharma", email: "priyanka@yahoo.com", mobile_number: "+91 9876543215", address: "Andheri West, Mumbai", government_id: "Passport: Z1234567", created_at: new Date().toISOString() },
  { guest_id: 3, full_name: "Abhiram Thunikipati", email: "thunikipatiabhiram173@gmail.com", mobile_number: "+91 9876543210", address: "Premium Lounge Building, Dwarka", government_id: "Aadhaar: 7421-5678-9011", created_at: new Date().toISOString() },
  // Additional guests booked under Abhiram's account (same email = same account owner)
  { guest_id: 4, full_name: "Ravi Shankar", email: "thunikipatiabhiram173@gmail.com", mobile_number: "+91 9876543210", address: "Premium Lounge Building, Dwarka", government_id: "Aadhaar: 1111-2222-3333", created_at: new Date().toISOString() },
  { guest_id: 5, full_name: "Kumar Reddy", email: "thunikipatiabhiram173@gmail.com", mobile_number: "+91 9876543210", address: "Premium Lounge Building, Dwarka", government_id: "Aadhaar: 4444-5555-6666", created_at: new Date().toISOString() }
];

const INITIAL_BOOKINGS: Booking[] = [
  {
    booking_id: 1, guest_id: 1, room_id: 1, check_in_date: "2026-06-03", check_out_date: "2026-06-07",
    booking_status: "Checked-In", booking_source: "Website", assigned_staff: "Rahul Sharma",
    created_at: new Date().toISOString()
  },
  {
    booking_id: 2, guest_id: 2, room_id: 14, check_in_date: "2026-06-02", check_out_date: "2026-06-05",
    booking_status: "Checked-In", booking_source: "Corporate", assigned_staff: "Rahul Sharma",
    created_at: new Date().toISOString()
  },
  // Abhiram's account — 3 active bookings for 3 different guests (demonstrating multi-stay)
  {
    booking_id: 3, guest_id: 3, room_id: 16, check_in_date: "2026-06-04", check_out_date: "2026-06-09",
    booking_status: "Checked-In", booking_source: "Website", assigned_staff: "Rahul Sharma",
    created_at: new Date().toISOString()
  },
  {
    booking_id: 4, guest_id: 4, room_id: 3, check_in_date: "2026-06-05", check_out_date: "2026-06-10",
    booking_status: "Checked-In", booking_source: "Website", assigned_staff: "Rahul Sharma",
    created_at: new Date().toISOString()
  },
  {
    booking_id: 5, guest_id: 5, room_id: 5, check_in_date: "2026-06-06", check_out_date: "2026-06-11",
    booking_status: "Checked-In", booking_source: "Website", assigned_staff: "Rahul Sharma",
    created_at: new Date().toISOString()
  },
  // Historic Checked-Out Bookings for history and receipt validation
  {
    booking_id: 11, guest_id: 1, room_id: 2, check_in_date: "2026-05-12", check_out_date: "2026-05-15",
    booking_status: "Checked-Out", booking_source: "Website", assigned_staff: "Rahul Sharma",
    created_at: new Date().toISOString()
  },
  {
    booking_id: 12, guest_id: 2, room_id: 15, check_in_date: "2026-05-18", check_out_date: "2026-05-22",
    booking_status: "Checked-Out", booking_source: "Website", assigned_staff: "Aman Sen",
    created_at: new Date().toISOString()
  },
  {
    booking_id: 13, guest_id: 3, room_id: 27, check_in_date: "2026-05-20", check_out_date: "2026-05-23",
    booking_status: "Checked-Out", booking_source: "Website", assigned_staff: "Rahul Sharma",
    created_at: new Date().toISOString()
  }
];

const INITIAL_PAYMENTS: Payment[] = [
  { payment_id: 1, booking_id: 1, amount: 11200, gst_amount: 1344, payment_method: "UPI", payment_status: "Paid", transaction_reference: "TXN983218931221", payment_date: new Date().toISOString() },
  { payment_id: 2, booking_id: 2, amount: 17700, gst_amount: 2700, payment_method: "Credit Card", payment_status: "Paid", transaction_reference: "TXN772183921009", payment_date: new Date().toISOString() },
  { payment_id: 3, booking_id: 3, amount: 29500, gst_amount: 4500, payment_method: "UPI", payment_status: "Paid", transaction_reference: "TXN551293021983", payment_date: new Date().toISOString() },
  // Abhiram's multi-booking payments (Ravi and Kumar booked under same account)
  { payment_id: 4, booking_id: 4, amount: 14336, gst_amount: 1536, payment_method: "UPI", payment_status: "Paid", transaction_reference: "TXN441293021101", payment_date: new Date().toISOString() },
  { payment_id: 5, booking_id: 5, amount: 16240, gst_amount: 1740, payment_method: "Net Banking", payment_status: "Paid", transaction_reference: "TXN551293021103", payment_date: new Date().toISOString() },
  // Historical Payments
  { payment_id: 11, booking_id: 11, amount: 8400, gst_amount: 900, payment_method: "Net Banking", payment_status: "Paid", transaction_reference: "TXN110948572019", payment_date: new Date().toISOString() },
  { payment_id: 12, booking_id: 12, amount: 23600, gst_amount: 3600, payment_method: "Credit Card", payment_status: "Paid", transaction_reference: "TXN120938472516", payment_date: new Date().toISOString() },
  { payment_id: 13, booking_id: 13, amount: 31860, gst_amount: 4860, payment_method: "UPI", payment_status: "Paid", transaction_reference: "TXN130294812328", payment_date: new Date().toISOString() }
];

const INITIAL_FEEDBACK: Feedback[] = [
  { feedback_id: 1, guest_id: 1, rating: 5, comments: "Exceptional welcome drinks and polite staff. Sai Nirvana Plaza is highly recommended for families!", submitted_at: new Date().toISOString() },
  { feedback_id: 2, guest_id: 2, rating: 4, comments: "Very clean Executive Suite, prompt room details presentation. GST calculations were detailed.", submitted_at: new Date().toISOString() }
];

const INITIAL_COMPLAINTS: Complaint[] = [
  { complaint_id: 1, guest_id: 1, complaint_category: "Wi-Fi", complaint_description: "Wi-Fi internet speed drops in bedroom area. Needs router check.", priority_level: "Medium", complaint_status: "Resolved", created_at: new Date().toISOString() }
];

// In-Memory state loaded from file or bootstrapped
let state: DatabaseState = {
  guests: INITIAL_GUESTS,
  rooms: INITIAL_ROOMS,
  bookings: INITIAL_BOOKINGS,
  payments: INITIAL_PAYMENTS,
  housekeeping: [],
  room_service_requests: [],
  complaints: INITIAL_COMPLAINTS,
  feedback: INITIAL_FEEDBACK,
  corporate_bookings: [],
  staff: INITIAL_STAFF,
  room_availability: [],
  guest_accounts: [
    {
      account_id: 1,
      guest_id_str: "SNP2026001",
      username: "guest_snp001",
      password_hash: "Temp@123",
      full_name: "Abhiram Thunikipati",
      mobile_number: "+91 9876543210",
      email: "thunikipatiabhiram173@gmail.com",
      stay_duration: "5 Nights",
      room_preference: "Premium Deluxe",
      is_activated: true,
      first_login_password_changed: true,
      created_at: new Date().toISOString()
    },
    {
      account_id: 2,
      guest_id_str: "SNP2026002",
      username: "guest_snp002",
      password_hash: "Temp@123",
      full_name: "Rajesh Kumar",
      mobile_number: "+91 9812345678",
      email: "rajesh@gmail.com",
      stay_duration: "4 Nights",
      room_preference: "Standard Room",
      is_activated: true,
      first_login_password_changed: true,
      created_at: new Date().toISOString()
    },
    {
      account_id: 3,
      guest_id_str: "SNP2026003",
      username: "guest_snp003",
      password_hash: "Temp@123",
      full_name: "Priyanka Sharma",
      mobile_number: "+91 9876543215",
      email: "priyanka@yahoo.com",
      stay_duration: "3 Nights",
      room_preference: "Premium Deluxe",
      is_activated: true,
      first_login_password_changed: true,
      created_at: new Date().toISOString()
    }
  ],
  communication_logs: [
    {
      log_id: 1,
      guest_id_str: "SNP2026001",
      guest_name: "Abhiram Thunikipati",
      communication_type: "Guest Login Credentials",
      channel: "WhatsApp",
      status_info: "🟢 Delivered Successfully",
      timestamp: "2026-06-04T10:45:00Z",
      staff_member: "Reception Admin",
      delivery_attempts: 1,
      failure_reason: ""
    },
    {
      log_id: 2,
      guest_id_str: "SNP2026001",
      guest_name: "Abhiram Thunikipati",
      communication_type: "Guest Login Credentials",
      channel: "Email",
      status_info: "🟢 Delivered Successfully",
      timestamp: "2026-06-04T10:45:00Z",
      staff_member: "Reception Admin",
      delivery_attempts: 1,
      failure_reason: ""
    },
    {
      log_id: 3,
      guest_id_str: "SNP2026001",
      guest_name: "Abhiram Thunikipati",
      communication_type: "Booking Confirmation",
      channel: "WhatsApp",
      status_info: "🟢 Delivered Successfully",
      timestamp: "2026-06-04T10:45:00Z",
      staff_member: "Reception Admin",
      delivery_attempts: 1,
      failure_reason: ""
    }
  ]
};

// SQL query logs
let queryLogs: SqlQueryLog[] = [];

// Helper to save database state
function saveDB() {
  fs.writeFile(DB_FILE_PATH, JSON.stringify(state, null, 2), (err) => {
    if (err) {
      console.error("Error writing mock DB file asynchronously:", err);
    }
  });
}

// Bootstrap DB
export function initDB() {
  if (isVercel && !fs.existsSync(DB_FILE_PATH)) {
    const committedPath = path.join(process.cwd(), 'mock_mysql_data.json');
    if (fs.existsSync(committedPath)) {
      try {
        fs.writeFileSync(DB_FILE_PATH, fs.readFileSync(committedPath));
        console.log("[Database] Successfully copied initial DB state to Vercel /tmp folder.");
      } catch (err) {
        console.error("Error copying initial DB state to Vercel /tmp:", err);
      }
    }
  }

  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      state = JSON.parse(data);
      let updated = false;
      if (!state.guest_accounts || state.guest_accounts.length < 3 || !state.guests || state.guests.length < 5 || !state.bookings || state.bookings.length < 8) {
        state.guest_accounts = [
          {
            account_id: 1,
            guest_id_str: "SNP2026001",
            username: "guest_snp001",
            password_hash: "Temp@123",
            full_name: "Abhiram Thunikipati",
            mobile_number: "+91 9876543210",
            email: "thunikipatiabhiram173@gmail.com",
            stay_duration: "5 Nights",
            room_preference: "Premium Deluxe",
            is_activated: true,
            first_login_password_changed: true,
            created_at: new Date().toISOString()
          },
          {
            account_id: 2,
            guest_id_str: "SNP2026002",
            username: "guest_snp002",
            password_hash: "Temp@123",
            full_name: "Rajesh Kumar",
            mobile_number: "+91 9812345678",
            email: "rajesh@gmail.com",
            stay_duration: "4 Nights",
            room_preference: "Standard Room",
            is_activated: true,
            first_login_password_changed: true,
            created_at: new Date().toISOString()
          },
          {
            account_id: 3,
            guest_id_str: "SNP2026003",
            username: "guest_snp003",
            password_hash: "Temp@123",
            full_name: "Priyanka Sharma",
            mobile_number: "+91 9876543215",
            email: "priyanka@yahoo.com",
            stay_duration: "3 Nights",
            room_preference: "Premium Deluxe",
            is_activated: true,
            first_login_password_changed: true,
            created_at: new Date().toISOString()
          }
        ];
        state.guests = INITIAL_GUESTS;
        state.bookings = INITIAL_BOOKINGS;
        state.payments = INITIAL_PAYMENTS;
        updated = true;
      }
      if (!state.communication_logs) {
        state.communication_logs = [
          {
            log_id: 1,
            guest_id_str: "SNP2026001",
            guest_name: "Abhiram Thunikipati",
            communication_type: "Guest Login Credentials",
            channel: "WhatsApp",
            status_info: "🟢 Delivered Successfully",
            timestamp: "2026-06-04T10:45:00Z",
            staff_member: "Reception Admin",
            delivery_attempts: 1,
            failure_reason: ""
          },
          {
            log_id: 2,
            guest_id_str: "SNP2026001",
            guest_name: "Abhiram Thunikipati",
            communication_type: "Guest Login Credentials",
            channel: "Email",
            status_info: "🟢 Delivered Successfully",
            timestamp: "2026-06-04T10:45:00Z",
            staff_member: "Reception Admin",
            delivery_attempts: 1,
            failure_reason: ""
          },
          {
            log_id: 3,
            guest_id_str: "SNP2026001",
            guest_name: "Abhiram Thunikipati",
            communication_type: "Booking Confirmation",
            channel: "WhatsApp",
            status_info: "🟢 Delivered Successfully",
            timestamp: "2026-06-04T10:45:00Z",
            staff_member: "Reception Admin",
            delivery_attempts: 1,
            failure_reason: ""
          }
        ];
        updated = true;
      }
      if (!state.rooms || state.rooms.length < 52 || !state.rooms[0].image_url?.includes('photo-1598928506311-c55ded91a20c')) {
        state.rooms = INITIAL_ROOMS;
        updated = true;
      }
      // Migrate all room image URLs to 4K resolution (3840x2160)
      if (state.rooms && Array.isArray(state.rooms)) {
        state.rooms.forEach(r => {
          if (r.image_url && r.image_url.includes('1200x800')) {
            r.image_url = r.image_url.replace(/1200x800/g, '3840x2160');
            updated = true;
          }
          if (r.gallery_images && Array.isArray(r.gallery_images)) {
            r.gallery_images = r.gallery_images.map(img => {
              if (img.includes('1200x800')) {
                updated = true;
                return img.replace(/1200x800/g, '3840x2160');
              }
              return img;
            });
          }
        });
      }
      if (updated) {
        saveDB();
      }
    } catch (err) {
      console.warn("Could not read DB file, booting fresh state", err);
      saveDB();
    }
  } else {
    // Generate initial housekeeping tasks for occupied/dirty rooms
    state.rooms.forEach(r => {
      if (r.room_status === 'Dirty') {
        state.housekeeping.push({
          task_id: state.housekeeping.length + 1,
          room_id: r.room_id,
          assigned_staff: "Karan Singh",
          task_status: "Pending",
          completion_time: null,
          created_at: new Date().toISOString()
        });
      }
    });

    // Generate room availability array for June 2026
    let availId = 1;
    state.rooms.forEach(r => {
      for (let day = 1; day <= 30; day++) {
        const dateStr = `2026-06-${day < 10 ? '0' + day : day}`;
        const isBooked = state.bookings.some(b => 
          b.room_id === r.room_id && 
          b.booking_status !== 'Cancelled' &&
          dateStr >= b.check_in_date && 
          dateStr < b.check_out_date
        );
        state.room_availability.push({
          availability_id: availId++,
          room_id: r.room_id,
          available_date: dateStr,
          availability_status: isBooked ? 'Booked' : 'Available'
        });
      }
    });

    saveDB();
  }
}

// Elegant Raw SQL Simulator with query logger
export function executeQuery<T>(rawSql: string, tablesInvolved: string[], action: () => T): T {
  const start = Date.now();
  try {
    const result = action();
    const duration = Date.now() - start;
    
    // Log query
    queryLogs.unshift({
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      timestamp: new Date().toISOString(),
      query: rawSql,
      tables_involved: tablesInvolved,
      execution_time_ms: Math.max(1, duration),
      status: 'SUCCESS'
    });
    
    // Keep last 150 sql queries
    if (queryLogs.length > 150) queryLogs.pop();
    
    return result;
  } catch (err: any) {
    const duration = Date.now() - start;
    queryLogs.unshift({
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      timestamp: new Date().toISOString(),
      query: rawSql,
      tables_involved: tablesInvolved,
      execution_time_ms: duration,
      status: 'ERROR'
    });
    throw err;
  }
}

// Exposed DB Operations simulating relations and transactions
export const dbOps = {
  getRooms: () => {
    const sql = `SELECT * FROM rooms;`;
    return executeQuery(sql, ['rooms'], () => state.rooms);
  },

  getRoomAvailability: () => {
    const sql = `SELECT * FROM room_availability WHERE available_date BETWEEN '2026-06-01' AND '2026-06-30'`;
    return executeQuery(sql, ['room_availability'], () => state.room_availability);
  },

  getGuests: () => {
    const sql = `SELECT * FROM guests ORDER BY created_at DESC;`;
    return executeQuery(sql, ['guests'], () => state.guests);
  },

  getStaff: () => {
    const sql = `SELECT * FROM staff;`;
    return executeQuery(sql, ['staff'], () => state.staff);
  },

  getSqlLogs: () => {
    return queryLogs;
  },

  clearSqlLogs: () => {
    queryLogs = [];
  },

  getBookings: () => {
    const sql = `
      SELECT b.*, g.full_name AS guest_name, g.email AS guest_email, g.mobile_number AS guest_phone,
             r.room_number, r.room_type, r.price_per_night
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.guest_id
      LEFT JOIN rooms r ON b.room_id = r.room_id
      ORDER BY b.created_at DESC;
    `;
    return executeQuery(sql, ['bookings', 'guests', 'rooms'], () => {
      return state.bookings.map(b => {
        const guest = state.guests.find(g => g.guest_id === b.guest_id);
        const room = state.rooms.find(r => r.room_id === b.room_id);
        return {
          ...b,
          guest_name: guest?.full_name || 'N/A',
          guest_email: guest?.email || 'N/A',
          guest_phone: guest?.mobile_number || 'N/A',
          room_number: room?.room_number || 'N/A',
          room_type: room?.room_type || 'N/A',
          price_per_night: room?.price_per_night || 0
        };
      });
    });
  },

  getHousekeeping: () => {
    const sql = `
      SELECT h.*, r.room_number, r.room_type
      FROM housekeeping h
      LEFT JOIN rooms r ON h.room_id = r.room_id;
    `;
    return executeQuery(sql, ['housekeeping', 'rooms'], () => {
      return state.housekeeping.map(hk => {
        const r = state.rooms.find(room => room.room_id === hk.room_id);
        return {
          ...hk,
          room_number: r?.room_number || '',
          room_type: r?.room_type || ''
        };
      });
    });
  },

  getComplaints: () => {
    const sql = `
      SELECT c.*, g.full_name AS guest_name, r.room_number
      FROM complaints c
      LEFT JOIN guests g ON c.guest_id = g.guest_id
      LEFT JOIN bookings b ON g.guest_id = b.guest_id AND b.booking_status = 'Checked-In'
      LEFT JOIN rooms r ON b.room_id = r.room_id;
    `;
    return executeQuery(sql, ['complaints', 'guests', 'rooms', 'bookings'], () => {
      return state.complaints.map(complaint => {
        const guest = state.guests.find(g => g.guest_id === complaint.guest_id);
        // Find checked-in booking to see current room
        const activeBooking = state.bookings.find(b => b.guest_id === complaint.guest_id && b.booking_status === 'Checked-In');
        const room = activeBooking ? state.rooms.find(r => r.room_id === activeBooking.room_id) : null;
        
        return {
          ...complaint,
          guest_name: guest?.full_name || 'N/A',
          room_number: room?.room_number || 'Walk-in/N/A'
        };
      });
    });
  },

  getFeedback: () => {
    const sql = `
      SELECT f.*, g.full_name AS guest_name, g.email AS guest_email
      FROM feedback f
      LEFT JOIN guests g ON f.guest_id = g.guest_id;
    `;
    return executeQuery(sql, ['feedback', 'guests'], () => {
      return state.feedback.map(fb => {
        const guest = state.guests.find(g => g.guest_id === fb.guest_id);
        return {
          ...fb,
          guest_name: guest?.full_name || 'Anonymous',
          guest_email: guest?.email || ''
        };
      });
    });
  },

  getCorporate: () => {
    const sql = `SELECT * FROM corporate_bookings;`;
    return executeQuery(sql, ['corporate_bookings'], () => state.corporate_bookings);
  },

  getPayments: () => {
    const sql = `SELECT * FROM payments;`;
    return executeQuery(sql, ['payments'], () => state.payments);
  },

  // Insert Operations mimicking atomic transactional insertions
  createBookingTransaction: (bookingData: {
    full_name: string;
    email: string;
    mobile_number: string;
    address: string;
    government_id: string;
    room_id: number;
    check_in_date: string;
    check_out_date: string;
    payment_method: "UPI" | "Credit Card" | "Debit Card" | "Net Banking" | "Cash";
  }) => {
    const sqlTransactionStart = `START TRANSACTION;`;
    executeQuery(sqlTransactionStart, [], () => {});

    // Try finding regular guest by email
    const sqlFindGuest = `SELECT guest_id FROM guests WHERE email = '${bookingData.email}' LIMIT 1;`;
    let guest = executeQuery(sqlFindGuest, ['guests'], () =>
      state.guests.find(g => g.email.toLowerCase() === bookingData.email.toLowerCase())
    );

    if (!guest) {
      const gId = state.guests.length + 1;
      const sqlInsertGuest = `
        INSERT INTO guests (guest_id, full_name, email, mobile_number, address, government_id)
        VALUES (${gId}, '${bookingData.full_name}', '${bookingData.email}', '${bookingData.mobile_number}', '${bookingData.address}', '${bookingData.government_id}');
      `;
      guest = executeQuery(sqlInsertGuest, ['guests'], () => {
        const newGuest: Guest = {
          guest_id: gId,
          full_name: bookingData.full_name,
          email: bookingData.email,
          mobile_number: bookingData.mobile_number,
          address: bookingData.address,
          government_id: bookingData.government_id,
          created_at: new Date().toISOString()
        };
        state.guests.push(newGuest);
        return newGuest;
      });
    }

    // Verify room availability first
    const room = state.rooms.find(r => r.room_id === bookingData.room_id);
    if (!room) {
      throw new Error(`Select room ID ${bookingData.room_id} not found in Relational Index.`);
    }

    // Verify room status availability block
    const sqlCheckAvailability = `
      SELECT availability_status FROM room_availability 
      WHERE room_id = ${bookingData.room_id} AND available_date BETWEEN '${bookingData.check_in_date}' AND '${bookingData.check_out_date}';
    `;
    const isRoomAvailable = executeQuery(sqlCheckAvailability, ['room_availability'], () => {
      // Find days overlapping our stay
      const startDay = new Date(bookingData.check_in_date);
      const endDay = new Date(bookingData.check_out_date);
      const days = [];
      let current = new Date(startDay);
      while (current < endDay) {
        days.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
      return !state.room_availability.some(av => 
        av.room_id === bookingData.room_id && 
        days.includes(av.available_date) && 
        av.availability_status === 'Booked'
      );
    });

    if (!isRoomAvailable) {
      throw new Error(`Room ${room.room_number} is already booked for these selected dates.`);
    }

    // Insert Booking
    const valBookId = state.bookings.length + 1;
    const sqlInsertBooking = `
      INSERT INTO bookings (booking_id, guest_id, room_id, check_in_date, check_out_date, booking_status, booking_source)
      VALUES (${valBookId}, ${guest.guest_id}, ${bookingData.room_id}, '${bookingData.check_in_date}', '${bookingData.check_out_date}', 'Pending', 'Website');
    `;
    const newBooking = executeQuery(sqlInsertBooking, ['bookings'], () => {
      const b: Booking = {
        booking_id: valBookId,
        guest_id: guest!.guest_id,
        room_id: bookingData.room_id,
        check_in_date: bookingData.check_in_date,
        check_out_date: bookingData.check_out_date,
        booking_status: 'Pending',
        booking_source: 'Website',
        assigned_staff: 'Rahul Sharma',
        created_at: new Date().toISOString()
      };
      state.bookings.push(b);
      return b;
    });

    // Make room dates booked
    const startDay = new Date(bookingData.check_in_date);
    const endDay = new Date(bookingData.check_out_date);
    let current = new Date(startDay);
    while (current < endDay) {
      const dStr = current.toISOString().split('T')[0];
      const sqlUpdateAvail = `UPDATE room_availability SET availability_status = 'Booked' WHERE room_id = ${bookingData.room_id} AND available_date = '${dStr}';`;
      executeQuery(sqlUpdateAvail, ['room_availability'], () => {
        const found = state.room_availability.find(av => av.room_id === bookingData.room_id && av.available_date === dStr);
        if (found) {
          found.availability_status = 'Booked';
        } else {
          state.room_availability.push({
            availability_id: state.room_availability.length + 1,
            room_id: bookingData.room_id,
            available_date: dStr,
            availability_status: 'Booked'
          });
        }
      });
      current.setDate(current.getDate() + 1);
    }

    // Calculate dynamic stay pricing & GST taxes
    const stayNights = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)));
    const roomCost = room.price_per_night * stayNights;
    
    // Indian tax laws: 12% GST for standard room (<7500 per night), 18% GST for luxury/suites (>7500 per night)
    const gstRate = room.price_per_night >= 7500 ? 0.18 : 0.12;
    const gstAmount = Math.round(roomCost * gstRate);
    const totalAmount = roomCost + gstAmount;

    // Create transactional payment record
    const payId = state.payments.length + 1;
    const txnRef = `TXN${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    const sqlInsertPayment = `
      INSERT INTO payments (payment_id, booking_id, amount, gst_amount, payment_method, payment_status, transaction_reference)
      VALUES (${payId}, ${newBooking.booking_id}, ${totalAmount}, ${gstAmount}, '${bookingData.payment_method}', 'Paid', '${txnRef}');
    `;
    const newPayment = executeQuery(sqlInsertPayment, ['payments'], () => {
      const p: Payment = {
        payment_id: payId,
        booking_id: newBooking.booking_id,
        amount: totalAmount,
        gst_amount: gstAmount,
        payment_method: bookingData.payment_method,
        payment_status: 'Paid',
        transaction_reference: txnRef,
        payment_date: new Date().toISOString()
      };
      state.payments.push(p);
      return p;
    });

    const sqlCommit = `COMMIT;`;
    executeQuery(sqlCommit, [], () => {});
    
    saveDB();
    return { booking: newBooking, guestObject: guest, payment: newPayment };
  },

  archiveBooking: (bookingId: number, isArchived: boolean) => {
    const sql = `UPDATE bookings SET is_archived = ${isArchived ? 1 : 0} WHERE booking_id = ${bookingId};`;
    return executeQuery(sql, ['bookings'], () => {
      const found = state.bookings.find(b => b.booking_id === bookingId);
      if (!found) throw new Error("Booking record not encountered.");
      found.is_archived = isArchived;
      saveDB();
      return found;
    });
  },

  updateBookingStatus: (bookingId: number, status: Booking['booking_status']) => {
    const sql = `UPDATE bookings SET booking_status = '${status}' WHERE booking_id = ${bookingId};`;
    return executeQuery(sql, ['bookings'], () => {
      const found = state.bookings.find(b => b.booking_id === bookingId);
      if (!found) throw new Error("Booking record not encountered.");
      found.booking_status = status;
      
      // Relational flow updates:
      // Sync guest account activation status
      const guest = state.guests.find(g => g.guest_id === found.guest_id);
      if (guest) {
        const guestAccount = (state.guest_accounts || []).find(acc => acc.email.toLowerCase() === guest.email.toLowerCase());
        if (guestAccount) {
          if (status === 'Checked-In') {
            const sqlGuestActive = `UPDATE guest_accounts SET is_activated = 1 WHERE account_id = ${guestAccount.account_id};`;
            executeQuery(sqlGuestActive, ['guest_accounts'], () => {
              guestAccount.is_activated = true;
            });
          } else if (status === 'Checked-Out') {
            const otherStays = state.bookings.filter(b => b.guest_id === found.guest_id && b.booking_status === 'Checked-In' && b.booking_id !== bookingId);
            if (otherStays.length === 0) {
              const sqlGuestInactive = `UPDATE guest_accounts SET is_activated = 0 WHERE account_id = ${guestAccount.account_id};`;
              executeQuery(sqlGuestInactive, ['guest_accounts'], () => {
                guestAccount.is_activated = false;
              });
            }
          }
        }
      }

      // If Checked-in, change Room status to Occupied
      // If Checked-out, change Room status to Dirty, and create a Housekeeping Clean Task automatically!
      const room = state.rooms.find(r => r.room_id === found.room_id);
      if (room) {
        if (status === 'Checked-In') {
          const sqlRoomOccupied = `UPDATE rooms SET room_status = 'Occupied' WHERE room_id = ${room.room_id};`;
          executeQuery(sqlRoomOccupied, ['rooms'], () => {
            room.room_status = 'Occupied';
          });
        } else if (status === 'Checked-Out') {
          const sqlRoomDirty = `UPDATE rooms SET room_status = 'Dirty' WHERE room_id = ${room.room_id};`;
          executeQuery(sqlRoomDirty, ['rooms'], () => {
            room.room_status = 'Dirty';
          });

          // Add clean task
          const taskSql = `INSERT INTO housekeeping (room_id, assigned_staff, task_status) VALUES (${room.room_id}, 'Karan Singh', 'Pending');`;
          executeQuery(taskSql, ['housekeeping'], () => {
            state.housekeeping.push({
              task_id: state.housekeeping.length + 1,
              room_id: room.room_id,
              assigned_staff: 'Karan Singh',
              task_status: 'Pending',
              completion_time: null,
              created_at: new Date().toISOString()
            });
          });
        } else if (status === 'Cancelled') {
          // Relieve blocked dates
          const startDay = new Date(found.check_in_date);
          const endDay = new Date(found.check_out_date);
          let current = new Date(startDay);
          while (current < endDay) {
            const dStr = current.toISOString().split('T')[0];
            const sqlRelieve = `UPDATE room_availability SET availability_status = 'Available' WHERE room_id = ${found.room_id} AND available_date = '${dStr}';`;
            executeQuery(sqlRelieve, ['room_availability'], () => {
              const av = state.room_availability.find(a => a.room_id === found.room_id && a.available_date === dStr);
              if (av) av.availability_status = 'Available';
            });
            current.setDate(current.getDate() + 1);
          }
        }
      }
      
      saveDB();
      return found;
    });
  },

  updatePaymentStatus: (paymentId: number, status: "Pending" | "Paid" | "Refunded") => {
    const sql = `UPDATE payments SET payment_status = '${status}' WHERE payment_id = ${paymentId};`;
    return executeQuery(sql, ['payments'], () => {
      const found = state.payments.find(p => p.payment_id === paymentId);
      if (!found) throw new Error("Payment record not found.");
      found.payment_status = status;
      saveDB();
      return found;
    });
  },

  updateHousekeepingTask: (taskId: number, status: HousekeepingTask['task_status']) => {
    const sql = `UPDATE housekeeping SET task_status = '${status}' WHERE task_id = ${taskId};`;
    return executeQuery(sql, ['housekeeping'], () => {
      const found = state.housekeeping.find(t => t.task_id === taskId);
      if (!found) throw new Error("Housekeeping task not found.");
      found.task_status = status;
      if (status === 'Completed') {
        found.completion_time = new Date().toISOString();
        
        // Relational flow update: Change physical Room status back to 'Available'!
        const r = state.rooms.find(room => room.room_id === found.room_id);
        if (r) {
          const sqlRoomAvailable = `UPDATE rooms SET room_status = 'Available' WHERE room_id = ${r.room_id};`;
          executeQuery(sqlRoomAvailable, ['rooms'], () => {
            r.room_status = 'Available';
          });
        }
      }
      saveDB();
      return found;
    });
  },

  submitComplaint: (complaintData: {
    email: string;
    complaint_category: Complaint['complaint_category'];
    complaint_description: string;
    priority_level: Complaint['priority_level'];
  }) => {
    // Find guest ID by email
    const sqlFindGuest = `SELECT guest_id FROM guests WHERE email = '${complaintData.email}' LIMIT 1;`;
    const guest = executeQuery(sqlFindGuest, ['guests'], () => 
      state.guests.find(g => g.email.toLowerCase() === complaintData.email.toLowerCase())
    );

    if (!guest) {
      throw new Error("Only checked-in active guests can submit official complaints. Registered email not found.");
    }

    const compId = state.complaints.length + 1;
    const sqlInsertComplaint = `
      INSERT INTO complaints (complaint_id, guest_id, complaint_category, complaint_description, priority_level, complaint_status)
      VALUES (${compId}, ${guest.guest_id}, '${complaintData.complaint_category}', '${complaintData.complaint_description}', '${complaintData.priority_level}', 'Pending');
    `;
    
    const newComp = executeQuery(sqlInsertComplaint, ['complaints'], () => {
      const c: Complaint = {
        complaint_id: compId,
        guest_id: guest.guest_id,
        complaint_category: complaintData.complaint_category,
        complaint_description: complaintData.complaint_description,
        priority_level: complaintData.priority_level,
        complaint_status: 'Pending',
        created_at: new Date().toISOString()
      };
      state.complaints.push(c);
      return c;
    });

    saveDB();
    return newComp;
  },

  updateComplaintStatus: (complaintId: number, status: Complaint['complaint_status']) => {
    const sql = `UPDATE complaints SET complaint_status = '${status}' WHERE complaint_id = ${complaintId};`;
    return executeQuery(sql, ['complaints'], () => {
      const found = state.complaints.find(c => c.complaint_id === complaintId);
      if (!found) throw new Error("Complaint log has not been found.");
      found.complaint_status = status;
      saveDB();
      return found;
    });
  },

  submitFeedback: (feedbackData: {
    guest_name: string; // Creates simple guest link or stores as anonymous guest id
    email: string;
    rating: number;
    comments: string;
  }) => {
    let guest = state.guests.find(g => g.email.toLowerCase() === feedbackData.email.toLowerCase());
    if (!guest) {
      // Bootstrap guest record
      const gId = state.guests.length + 1;
      const sqlInsertGuest = `INSERT INTO guests (guest_id, full_name, email, mobile_number, address, government_id) VALUES (${gId}, '${feedbackData.guest_name}', '${feedbackData.email}', 'N/A', 'N/A', 'N/A');`;
      guest = executeQuery(sqlInsertGuest, ['guests'], () => {
        const ng: Guest = {
          guest_id: gId,
          full_name: feedbackData.guest_name,
          email: feedbackData.email,
          mobile_number: 'N/A',
          address: 'N/A',
          government_id: 'N/A',
          created_at: new Date().toISOString()
        };
        state.guests.push(ng);
        return ng;
      });
    }

    const fId = state.feedback.length + 1;
    const sqlInsertFeedback = `
      INSERT INTO feedback (feedback_id, guest_id, rating, comments)
      VALUES (${fId}, ${guest.guest_id}, ${feedbackData.rating}, '${feedbackData.comments}');
    `;
    const newFb = executeQuery(sqlInsertFeedback, ['feedback'], () => {
      const fb: Feedback = {
        feedback_id: fId,
        guest_id: guest!.guest_id,
        rating: feedbackData.rating,
        comments: feedbackData.comments,
        submitted_at: new Date().toISOString()
      };
      state.feedback.push(fb);
      return fb;
    });

    saveDB();
    return newFb;
  },

  submitCorporateBooking: (corpData: Omit<CorporateBooking, 'corporate_booking_id' | 'booking_status' | 'created_at'>) => {
    const cId = state.corporate_bookings.length + 1;
    const sql = `
      INSERT INTO corporate_bookings (corporate_booking_id, company_name, contact_person, contact_email, contact_phone, number_of_rooms, booking_dates)
      VALUES (${cId}, '${corpData.company_name}', '${corpData.contact_person}', '${corpData.contact_email}', '${corpData.contact_phone}', ${corpData.number_of_rooms}, '${corpData.booking_dates}');
    `;
    const newCorp = executeQuery(sql, ['corporate_bookings'], () => {
      const cb: CorporateBooking = {
        corporate_booking_id: cId,
        company_name: corpData.company_name,
        contact_person: corpData.contact_person,
        contact_email: corpData.contact_email,
        contact_phone: corpData.contact_phone,
        number_of_rooms: corpData.number_of_rooms,
        booking_dates: corpData.booking_dates,
        booking_status: 'Pending',
        created_at: new Date().toISOString()
      };
      state.corporate_bookings.push(cb);
      return cb;
    });

    saveDB();
    return newCorp;
  },

  updateCorporateBooking: (corpId: number, status: CorporateBooking['booking_status']) => {
    const sql = `UPDATE corporate_bookings SET booking_status = '${status}' WHERE corporate_booking_id = ${corpId};`;
    return executeQuery(sql, ['corporate_bookings'], () => {
      const found = state.corporate_bookings.find(cb => cb.corporate_booking_id === corpId);
      if (!found) throw new Error("Corporate booking not found.");
      found.booking_status = status;
      saveDB();
      return found;
    });
  },

  createRoomServiceRequest: (requestData: {
    email: string;
    request_type: string;
  }) => {
    const guest = state.guests.find(g => g.email.toLowerCase() === requestData.email.toLowerCase());
    if (!guest) throw new Error("Registered email not found. Please log in first.");

    // Find active checked-in booking
    const booking = state.bookings.find(b => b.guest_id === guest.guest_id && b.booking_status === 'Checked-In');
    if (!booking) throw new Error("No active stay checked-in for this user.");

    const rId = state.room_service_requests.length + 1;
    const sql = `
      INSERT INTO room_service_requests (request_id, guest_id, room_id, request_type, request_status)
      VALUES (${rId}, ${guest.guest_id}, ${booking.room_id}, '${requestData.request_type}', 'Pending');
    `;
    const newReq = executeQuery(sql, ['room_service_requests'], () => {
      const r: RoomServiceRequest = {
        request_id: rId,
        guest_id: guest.guest_id,
        room_id: booking.room_id,
        request_type: requestData.request_type,
        request_status: 'Pending',
        created_at: new Date().toISOString()
      };
      state.room_service_requests.push(r);
      return r;
    });

    saveDB();
    return newReq;
  },

  getRoomServiceRequests: () => {
    const sql = `
      SELECT r.*, g.full_name AS guest_name, rm.room_number
      FROM room_service_requests r
      LEFT JOIN guests g ON r.guest_id = g.guest_id
      LEFT JOIN rooms rm ON r.room_id = rm.room_id
    `;
    return executeQuery(sql, ['room_service_requests', 'guests', 'rooms'], () => {
      return state.room_service_requests.map(req => {
        const guest = state.guests.find(g => g.guest_id === req.guest_id);
        const room = state.rooms.find(rm => rm.room_id === req.room_id);
        return {
          ...req,
          guest_name: guest?.full_name || 'N/A',
          room_number: room?.room_number || 'N/A'
        };
      });
    });
  },

  updateRoomServiceStatus: (requestId: number, status: RoomServiceRequest['request_status']) => {
    const sql = `UPDATE room_service_requests SET request_status = '${status}' WHERE request_id = ${requestId};`;
    return executeQuery(sql, ['room_service_requests'], () => {
      const found = state.room_service_requests.find(r => r.request_id === requestId);
      if (!found) throw new Error("Request could not be found.");
      found.request_status = status;
      saveDB();
      return found;
    });
  },

  getGuestAccounts: () => {
    const sql = `
      SELECT ga.*, r.room_number, b.check_in_date, b.check_out_date 
      FROM guest_accounts ga
      LEFT JOIN guests g ON LOWER(ga.email) = LOWER(g.email)
      LEFT JOIN bookings b ON g.guest_id = b.guest_id AND b.booking_status != 'Cancelled'
      LEFT JOIN rooms r ON b.room_id = r.room_id
      ORDER BY ga.created_at DESC;
    `;
    return executeQuery(sql, ['guest_accounts', 'guests', 'bookings', 'rooms'], () => {
      const list = state.guest_accounts || [];
      return list.map(acc => {
        // Relational simulated join
        const guest = state.guests.find(g => g.email.toLowerCase() === acc.email.toLowerCase());
        let room_number = 'Not Booked';
        let check_in_date = 'N/A';
        let check_out_date = 'N/A';
        
        if (guest) {
          // Find any active or latest non-cancelled booking
          const booking = state.bookings
            .filter(b => b.guest_id === guest.guest_id && b.booking_status !== 'Cancelled')
            .sort((a, b) => b.booking_id - a.booking_id)[0];
          
          if (booking) {
            const room = state.rooms.find(r => r.room_id === booking.room_id);
            room_number = room ? `Room ${room.room_number}` : 'N/A';
            check_in_date = booking.check_in_date;
            check_out_date = booking.check_out_date;
          }
        }

        return {
          ...acc,
          room_number,
          check_in_date,
          check_out_date
        } as any;
      });
    });
  },

  createGuestAccount: (data: {
    full_name: string;
    mobile_number: string;
    email: string;
    stay_duration: string;
    room_preference: string;
  }) => {
    const list = state.guest_accounts || [];
    const count = list.length + 1;
    const guest_id_str = `SNP2026${String(count).padStart(3, '0')}`;
    const username = `guest_snp${String(count).padStart(3, '0')}`;
    // Simple secure digits suffix e.g. Temp@567
    const password_hash = `Temp@${Math.floor(100 + Math.random() * 900)}`;

    const actId = list.length + 1;
    const sql = `
      INSERT INTO guest_accounts (account_id, guest_id_str, username, password_hash, full_name, mobile_number, email, stay_duration, room_preference, is_activated, first_login_password_changed)
      VALUES (${actId}, '${guest_id_str}', '${username}', '${password_hash}', '${data.full_name}', '${data.mobile_number}', '${data.email}', '${data.stay_duration}', '${data.room_preference}', 1, 0);
    `;

    return executeQuery(sql, ['guest_accounts'], () => {
      const newAcc: GuestAccount = {
        account_id: actId,
        guest_id_str,
        username,
        password_hash,
        full_name: data.full_name,
        mobile_number: data.mobile_number,
        email: data.email,
        stay_duration: data.stay_duration,
        room_preference: data.room_preference,
        is_activated: true,
        first_login_password_changed: false,
        created_at: new Date().toISOString()
      };

      // Ensure they exist in local guests index as well for relations
      const gId = state.guests.length + 1;
      state.guests.push({
        guest_id: gId,
        full_name: data.full_name,
        email: data.email,
        mobile_number: data.mobile_number,
        address: "Refer to Guest Access Preference in Relational Index",
        government_id: `Verified Guest Account (${guest_id_str})`,
        created_at: new Date().toISOString()
      });

      if (!state.guest_accounts) state.guest_accounts = [];
      state.guest_accounts.push(newAcc);
      saveDB();
      return newAcc;
    });
  },

  updateGuestAccountPassword: (usernameOrGuestId: string, newPass: string) => {
    const sql = `UPDATE guest_accounts SET password_hash = '${newPass}', first_login_password_changed = 1 WHERE username = '${usernameOrGuestId}' OR guest_id_str = '${usernameOrGuestId}';`;
    return executeQuery(sql, ['guest_accounts'], () => {
      const found = (state.guest_accounts || []).find(acc => acc.username === usernameOrGuestId || acc.guest_id_str === usernameOrGuestId);
      if (!found) throw new Error("Credentials reference not encountered in secure Relational index.");
      found.password_hash = newPass;
      found.first_login_password_changed = true;
      saveDB();
      return found;
    });
  },

  toggleGuestAccountActivation: (accountId: number) => {
    const found = (state.guest_accounts || []).find(acc => acc.account_id === accountId);
    if (!found) throw new Error("Account index not found.");
    const nextStatus = !found.is_activated;
    const sql = `UPDATE guest_accounts SET is_activated = ${nextStatus ? 1 : 0} WHERE account_id = ${accountId};`;
    return executeQuery(sql, ['guest_accounts'], () => {
      found.is_activated = nextStatus;
      saveDB();
      return found;
    });
  },

  deleteGuestAccount: (accountId: number) => {
    const list = state.guest_accounts || [];
    const found = list.find(acc => acc.account_id === accountId);
    if (!found) throw new Error("Account index not found.");
    const sql = `DELETE FROM guest_accounts WHERE account_id = ${accountId};`;
    return executeQuery(sql, ['guest_accounts'], () => {
      state.guest_accounts = list.filter(acc => acc.account_id !== accountId);
      saveDB();
      return true;
    });
  },

  getCommunicationLogs: (filterOrGuestIdStr?: string | {
    guest_id_str?: string;
    booking_id?: string | number;
    log_id?: string | number;
    guest_id?: string | number;
  }) => {
    let guestIdStr: string | undefined;
    let guestId: string | number | undefined;
    let bookingId: string | number | undefined;
    let logId: string | number | undefined;

    if (typeof filterOrGuestIdStr === 'string') {
      guestIdStr = filterOrGuestIdStr;
    } else if (filterOrGuestIdStr) {
      guestIdStr = filterOrGuestIdStr.guest_id_str;
      guestId = filterOrGuestIdStr.guest_id;
      bookingId = filterOrGuestIdStr.booking_id;
      logId = filterOrGuestIdStr.log_id;
    }

    // Build a realistic SQL query string for logging purposes
    let sql = "SELECT * FROM communication_logs";
    const conditions: string[] = [];
    if (logId) {
      conditions.push(`log_id = ${logId}`);
    } else if (bookingId) {
      sql = `
        SELECT cl.* FROM communication_logs cl
        JOIN guests g ON cl.guest_name = g.full_name OR cl.recipient_email = g.email OR cl.recipient_email = g.mobile_number
        JOIN bookings b ON g.guest_id = b.guest_id
        WHERE b.booking_id = ${bookingId}
      `;
    } else {
      if (guestIdStr) {
        conditions.push(`guest_id_str = '${guestIdStr}'`);
      }
      if (guestId) {
        conditions.push(`(guest_id_str = 'SNP-GUEST-${guestId}' OR guest_id_str = 'SNP2026${String(guestId).padStart(3, '0')}')`);
      }
    }

    if (conditions.length > 0 && !bookingId) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += " ORDER BY timestamp DESC;";

    return executeQuery(sql, ['communication_logs', 'guests', 'bookings', 'guest_accounts'], () => {
      const logs = state.communication_logs || [];

      // If filtering by specific log_id
      if (logId) {
        return logs.filter(l => l.log_id === Number(logId));
      }

      // Resolve targeted guest info (name, email, phone, ids)
      const targetEmails: string[] = [];
      const targetPhones: string[] = [];
      const targetNames: string[] = [];
      const targetIdStrs: string[] = [];
      let hasFilter = false;

      // 1. If guest_id or booking_id is provided, resolve guest from database
      let resolvedGuestId: number | null = null;
      if (bookingId) {
        hasFilter = true;
        const booking = state.bookings.find(b => String(b.booking_id) === String(bookingId));
        if (booking) {
          resolvedGuestId = booking.guest_id;
        }
      } else if (guestId) {
        hasFilter = true;
        resolvedGuestId = Number(guestId);
      }

      // Look up by guest ID
      if (resolvedGuestId !== null) {
        const guest = state.guests.find(g => g.guest_id === resolvedGuestId);
        if (guest) {
          targetNames.push(guest.full_name.toLowerCase().trim());
          targetEmails.push(guest.email.toLowerCase().trim());
          targetPhones.push(guest.mobile_number.replace(/\D/g, ''));
        }
        targetIdStrs.push(`SNP-GUEST-${resolvedGuestId}`);
        targetIdStrs.push(`SNP-GUEST-${String(resolvedGuestId).padStart(3, '0')}`);
        // Check if there is an account in guest_accounts matching this guest's email/phone/name
        const acc = state.guest_accounts?.find(a => 
          (guest && a.email.toLowerCase() === guest.email.toLowerCase()) ||
          (guest && a.mobile_number.replace(/\D/g, '') === guest.mobile_number.replace(/\D/g, '')) ||
          a.guest_id_str === `SNP2026${String(resolvedGuestId).padStart(3, '0')}`
        );
        if (acc) {
          targetIdStrs.push(acc.guest_id_str);
          targetNames.push(acc.full_name.toLowerCase().trim());
          targetEmails.push(acc.email.toLowerCase().trim());
          targetPhones.push(acc.mobile_number.replace(/\D/g, ''));
        }
      }

      // 2. If guest_id_str is provided
      if (guestIdStr) {
        hasFilter = true;
        targetIdStrs.push(guestIdStr);
        // Find guest account by id str
        const acc = state.guest_accounts?.find(a => a.guest_id_str === guestIdStr);
        if (acc) {
          targetNames.push(acc.full_name.toLowerCase().trim());
          targetEmails.push(acc.email.toLowerCase().trim());
          targetPhones.push(acc.mobile_number.replace(/\D/g, ''));
          // Find the corresponding numeric guest_id
          const guest = state.guests.find(g => g.email.toLowerCase() === acc.email.toLowerCase());
          if (guest) {
            targetIdStrs.push(`SNP-GUEST-${guest.guest_id}`);
            targetIdStrs.push(`SNP-GUEST-${String(guest.guest_id).padStart(3, '0')}`);
          }
        } else {
          // Check if guest_id_str is of format SNP-GUEST-X
          const match = guestIdStr.match(/SNP-GUEST-(\d+)/i);
          if (match) {
            const numericId = Number(match[1]);
            const guest = state.guests.find(g => g.guest_id === numericId);
            if (guest) {
              targetNames.push(guest.full_name.toLowerCase().trim());
              targetEmails.push(guest.email.toLowerCase().trim());
              targetPhones.push(guest.mobile_number.replace(/\D/g, ''));
            }
          }
        }
      }

      // If we resolved search filters, apply strict guest-specific matching
      if (hasFilter) {
        const uniqueIds = Array.from(new Set(targetIdStrs)).filter(Boolean);
        const uniqueNames = Array.from(new Set(targetNames)).filter(Boolean);
        const uniqueEmails = Array.from(new Set(targetEmails)).filter(Boolean);
        const uniquePhones = Array.from(new Set(targetPhones)).filter(Boolean);

        return logs.filter(log => {
          // First, check if the log matches any of the resolved ID strings
          const idMatches = uniqueIds.includes(log.guest_id_str);

          // Second, check if name/email/phone matches to guarantee it's the SAME person (prevents ID clashing)
          const nameMatches = log.guest_name && uniqueNames.includes(log.guest_name.toLowerCase().trim());
          
          let emailOrPhoneMatches = false;
          if (log.recipient_email) {
            const cleanRecipient = log.recipient_email.replace(/\D/g, '');
            const isPhone = /^\+?\d+$/.test(log.recipient_email.replace(/\s+/g, ''));
            
            if (isPhone) {
              emailOrPhoneMatches = uniquePhones.some(phone => 
                cleanRecipient.endsWith(phone) || phone.endsWith(cleanRecipient)
              );
            } else {
              emailOrPhoneMatches = uniqueEmails.includes(log.recipient_email.toLowerCase().trim());
            }
          }

          // A log is a valid match if:
          // The ID matches AND (the guest name matches OR recipient contact matches)
          return idMatches && (nameMatches || emailOrPhoneMatches);
        });
      }

      return logs;
    });
  },

  createCommunicationLog: (logData: {
    guest_id_str: string;
    guest_name: string;
    channel: 'WhatsApp' | 'Email';
    status_info: '🟢 Delivered Successfully' | '🟡 Pending Delivery' | '🔵 In Progress' | '🟠 Retrying' | '🔴 Delivery Failed';
    staff_member: string;
    communication_type: string;
    failure_reason?: string;
    recipient_email?: string;
    api_response?: string;
    error_code?: string;
  }) => {
    const logs = state.communication_logs || [];
    const logId = logs.length + 1;
    const sql = `
      INSERT INTO communication_logs (log_id, guest_id_str, guest_name, communication_type, channel, status_info, timestamp, staff_member, delivery_attempts, failure_reason)
      VALUES (${logId}, '${logData.guest_id_str}', '${logData.guest_name}', '${logData.communication_type}', '${logData.channel}', '${logData.status_info}', NOW(), '${logData.staff_member}', 1, '${logData.failure_reason || ''}');
    `;

    return executeQuery(sql, ['communication_logs'], () => {
      const newLog: CommunicationLog = {
        log_id: logId,
        guest_id_str: logData.guest_id_str,
        guest_name: logData.guest_name,
        communication_type: logData.communication_type,
        channel: logData.channel,
        status_info: logData.status_info,
        timestamp: new Date().toISOString(),
        staff_member: logData.staff_member,
        delivery_attempts: 1,
        failure_reason: logData.failure_reason || "",
        recipient_email: logData.recipient_email,
        api_response: logData.api_response,
        error_code: logData.error_code
      };
      state.communication_logs.push(newLog);
      saveDB();
      return newLog;
    });
  },

  updateCommunicationLogStatus: (
    logId: number,
    status_info: CommunicationLog['status_info'],
    attempts?: number,
    reason?: string,
    recipient_email?: string,
    api_response?: string,
    error_code?: string
  ) => {
    const logs = state.communication_logs || [];
    const sql = `UPDATE communication_logs SET status_info = '${status_info}'${attempts ? `, delivery_attempts = ${attempts}` : ''} WHERE log_id = ${logId};`;
    return executeQuery(sql, ['communication_logs'], () => {
      const found = logs.find(l => l.log_id === logId);
      if (!found) throw new Error("Log record not found.");
      found.status_info = status_info;
      if (attempts !== undefined) {
        found.delivery_attempts = attempts;
      }
      if (reason !== undefined) {
        found.failure_reason = reason;
      }
      if (recipient_email !== undefined) {
        found.recipient_email = recipient_email;
      }
      if (api_response !== undefined) {
        found.api_response = api_response;
      }
      if (error_code !== undefined) {
        found.error_code = error_code;
      }
      found.timestamp = new Date().toISOString();
      saveDB();
      return found;
    });
  }
};
