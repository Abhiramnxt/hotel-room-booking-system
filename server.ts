/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import {GoogleGenAI} from '@google/genai';
import {initDB, dbOps} from './src/server_db.js';
import { validateEnvironment, sendWhatsAppMessage, delay, formatIndianPhoneNumber } from './src/utils/whatsappService.js';
import { validateSendGridEnvironment, sendEmail } from './src/utils/sendgridService.js';

// Validate WhatsApp configuration at startup
const whatsappConfig = validateEnvironment();

// Validate SendGrid configuration at startup
const sendgridConfig = validateSendGridEnvironment();

initDB();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

// Initialize GoogleGenAI lazily to avoid crashing if GEMINI_API_KEY is not defined yet
let googleAiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!googleAiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "") {
      try {
        googleAiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
      } catch (err) {
        console.warn("Exception during Gemini AI client lazy init:", err);
      }
    }
  }
  return googleAiClient;
}

// REST API Endpoints

// 1. Get database live query logs
app.get('/api/database/logs', (req, res) => {
  res.json({ logs: dbOps.getSqlLogs() });
});

// Clear simulation logs
app.post('/api/database/logs/clear', (req, res) => {
  dbOps.clearSqlLogs();
  res.json({ status: 'ok' });
});

app.post('/api/database/query', (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: "No SQL query provided." });
  }

  // Basic SQL Simulation Router
  const lowerQuery = query.toLowerCase().trim();
  try {
    if (lowerQuery.startsWith('select * from rooms') || lowerQuery.startsWith('select * from rooms;')) {
      const data = dbOps.getRooms();
      return res.json({ columns: ['room_id', 'room_number', 'room_type', 'capacity', 'price_per_night', 'room_status'], rows: data });
    }
    if (lowerQuery.startsWith('select * from guests') || lowerQuery.startsWith('select * from guests;')) {
      const data = dbOps.getGuests();
      return res.json({ columns: ['guest_id', 'full_name', 'email', 'mobile_number', 'address', 'government_id'], rows: data });
    }
    if (lowerQuery.startsWith('select * from bookings') || lowerQuery.startsWith('select * from bookings;')) {
      const data = dbOps.getBookings();
      return res.json({ columns: ['booking_id', 'guest_id', 'room_id', 'check_in_date', 'check_out_date', 'booking_status', 'booking_source'], rows: data });
    }
    if (lowerQuery.startsWith('select * from payments') || lowerQuery.startsWith('select * from payments;')) {
      const data = dbOps.getPayments();
      return res.json({ columns: ['payment_id', 'booking_id', 'amount', 'gst_amount', 'payment_method', 'payment_status'], rows: data });
    }
    if (lowerQuery.startsWith('select * from staff') || lowerQuery.startsWith('select * from staff;')) {
      const data = dbOps.getStaff();
      return res.json({ columns: ['staff_id', 'staff_name', 'department', 'role', 'email', 'phone_number'], rows: data });
    }
    if (lowerQuery.startsWith('select * from feedback') || lowerQuery.startsWith('select * from feedback;')) {
      const data = dbOps.getFeedback();
      return res.json({ columns: ['feedback_id', 'guest_id', 'rating', 'comments'], rows: data });
    }
    if (lowerQuery.startsWith('select * from complaints') || lowerQuery.startsWith('select * from complaints;')) {
      const data = dbOps.getComplaints();
      return res.json({ columns: ['complaint_id', 'guest_id', 'complaint_category', 'complaint_description', 'priority_level', 'complaint_status'], rows: data });
    }
    return res.status(400).json({ error: "Unsupported query simulation. Supported: SELECT * FROM rooms | guests | bookings | payments | staff | feedback | complaints" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Fetch Rooms
app.get('/api/rooms', (req, res) => {
  const rooms = dbOps.getRooms();
  res.json({ rooms });
});

app.get('/api/room-availability', (req, res) => {
  const availability = dbOps.getRoomAvailability();
  res.json({ availability });
});

// 3. Submit Booking with Transaction
app.post('/api/bookings', (req, res) => {
  const {
    full_name, email, mobile_number, address, government_id,
    room_id, check_in_date, check_out_date, payment_method
  } = req.body;

  if (!full_name || !email || !mobile_number || !government_id || !room_id || !check_in_date || !check_out_date || !payment_method) {
    return res.status(400).json({ error: "Missing required booking database fields." });
  }

  let formattedMobile = mobile_number;
  const formatted = formatIndianPhoneNumber(mobile_number);
  if (formatted) {
    formattedMobile = formatted;
  }

  try {
    console.log('[Diagnostics] POST /api/bookings request body:', JSON.stringify(req.body));
    const result = dbOps.createBookingTransaction({
      full_name, email, mobile_number: formattedMobile, address: address || 'N/A', government_id,
      room_id: Number(room_id), check_in_date, check_out_date, payment_method
    });
    res.json(result);
    try { console.log('[Diagnostics] Booking created result:', JSON.stringify({ bookingId: result?.booking?.booking_id, guestId: result?.guestObject?.guest_id })); } catch(e) {}
  } catch (err: any) {
    console.error('[Diagnostics] Error creating booking:', err && err.message ? err.message : err);
    res.status(400).json({ error: err.message });
  }
});

// 4. Fetch Bookings
app.get('/api/bookings', (req, res) => {
  console.log('[Diagnostics] GET /api/bookings called');
  const bookings = dbOps.getBookings();
  try { console.log(`[Diagnostics] GET /api/bookings returning ${bookings?.length || 0} bookings`); } catch (e) {}
  res.json({ bookings });
});

// Fetch Payments
app.get('/api/payments', (req, res) => {
  const payments = dbOps.getPayments();
  res.json({ payments });
});

// Update Payment Status
app.put('/api/payments/:id/status', (req, res) => {
  const paymentId = Number(req.params.id);
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status required." });

  try {
    const updated = (dbOps as any).updatePaymentStatus(paymentId, status);
    res.json({ success: true, payment: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update Booking Status
app.put('/api/bookings/:id/status', (req, res) => {
  const bookingId = Number(req.params.id);
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status required." });

  try {
    const updated = dbOps.updateBookingStatus(bookingId, status);
    res.json({ success: true, booking: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Archive Bookings (bulk)
app.put('/api/bookings/archive', (req, res) => {
  const { bookingIds, is_archived } = req.body;
  if (!Array.isArray(bookingIds)) {
    return res.status(400).json({ error: "bookingIds array is required." });
  }

  try {
    const updated = bookingIds.map(id => dbOps.archiveBooking(Number(id), !!is_archived));
    res.json({ success: true, bookings: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Housekeeping
app.get('/api/housekeeping', (req, res) => {
  const tasks = dbOps.getHousekeeping();
  res.json({ tasks });
});

app.put('/api/housekeeping/:id/status', (req, res) => {
  const taskId = Number(req.params.id);
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status required." });

  try {
    const updated = dbOps.updateHousekeepingTask(taskId, status);
    res.json({ success: true, task: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Room Service
app.get('/api/room-service', (req, res) => {
  const requests = dbOps.getRoomServiceRequests();
  res.json({ requests });
});

app.post('/api/room-service', (req, res) => {
  const { email, request_type } = req.body;
  if (!email || !request_type) return res.status(400).json({ error: "Missing email or request_type." });

  try {
    const request = dbOps.createRoomServiceRequest({ email, request_type });
    res.json({ success: true, request });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/room-service/:id/status', (req, res) => {
  const requestId = Number(req.params.id);
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status required." });

  try {
    const updated = dbOps.updateRoomServiceStatus(requestId, status);
    res.json({ success: true, request: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Complaints & Feedback
app.get('/api/complaints', (req, res) => {
  const complaints = dbOps.getComplaints();
  res.json({ complaints });
});

// POST Complaint - Handles AI-suggested priority via Gemini
app.post('/api/complaints', async (req, res) => {
  const { email, complaint_category, complaint_description } = req.body;
  if (!email || !complaint_category || !complaint_description) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // Determine priority (defaulting to Medium)
  let priority: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
  let reasoning = "Calculated via fallback rules due to simulation mode.";
  let isAiMode = false;

  const aiClient = getAiClient();
  if (aiClient) {
    try {
      const prompt = `Analyze this hotel guest complaint and determine priority. Category: ${complaint_category}. Description: "${complaint_description}". State ONLY the priority as exactly "Low", "Medium", "High", or "Critical", followed by a brief 1-sentence reasoning. Use the format: PRIORITY: [value] | REASON: [reason]`;
      
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      const responseText = response.text || '';
      isAiMode = true;

      if (responseText.toUpperCase().includes('CRITICAL')) {
        priority = 'Critical';
      } else if (responseText.toUpperCase().includes('HIGH')) {
        priority = 'High';
      } else if (responseText.toUpperCase().includes('LOW')) {
        priority = 'Low';
      } else {
        priority = 'Medium';
      }
      
      const splitIdx = responseText.toUpperCase().indexOf('REASON:');
      if (splitIdx !== -1) {
        reasoning = responseText.substring(splitIdx + 7).trim();
      } else {
        reasoning = responseText.trim();
      }
    } catch (err) {
      console.warn("Gemini call failed during complaint classification, falling back to rule-based:", err);
    }
  }

  // Fail-safe rule-based fallback if no Gemini/fails
  if (!isAiMode) {
    const descLower = complaint_description.toLowerCase();
    if (descLower.includes('spark') || descLower.includes('short circuit') || descLower.includes('shock') || descLower.includes('medical') || descLower.includes('injury') || descLower.includes('theft')) {
      priority = 'Critical';
      reasoning = "Automatic critical priority assigned for safety hazards (spark, shock, injury, theft).";
    } else if (descLower.includes('leak') || descLower.includes('flood') || descLower.includes('broken ac') || descLower.includes('ac not working') || descLower.includes('no water')) {
      priority = 'High';
      reasoning = "Automatic high priority assigned for mechanical failures (leak, AC, absolute water issue).";
    } else if (descLower.includes('wifi') || descLower.includes('slow') || descLower.includes('noise')) {
      priority = 'Medium';
      reasoning = "Automatic medium priority assigned for amenities (WiFi, speed, noise constraints).";
    } else {
      priority = 'Low';
      reasoning = "Automatic low priority assigned for generic non-urgent concerns.";
    }
  }

  try {
    const complaintObj = dbOps.submitComplaint({
      email, complaint_category, complaint_description, priority_level: priority
    });
    res.json({
      success: true,
      complaint: complaintObj,
      ai_insights: { priority_assigned: priority, reasoning, model_used: isAiMode ? 'Gemini 3.5' : 'Deterministic Rules' }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/complaints/:id/status', (req, res) => {
  const complaintId = Number(req.params.id);
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status required." });

  try {
    const updated = dbOps.updateComplaintStatus(complaintId, status);
    res.json({ success: true, complaint: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Feedback APIs
app.get('/api/feedback', (req, res) => {
  const feedback = dbOps.getFeedback();
  res.json({ feedback });
});

app.post('/api/feedback', (req, res) => {
  const { guest_name, email, rating, comments } = req.body;
  if (!guest_name || !email || !rating || !comments) {
    return res.status(400).json({ error: "Missing feedback properties." });
  }

  try {
    const feedbackObj = dbOps.submitFeedback({ guest_name, email, rating: Number(rating), comments });
    res.json({ success: true, feedback: feedbackObj });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 8. Corporate Bookings
app.get('/api/corporate', (req, res) => {
  const corporate = dbOps.getCorporate();
  res.json({ corporate });
});

app.post('/api/corporate', (req, res) => {
  const { company_name, contact_person, contact_email, contact_phone, number_of_rooms, booking_dates } = req.body;
  if (!company_name || !contact_person || !contact_email || !contact_phone || !number_of_rooms || !booking_dates) {
    return res.status(400).json({ error: "Missing corporate details." });
  }

  let formattedPhone = contact_phone;
  const formatted = formatIndianPhoneNumber(contact_phone);
  if (formatted) {
    formattedPhone = formatted;
  }

  try {
    const corp = dbOps.submitCorporateBooking({
      company_name, contact_person, contact_email, contact_phone: formattedPhone, number_of_rooms: Number(number_of_rooms), booking_dates
    });
    res.json({ success: true, corporate: corp });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/corporate/:id/status', (req, res) => {
  const corpId = Number(req.params.id);
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status required." });

  try {
    const updated = dbOps.updateCorporateBooking(corpId, status);
    res.json({ success: true, corporate: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 9. Analytics Dashboard Calculations (INR Rupiah Metrics)
app.get('/api/analytics', (req, res) => {
  const rooms = dbOps.getRooms();
  const bookings = dbOps.getBookings();
  const payments = dbOps.getPayments();
  const feedback = dbOps.getFeedback();
  const complaints = dbOps.getComplaints();

  // Financial Stats
  const totalBookings = bookings.length;
  const todayDate = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.created_at.startsWith(todayDate)).length;
  
  // Total Revenue
  const totalRevenue = payments
    .filter(p => p.payment_status === 'Paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const gstCollected = payments
    .filter(p => p.payment_status === 'Paid')
    .reduce((sum, p) => sum + p.gst_amount, 0);

  // Simple in-memory aggregates for daily, weekly, monthly and annual
  // Bootstrapping static reports inside node to ensure consistent telemetry charts
  const monthlyRevenue = Math.round(totalRevenue * 1.0);
  const annualRevenueRate = Math.round(totalRevenue * 11.5 + 120000); // Projected based on seed data

  // Room Utilization Metrics
  const availableCount = rooms.filter(r => r.room_status === 'Available').length;
  const occupiedCount = rooms.filter(r => r.room_status === 'Occupied').length;
  const dirtyCount = rooms.filter(r => r.room_status === 'Dirty').length;
  const maintenanceCount = rooms.filter(r => r.room_status === 'Maintenance').length;
  
  const occupancyRate = rooms.length > 0 ? Math.round((occupiedCount / rooms.length) * 100) : 0;

  // Customer experience aggregates
  const feedbackCount = feedback.length;
  const averageRating = feedbackCount > 0 
    ? Number((feedback.reduce((sum, f) => sum + f.rating, 0) / feedbackCount).toFixed(1)) 
    : 4.5;

  const totalComplaints = complaints.length;
  const resolvedComplaints = complaints.filter(c => c.complaint_status === 'Resolved').length;
  const complaintResolutionRate = totalComplaints > 0 
    ? Math.round((resolvedComplaints / totalComplaints) * 100) 
    : 100;

  res.json({
    metrics: {
      totalBookings,
      todayBookings,
      totalRevenue,
      gstCollected,
      monthlyRevenue,
      annualRevenueRate,
      availableRooms: availableCount,
      occupiedRooms: occupiedCount,
      dirtyRooms: dirtyCount,
      maintenanceRooms: maintenanceCount,
      occupancyRate,
      feedbackCount,
      averageRating,
      complaintResolutionRate,
      totalComplaints
    },
    popularRooms: [
      { name: 'Deluxe Room', occupancy: 85, revenue: Math.round(totalRevenue * 0.45) },
      { name: 'Executive Suite', occupancy: 70, revenue: Math.round(totalRevenue * 0.35) },
      { name: 'Presidential Suite', occupancy: 40, revenue: Math.round(totalRevenue * 0.15) },
      { name: 'Standard Room', occupancy: 90, revenue: Math.round(totalRevenue * 0.05) }
    ],
    monthlyTrend: [
      { name: 'Jan', revenue: 120000, bookings: 45 },
      { name: 'Feb', revenue: 145000, bookings: 50 },
      { name: 'Mar', revenue: 180000, bookings: 62 },
      { name: 'Apr', revenue: 210000, bookings: 75 },
      { name: 'May', revenue: 285000, bookings: 98 },
      { name: 'Jun', revenue: Math.round(totalRevenue), bookings: Math.max(12, totalBookings) }
    ]
  });
});

// 10. AI Predictive & Summary Endpoints using Gemini-3.5-flash
app.post('/api/ai/suggest-upgrade', async (req, res) => {
  const { current_room_id, check_in_date, check_out_date } = req.body;
  if (!current_room_id) return res.status(400).json({ error: "Missing current_room_id." });

  const rooms = dbOps.getRooms();
  const currentRoom = rooms.find(r => r.room_id === Number(current_room_id));
  if (!currentRoom) return res.status(404).json({ error: "Current room not found." });

  // Find upgrade candidates (higher price/type rooms that are Available)
  const upgradeCandidates = rooms.filter(r => 
    r.price_per_night > currentRoom.price_per_night && 
    r.room_status === 'Available'
  );

  let recommendationText = "";
  let isAiMode = false;
  const bestCandidate = upgradeCandidates[0] || rooms.find(r => r.room_type === 'Executive Suite') || rooms[0];

  const aiClient = getAiClient();
  if (aiClient && upgradeCandidates.length > 0) {
    try {
      const prompt = `You are an elite hospitality pricing expert at Sai Nirvana Plaza. Recommend an upgrade from a ${currentRoom.room_type} (room ${currentRoom.room_number}, ₹${currentRoom.price_per_night}/night) to a ${bestCandidate.room_type} (room ${bestCandidate.room_number}, ₹${bestCandidate.price_per_night}/night). The stay dates are from ${check_in_date} to ${check_out_date}. Highlight premium amenities: ${bestCandidate.amenities.join(', ')}. Generate a highly persuasive, friendly, elite 2-sentence sales upgrade greeting in corporate elegant tone offering a 10% discount on the upgrade difference price. Mention GST is applicable in INR.`;
      
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });
      recommendationText = response.text || '';
      isAiMode = true;
    } catch (err) {
      console.warn("Upgrade suggestion via Gemini failed, falling back to static rules:", err);
    }
  }

  // Fallback persuation text if Gemini fails/not present
  if (!recommendationText) {
    const diff = bestCandidate.price_per_night - currentRoom.price_per_night;
    const discountedDiff = Math.round(diff * 0.9);
    recommendationText = `Treat yourself to our premium ${bestCandidate.room_type} (Room ${bestCandidate.room_number})! For your stay from ${check_in_date || 'check-in'} to ${check_out_date || 'check-out'}, upgrade for just ₹${discountedDiff}/night extra instead of ₹${diff}. Enjoy luxury space, premium bath fixtures, and elite amenities like ${bestCandidate.amenities.slice(0,3).join(', ')}.`;
  }

  res.json({
    has_upgrade: upgradeCandidates.length > 0,
    currentRoom,
    recommendedRoom: bestCandidate,
    pitch: recommendationText,
    model: isAiMode ? 'Gemini 3.5' : 'Heuristics Engine',
    estDifference: bestCandidate.price_per_night - currentRoom.price_per_night,
    discountedDifference: Math.round((bestCandidate.price_per_night - currentRoom.price_per_night) * 0.9)
  });
});

app.post('/api/ai/booking-summary', async (req, res) => {
  const { guest_name, room_type, room_number, check_in, check_out, total_paid, payment_method } = req.body;
  if (!guest_name || !room_type || !total_paid) {
    return res.status(400).json({ error: "Missing details." });
  }

  let formattedSummary = "";
  let b2bWhatsapp = "";
  let isAiMode = false;

  const aiClient = getAiClient();
  if (aiClient) {
    try {
      const prompt = `Generate a modern, highly professional booking confirmation summary and an automated WhatsApp Business confirmation message for guest ${guest_name} staying in room ${room_number || 'TBA'} (${room_type}) from ${check_in} to ${check_out}. The total stays cost is ${total_paid} using ${payment_method || 'UPI'}. Mention welcome drinks upon arrival. Format clearly using Markdown. Use India numbers and GST inclusive lines. Prefix the WhatsApp template with 'WHATSAPP_START:' and end with 'WHATSAPP_END:'`;
      
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      const text = response.text || '';
      formattedSummary = text;
      isAiMode = true;

      const wsStart = text.indexOf('WHATSAPP_START:');
      const wsEnd = text.indexOf('WHATSAPP_END:');
      if (wsStart !== -1 && wsEnd !== -1) {
        b2bWhatsapp = text.substring(wsStart + 15, wsEnd).trim();
        formattedSummary = text.replace(/WHATSAPP_START:[\s\S]*WHATSAPP_END:/g, '').trim();
      }
    } catch (err) {
      console.warn("Gemini call failed during booking-summary generation:", err);
    }
  }

  if (!formattedSummary) {
    formattedSummary = `### Booking Confirmation - Sai Nirvana Plaza
Thank you **${guest_name}**! Your room booking is confirmed:
- **Room Type**: ${room_type} (Room ${room_number || 'TBA'})
- **Dates**: ${check_in} to ${check_out}
- **Total Amount Paid**: ₹${total_paid} (GST Inclusive)
- **Payment Mode**: ${payment_method || 'UPI'} - Instant Verified
- **Check-in Instructions**: Please bring a valid Government Photo ID (Aadhaar, Passport). Check-in starts at 12:00 PM. Enjoy complimentary welcome drinks on arrival!`;

    b2bWhatsapp = `*SAI NIRVANA PLAZA* ✨\n\nDear *${guest_name}*, your booking is CONFIRMED! 🏨\n\n📅 *Stay*: ${check_in} to ${check_out}\n🛏️ *Room*: ${room_type} (${room_number || 'TBA'})\n💰 *Total Paid*: ₹${total_paid} (GST Inc.)\n\nLooking forward to offering you our signature hospitality. See you soon! Compliments, Front Desk.`;
  }

  res.json({
    summary: formattedSummary,
    whatsapp_template: b2bWhatsapp,
    model: isAiMode ? 'Gemini 3.5' : 'Operational Blueprints'
  });
});

// AI Assistant Chatbot Endpoint for Guest users
app.post('/api/ai/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: "Missing message query." });
  }

  const systemInstruction = `You are a warm, professional, and elite digital hospitality assistant at Sai Nirvana Plaza (Dwarka Sector 22, New Delhi, India). 
Your goal is to help guests navigate the system, answer booking-related queries, explain room availability and booking procedures, guide users through guest features, and provide hotel information.

Hotel Information:
- Address: Sector 22, Dwarka, New Delhi 110077, India. Phone: +91 11-4560-6000. Email: reservations@sri-nirvana-plaza.com.
- Standard GST lodging tax rate is 18%.
- Check-in is at 12:00 PM (noon) and check-out is at 11:00 AM.
- Guests must bring a valid government photo ID (Aadhaar Card, Passport, PAN Card) at check-in.
- Welcome drinks are offered upon arrival.
- We have 4 room tiers:
  * Standard Room: Capacity: 2 Guests. Pricing: ₹3,500/night. Comfortable standard cabin with basic amenities.
  * Deluxe Room: Capacity: 2 Guests. Pricing: ₹5,500/night. Premium deluxe room with luxury bath and amenities.
  * Executive Suite: Capacity: 3 Guests. Pricing: ₹8,500/night. Spacious suite with sitting area.
  * Presidential Suite: Capacity: 6 Guests. Pricing: ₹15,000/night. Ultimate luxury, dynamic views, premium amenities.

Guest Portal Features:
- Dining tab: Guests can browse the gourmet room-service menu (e.g. Idli Sambar Plate: ₹150, Crisp Masala Dosa: ₹180, Paneer Butter Masala: ₹320, Fragrant Vegetable Biryani: ₹350, Samosas: ₹90, Traditional Masala Tea: ₹60, Filter Coffee: ₹80, Mint Lime Soda: ₹100). They can add items to the cart and click Checkout to place a kitchen order.
- Receipts tab: Guests can view their stay history, print receipts, and download official PDF tax invoices.
- Issues tab: Guests can file support desk tickets for AC/Heating, Plumbing, Wi-Fi, Noise, or Room Service. The system uses Gemini AI to evaluate description priority (Low, Medium, High, Critical).
- Feedback tab: Guests can submit ratings and comments to help improve the system.

Guidelines:
- Maintain a polite, elegant, luxury-brand tone.
- Give concise, clear answers. Use markdown formatting.
- Do not mention implementation details, DB logs, or the sandbox environment.`;

  let responseText = "";
  let isAiMode = false;

  const aiClient = getAiClient();
  if (aiClient) {
    try {
      const contents = [];
      if (Array.isArray(history)) {
        for (const turn of history) {
          if (turn.role === 'user') {
            contents.push({ role: 'user', parts: [{ text: turn.content }] });
          } else if (turn.role === 'model' || turn.role === 'assistant') {
            contents.push({ role: 'model', parts: [{ text: turn.content }] });
          }
        }
      }
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7
        }
      });
      responseText = response.text || "";
      isAiMode = true;
    } catch (err) {
      console.warn("Gemini call failed during AI chatbot request, falling back to heuristics:", err);
    }
  }

  // Fallback heuristics rules
  if (!responseText) {
    const msg = message.toLowerCase();
    if (msg.includes('menu') || msg.includes('food') || msg.includes('eat') || msg.includes('dining') || msg.includes('breakfast') || msg.includes('dinner') || msg.includes('lunch') || msg.includes('paneer') || msg.includes('dosa') || msg.includes('idli') || msg.includes('samosa') || msg.includes('tea') || msg.includes('coffee')) {
      responseText = `**Gourmet In-Room Dining at Sai Nirvana Plaza** 🍽️\n\nOur kitchen serves a variety of premium dishes:\n- **Idli Sambar Plate** (₹150)\n- **Crisp Masala Dosa** (₹180)\n- **Continental Breakfast** (₹250)\n- **North Indian Paneer Butter Masala Meal** (₹320)\n- **Awadhi Fragrant Vegetable Biryani** (₹350)\n- **Sri Nirvana Dal Makhani** (₹280)\n- **Samosa Plate (2 Samosas)** (₹90)\n- **Masala Tea** (₹60) / **Filter Coffee** (₹80)\n\n**How to Order:** Go to the **Dining** tab in your dashboard, adjust item quantities in the menu, and click the golden **Place Kitchen Order** button. Our team will deliver it directly to your room!`;
    } else if (msg.includes('complaint') || msg.includes('issue') || msg.includes('plumbing') || msg.includes('wifi') || msg.includes('ac') || msg.includes('heating') || msg.includes('noise') || msg.includes('leak') || msg.includes('help desk') || msg.includes('support')) {
      responseText = `**Sai Nirvana Plaza Help & Support Desk** 🛠️\n\nIf you encounter any issues with Wi-Fi connectivity, plumbing, AC, or noise, you can log a formal support ticket:\n1. Go to the **Issues** tab on your guest dashboard.\n2. Select the category (Wi-Fi, Plumbing, AC/Heating, Noise, etc.).\n3. Provide a brief title and descriptive explanation of the problem.\n4. Click **Lodge Complaint**.\n\nOur AI classifier instantly evaluates your ticket's priority level, and a maintenance staff member will be dispatched immediately.`;
    } else if (msg.includes('receipt') || msg.includes('invoice') || msg.includes('bill') || msg.includes('pdf') || msg.includes('print') || msg.includes('gst')) {
      responseText = `**Billing, Invoices, and GST Receipts** 🧾\n\nFor standard lodgings, our tariff is fully itemized under the **18% GST slab** regulations.\n\n**How to View & Download:**\n- Go to the **Receipts** tab on your dashboard.\n- Click **View Receipt** next to your stay.\n- You can choose **Print Receipt** (opens system print) or **Download Invoice PDF** (exports a signature-verified GST PDF to your device).`;
    } else if (msg.includes('book') || msg.includes('reserve') || msg.includes('price') || msg.includes('rate') || msg.includes('tariff') || msg.includes('cost') || msg.includes('standard') || msg.includes('deluxe') || msg.includes('suite') || msg.includes('presidential')) {
      responseText = `**Room Tiers & Reservation Tariff Guide** 🏨\n\nWe offer four tiers of elite accommodation at Sai Nirvana Plaza:\n1. **Standard Cabin** (₹3,500/night, capacity 2 guests) - Elegant comfort.\n2. **Premium Deluxe** (₹5,500/night, capacity 2 guests) - Luxury bath fixtures and premium view.\n3. **Executive Suite** (₹8,500/night, capacity 3 guests) - Expanded layout with a sitting lounge.\n4. **Presidential Suite** (₹15,000/night, capacity 6 guests) - Ultimate opulence with dynamic terrace viewpoints.\n\nTo check availability or book a room, log in as a guest, configure dates on the **Real-Time Availability Checker**, and click **Book Now**!`;
    } else if (msg.includes('location') || msg.includes('address') || msg.includes('phone') || msg.includes('contact') || msg.includes('email') || msg.includes('where') || msg.includes('map')) {
      responseText = `**Sai Nirvana Plaza Location & Contact Information** 📍\n\n- **Address**: Sector 22, Dwarka, New Delhi - 110077, India.\n- **Direct Desk Line**: +91 11-4560-6000 (Reservations Desk Ext: 201)\n- **Official Email**: reservations@sri-nirvana-plaza.com\n- **Operating Hours**: Front desk services are active 24/7.`;
    } else if (msg.includes('checkin') || msg.includes('check out') || msg.includes('check-in') || msg.includes('check-out') || msg.includes('checkout') || msg.includes('policy') || msg.includes('id') || msg.includes('aadhaar') || msg.includes('passport')) {
      responseText = `**Sai Nirvana Plaza Stay Policies** 🛂\n\n- **Check-In**: Starts at **12:00 PM (noon)**. Early check-in is subject to room availability.\n- **Check-Out**: Till **11:00 AM**.\n- **ID Requirements**: In compliance with local regulations, all guests must present a valid government-issued photo ID (Aadhaar Card, Passport, or PAN Card) during check-in.\n- **Refreshments**: Enjoy our complimentary fresh welcome drinks upon check-in!`;
    } else {
      responseText = `Welcome to the **Sai Nirvana Plaza Digital Assistant**! 🌟\n\nI am here to guide you through your luxury stay. You can ask me questions about:\n- 🍽️ **Dining menu & ordering** (e.g. *"what food can I order?"*)\n- 🧾 **Invoices, PDF downloads, & GST details** (e.g. *"how to get my bill?"*)\n- 🏨 **Room prices & suites booking** (e.g. *"what are the room rates?"*)\n- 🛠️ **Filing issues & support requests** (e.g. *"AC is not working"*)\n- 📍 **Hotel contact details & stay policies** (e.g. *"when is check-out?"*)\n\nHow may I assist you today?`;
    }
  }

  res.json({
    message: responseText,
    model: isAiMode ? 'Gemini 3.5' : 'Heuristics Fallback'
  });
});

// Authentication & Guest Access Control Endpoints

// Get created guest accounts lists (For reception & admin dashboard status check)
app.get('/api/auth/guest-accounts', (req, res) => {
  try {
    const list = dbOps.getGuestAccounts();
    res.json({ success: true, accounts: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create unique Guest Access Account (System automatically generates guest_id_str, username, password_hash)
app.post('/api/auth/guest-accounts', (req, res) => {
  const { full_name, mobile_number, email, stay_duration, room_preference } = req.body;
  if (!full_name || !mobile_number || !email) {
    return res.status(400).json({ error: "Missing required booking applicant properties." });
  }
  let formattedMobile = mobile_number;
  const formatted = formatIndianPhoneNumber(mobile_number);
  if (formatted) {
    formattedMobile = formatted;
  }
  try {
    const newAcc = dbOps.createGuestAccount({
      full_name, mobile_number: formattedMobile, email, stay_duration: stay_duration || '2 Nights', room_preference: room_preference || 'Standard'
    });
    res.json({ success: true, account: newAcc });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// User login endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  console.log('[Diagnostics] Login Attempt');
  console.log('[Diagnostics] Username received:', username || '<missing>');
  if (!username || !password) {
    console.log('[Diagnostics] Authentication Result: Failed - Missing Username or Password');
    return res.status(400).json({ error: "Username and Password required." });
  }

  // 1. Look in Guest accounts
  const accounts = dbOps.getGuestAccounts();
  const guestAcc = accounts.find(acc => 
    acc.username.toLowerCase() === username.toLowerCase() || 
    acc.guest_id_str.toLowerCase() === username.toLowerCase()
  );
  console.log('[Diagnostics] User Found In Guest Accounts:', !!guestAcc);
  if (guestAcc) {
    console.log('[Diagnostics] Guest ID:', guestAcc.guest_id_str);
    if (!guestAcc.is_activated) {
      console.log('[Diagnostics] Authentication Result: Failed - Guest account deactivated');
      return res.status(403).json({ error: "Access Restricted. Your guest account has been deactivated. Please contact Sai Nirvana Plaza Reception." });
    }
    const passwordMatchGuest = guestAcc.password_hash === password;
    console.log('[Diagnostics] Password Match (guest):', passwordMatchGuest);
    if (passwordMatchGuest) {
      console.log('[Diagnostics] Authentication Result: Success - Guest login');
      return res.json({ success: true, role: 'Guest', account: guestAcc });
    } else {
      console.log('[Diagnostics] Authentication Result: Failed - Password mismatch (guest)');
    }
  }

  // 2. Look in staff list
  const staffList = dbOps.getStaff();
  const staffFound = (username.toLowerCase() === "sainirvanaplaza0533")
    ? staffList.find(s => s.role === 'Manager')
    : staffList.find(s => 
        s.email.toLowerCase() === username.toLowerCase() || 
        s.staff_name.toLowerCase() === username.toLowerCase()
      );

  console.log('[Diagnostics] User Found In Staff List:', !!staffFound);
  if (staffFound && password === "Admin@123") {
    let assignedRole = 'Front Desk Staff';
    if (staffFound.department === 'Administration') assignedRole = 'Administrator';
    if (staffFound.department === 'Housekeeping') assignedRole = 'Housekeeping Staff';
    if (staffFound.role === 'Manager') assignedRole = 'Hotel Manager';
    console.log('[Diagnostics] Authentication Result: Success - Staff login', assignedRole);
    return res.json({ success: true, role: assignedRole, staff: staffFound });
  }

  // 3. Simple development environment bypass credentials for convenience
  if (username.toLowerCase() === "sainirvanaplaza0533" && password === "admin") {
    console.log('[Diagnostics] Authentication Result: Success - Dev bypass (admin)');
    return res.json({ success: true, role: 'Administrator' });
  }
  if (username.toLowerCase() === "sainirvanaplaza0533" && password === "reception") {
    console.log('[Diagnostics] Authentication Result: Success - Dev bypass (reception)');
    return res.json({ success: true, role: 'Front Desk Staff' });
  }
  if (username.toLowerCase() === "sainirvanaplaza0533" && password === "manager") {
    console.log('[Diagnostics] Authentication Result: Success - Dev bypass (manager)');
    return res.json({ success: true, role: 'Hotel Manager' });
  }
  if (username.toLowerCase() === "sainirvanaplaza0533" && password === "housekeeping") {
    console.log('[Diagnostics] Authentication Result: Success - Dev bypass (housekeeping)');
    return res.json({ success: true, role: 'Housekeeping Staff' });
  }
  if (username.toLowerCase() === "sainirvanaplaza0533" && password === "operations") {
    console.log('[Diagnostics] Authentication Result: Success - Dev bypass (operations)');
    return res.json({ success: true, role: 'Accounts Staff' });
  }

  console.log('[Diagnostics] Authentication Result: Failed - Invalid Guest ID, Username or Password');
  res.status(401).json({ error: "Invalid Guest ID, Username or Password." });
});

// Change Password on first login
app.post('/api/auth/change-password', (req, res) => {
  const { username, new_password } = req.body;
  if (!username || !new_password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  try {
    const updated = dbOps.updateGuestAccountPassword(username, new_password);
    res.json({ success: true, account: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Toggle Account Status activation / deactivation
app.post('/api/auth/toggle-status', (req, res) => {
  const { account_id } = req.body;
  if (!account_id) return res.status(400).json({ error: "Missing account_id." });
  try {
    const updated = dbOps.toggleGuestAccountActivation(Number(account_id));
    res.json({ success: true, account: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Guest Access Account
app.delete('/api/auth/guest-accounts/:id', (req, res) => {
  const accountId = Number(req.params.id);
  try {
    dbOps.deleteGuestAccount(accountId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Fetch all or guest-specific communication delivery logs
app.get('/api/auth/communication-logs', (req, res) => {
  const { guest_id_str, guest_id, booking_id, log_id } = req.query;
  try {
    const logs = dbOps.getCommunicationLogs({
      guest_id_str: guest_id_str as string,
      guest_id: guest_id as string,
      booking_id: booking_id as string,
      log_id: log_id as string
    });
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Regenerate Guest Access Account password (forces prompt/password reset)
app.post('/api/auth/regenerate-credentials', (req, res) => {
  const { account_id } = req.body;
  if (!account_id) return res.status(400).json({ error: "account_id is required." });

  try {
    const list = dbOps.getGuestAccounts();
    const acc = list.find(a => a.account_id === Number(account_id));
    if (!acc) return res.status(404).json({ error: "Guest security credentials not registered." });

    // Instatiate new temporary key Passcode
    const nextPassword = `Temp@${Math.floor(100 + Math.random() * 900)}`;
    const updated = dbOps.updateGuestAccountPassword(acc.username, nextPassword);
    
    // Set changed back to 0 so they must change it again on next login
    updated.first_login_password_changed = false;
    
    res.json({ success: true, account: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
async function runWhatsAppDispatch(
  logId: number, 
  phone: string, 
  message: string, 
  guestName?: string, 
  bookingId?: string | number
): Promise<boolean> {
  const result = await sendWhatsAppMessage(phone, message, whatsappConfig);
  const finalMetaRecipient = result.recipientPhone ? result.recipientPhone.replace(/\D/g, '') : phone.replace(/\D/g, '');
  
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: finalMetaRecipient,
    type: "text",
    text: {
      preview_url: false,
      body: message
    }
  };

  let parsedResponse = null;
  try {
    parsedResponse = JSON.parse(result.apiResponse || "{}");
  } catch (e) {
    parsedResponse = result.apiResponse || null;
  }

  const booking = {
    guestName: guestName || "N/A",
    id: bookingId || "N/A",
    phoneNumber: phone
  };
  const formattedPhoneNumber = result.recipientPhone || phone;
  const recipientNumber = finalMetaRecipient;
  const response = {
    data: parsedResponse
  };

  console.log("Booking Guest:", booking.guestName);
  console.log("Booking ID:", booking.id);
  console.log("Stored Number:", booking.phoneNumber);
  console.log("Formatted Number:", formattedPhoneNumber);
  console.log("Recipient Sent To Meta:", recipientNumber);
  console.log("Request Payload:", payload);
  console.log("Meta Response:", response.data);

  console.log(`=== WHATSAPP DISPATCH EXECUTION ===
* Guest Name: ${guestName || 'N/A'}
* Booking ID: ${bookingId || 'N/A'}
* Original Guest Phone Number: ${phone}
* Formatted Phone Number: ${result.recipientPhone || phone}
* Final Recipient Number Sent To Meta: ${finalMetaRecipient}
* Meta API Response: ${result.apiResponse || 'N/A'}
* Message ID (wamid): ${result.messageId || 'N/A'}
* Delivery Status: ${result.success ? '🟢 Delivered Successfully' : '🔴 Delivery Failed'}
====================================`);

  if (result.success) {
    dbOps.updateCommunicationLogStatus(
      logId,
      '🟢 Delivered Successfully',
      1,
      "Sent Successfully",
      result.recipientPhone,
      result.apiResponse || "",
      String(result.statusCode || 200)
    );
    return true;
  } else {
    dbOps.updateCommunicationLogStatus(
      logId,
      '🔴 Delivery Failed',
      1,
      result.failureReason || "Message delivery failed.",
      result.recipientPhone,
      result.apiResponse || "",
      String(result.statusCode || 500)
    );
    return false;
  }
}

async function runEmailDispatch(logId: number, recipientEmail: string, message: string): Promise<boolean> {
  let subject = "Sai Nirvana Plaza - Update";
  try {
    const logs = dbOps.getCommunicationLogs();
    const matchedLog = logs.find(l => l.log_id === logId);
    if (matchedLog && matchedLog.communication_type) {
      subject = `Sai Nirvana Plaza - ${matchedLog.communication_type}`;
    }
  } catch (err) {
    console.warn("[runEmailDispatch] Failed to resolve email subject from database logs:", err);
  }

  const result = await sendEmail(recipientEmail, subject, message, sendgridConfig);

  if (result.success) {
    dbOps.updateCommunicationLogStatus(
      logId,
      '🟢 Delivered Successfully',
      1,
      "Sent Successfully",
      result.recipientEmail,
      result.apiResponse || "",
      String(result.statusCode || 200)
    );
    return true;
  } else {
    dbOps.updateCommunicationLogStatus(
      logId,
      '🔴 Delivery Failed',
      1,
      result.failureReason || "Email delivery failed.",
      result.recipientEmail,
      result.apiResponse || "",
      String(result.statusCode || 500)
    );
    return false;
  }
}

// High priority dispatch credentials via external API and tracking engine
// Template builder for standard notification events matching dynamic formats
function getTemplateMessage(type: string, acc: any, booking?: any): string {
  const guestName = acc.full_name || 'Valued Guest';
  const guestIdStr = acc.guest_id_str || 'SNP-GUEST-001';
  const username = acc.username || 'guest_snp001';
  const password = acc.password_hash || 'Temp@123';
  const appUrl = process.env.APP_URL || 'https://sai-nirvana-plaza.vercel.app/';
  const bookingId = booking?.booking_id || '101';
  const checkIn = booking?.check_in_date || '08-Jun-2026';
  const checkOut = booking?.check_out_date || '12-Jun-2026';
  const roomNum = booking?.room_number || '201';
  const price = booking?.price_per_night || 3500;

  switch (type) {
    case 'Guest Login Credentials':
    case 'User Credentials':
      return `Sai Nirvana Plaza: Warm Greetings! Your Premium Login secure Guest ID is ${guestIdStr}, Username: ${username}, Temporary Password: ${password}. (Note: Password change required on first login). Access: ${appUrl}`;
    
    case 'Registration Confirmation':
      return `Dear ${guestName}, thank you for registering with Sai Nirvana Plaza. Your guest account ${guestIdStr} is now active. Looking forward to welcoming you.`;
    
    case 'Password Reset':
      return `Dear ${guestName}, a password reset has been triggered for your guest account ${guestIdStr}. Your new temporary access passcode is ${password}.`;
    
    case 'Task Assignment':
      return `Sai Nirvana Plaza Staff Operations: Attention! Task assigned for cleaning/maintenance of Room ${roomNum}. Please coordinate with supervisor.`;
    
    case 'Status Updates':
      return `Dear ${guestName}, your reservation booking status has been updated in the guest ledger database. Please review your active dashboard.`;
    
    case 'Notifications':
      return `Dear ${guestName}, welcome to Sai Nirvana Plaza. Your assigned assistant is online. Enjoy complimentary refreshments on arrival.`;
    
    case 'Alerts':
      return `🚨 Alert: Dear ${guestName}, brief scheduled maintenance is underway in the resort. We apologize for any inconvenience.`;
    
    case 'Announcements':
      return `Sai Nirvana Plaza Announcement: We are thrilled to announce that booking slots for our rooftop luxury wellness spa are now open!`;
    
    case 'Reports':
      return `Dear ${guestName}, the requested hotel operational report has been generated. Please view the digital copy.`;
    
    case 'Audit Information':
      return `Dear ${guestName}, compliance audit checklist for reservation has been updated. Verified GSTR-2 luxury tax slab status.`;

    // Backward compatibility templates
    case 'Booking Confirmation': {
      const rooms = dbOps.getRooms();
      const room = rooms.find(r => r.room_id === booking?.room_id);
      const guestsCount = room ? room.capacity : 2;
      const roomType = room ? room.room_type : (booking?.room_type || 'Standard Room');
      return `Dear ${guestName},\n\nGreetings from SAI NIRVANA PLAZA!\n\nThank you for choosing us for your stay. We are delighted to confirm your booking.\n\n━━━━━━━━━━━━━━━━━━━━━━\nBOOKING CONFIRMATION\n━━━━━━━━━━━━━━━━━━━━━━\n\nGuest Name: ${guestName}\n\nRoom Type: ${roomType}\n\nNumber of Guests: ${guestsCount}\n\nBooking Status: Confirmed\n\n━━━━━━━━━━━━━━━━━━━━━━\n\nHotel Name: SAI NIRVANA PLAZA\n\nImportant Information\n\n• Please carry a valid government-issued photo ID during check-in.\n\n• Early check-in and late check-out are subject to availability.\n\n• Any special requests will be accommodated based on availability.\n\n━━━━━━━━━━━━━━━━━━━━━━\n\nWe look forward to welcoming you and making your stay comfortable and memorable.\n\nWarm Regards,\n\nSAI NIRVANA PLAZA\n\nCustomer Relations Team`;
    }
    
    case 'Check-In Reminder':
      return `Sai Nirvana Plaza Check-In: Dear ${guestName}, friendly advisory of your scheduled Check-In on ${checkIn} for Room ${roomNum}. Our luxury service portals are fully preppped.`;
    
    case 'Check-Out Reminder':
      return `Sai Nirvana Plaza Check-Out: Dear ${guestName}, checkout folio INV-${bookingId}09 is prepared for digital checkout on ${checkOut}. Thank you for choosing absolute luxury with Sri Nirvana.`;
    
    case 'Complaint Resolution Updates':
      return `Sai Nirvana Plaza Support: The plumbing / HVAC infrastructure concern recently logged by you has been resolved with absolute precision by maintenance. Welcome back!`;
    
    case 'Invoice Delivery':
      const netGst = Math.round(price * 0.18);
      const netSum = price + netGst;
      return `Sai Nirvana Plaza Invoice: Tariff Summary BK-${bookingId}. Base Accomodation: ₹${price.toLocaleString('en-IN')}, SGST/CGST 18%: ₹${netGst.toLocaleString('en-IN')}, Remittance: ₹${netSum.toLocaleString('en-IN')} (Paid via UPI).`;

    default:
      return `Dear ${guestName}, welcome to Sai Nirvana Plaza. Connected to the premium notification gateway.`;
  }
}

// High priority dispatch credentials via external API and tracking engine
app.post('/api/auth/dispatch', async (req, res) => {
  const { 
    account_id, 
    guest_id, 
    booking_id, 
    communication_type, 
    channel, 
    staff_member, 
    customMessage, 
    is_test,
    retry_log_id 
  } = req.body;

  try {
    let finalGuestName = "Valued Guest";
    let finalGuestIdStr = "SNP-GUEST-001";
    let finalRecipientEmail = "";
    let finalPhone = "";
    let finalCommType = communication_type || "Guest Login Credentials";
    let finalStaff = staff_member || "Operations Console";
    let resolvedBookingId = booking_id || "";

    let oldLog: any = null;

    // 1. Resolve Details if Retrying
    if (retry_log_id) {
      const logs = dbOps.getCommunicationLogs();
      oldLog = logs.find(l => l.log_id === Number(retry_log_id));
      if (!oldLog) {
        return res.status(404).json({ 
          success: false,
          error: "Original communication log record not found for retry.",
          error_message: "Original communication log record not found for retry.",
          reason: "Original communication log record not found for retry."
        });
      }
      finalGuestIdStr = oldLog.guest_id_str;
      finalGuestName = oldLog.guest_name;
      finalCommType = oldLog.communication_type;
      if (oldLog.channel === 'Email') {
        finalRecipientEmail = oldLog.recipient_email || "";
      } else {
        finalPhone = oldLog.recipient_email || "";
      }
    } 
    // 2. Resolve if Test
    else if (is_test) {
      finalGuestName = "Hotel Administrator";
      finalGuestIdStr = "SNP-ADMIN-101";
      finalRecipientEmail = "thunikipatiabhiram173@gmail.com";
      finalPhone = "+919812488321";
      finalCommType = "System Connectivity Test";
    } 
    // 3. Resolve normally via ids
    else {
      const bookings = dbOps.getBookings();
      const guests = dbOps.getGuests();
      const accounts = dbOps.getGuestAccounts();

      console.log(`[Recipient Selection] Initiating lookup: account_id=${account_id || 'N/A'}, guest_id=${guest_id || 'N/A'}, booking_id=${booking_id || 'N/A'}`);

      const matchedAcc = account_id ? accounts.find(a => String(a.account_id) === String(account_id)) : null;
      const matchedGuest = guest_id ? guests.find(g => String(g.guest_id) === String(guest_id)) : null;
      let matchedBooking = booking_id ? [...bookings].reverse().find(b => String(b.booking_id) === String(booking_id)) : null;

      if (matchedAcc) {
        console.log(`[Recipient Selection] Resolved from Guest Account record: name="${matchedAcc.full_name}", phone="${matchedAcc.mobile_number}"`);
        finalGuestName = matchedAcc.full_name;
        finalGuestIdStr = matchedAcc.guest_id_str;
        finalRecipientEmail = matchedAcc.email;
        finalPhone = matchedAcc.mobile_number;
        
        // Associate with booking metadata if available for templates
        const guest = guests.find(g => g.email.toLowerCase() === matchedAcc.email.toLowerCase());
        const booking = [...bookings].reverse().find(b => b.guest_email.toLowerCase() === matchedAcc.email.toLowerCase() || (guest && b.guest_id === guest.guest_id));
        if (booking) {
          resolvedBookingId = booking.booking_id;
        }
      } else if (matchedGuest) {
        console.log(`[Recipient Selection] Resolved from Guest record: name="${matchedGuest.full_name}", phone="${matchedGuest.mobile_number}"`);
        finalGuestName = matchedGuest.full_name;
        finalGuestIdStr = `SNP-GUEST-${matchedGuest.guest_id}`;
        finalRecipientEmail = matchedGuest.email;
        finalPhone = matchedGuest.mobile_number;

        const booking = [...bookings].reverse().find(b => b.guest_id === matchedGuest.guest_id);
        if (booking) {
          resolvedBookingId = booking.booking_id;
        }
      } else {
        // If booking_id was not passed but we had guest_id, search for booking first
        if (!matchedBooking && guest_id) {
          matchedBooking = [...bookings].reverse().find(b => String(b.guest_id) === String(guest_id));
        }
        
        if (matchedBooking) {
          console.log(`[Recipient Selection] Resolved from Booking record #${matchedBooking.booking_id}: name="${matchedBooking.guest_name}", phone="${matchedBooking.guest_phone}"`);
          resolvedBookingId = matchedBooking.booking_id;
          finalGuestName = matchedBooking.guest_name;
          finalGuestIdStr = `SNP-GUEST-${matchedBooking.guest_id}`;
          finalRecipientEmail = matchedBooking.guest_email;
          finalPhone = matchedBooking.guest_phone;
        } else {
          // Fallback options
          let fallbackAcc = accounts.find(a => String(a.guest_id_str) === String(guest_id));
          if (fallbackAcc) {
            console.log(`[Recipient Selection] Resolved from Fallback Guest Account record: name="${fallbackAcc.full_name}", phone="${fallbackAcc.mobile_number}"`);
            finalGuestName = fallbackAcc.full_name;
            finalGuestIdStr = fallbackAcc.guest_id_str;
            finalRecipientEmail = fallbackAcc.email;
            finalPhone = fallbackAcc.mobile_number;
          } else {
            console.log(`[Recipient Selection] Warning: Lookup yielded no database matches.`);
          }
        }
      }
    }

    const targetChannel = retry_log_id && oldLog ? oldLog.channel : (channel || 'WhatsApp');

    // Validate and format phone number for WhatsApp channel
    if (targetChannel === 'WhatsApp') {
      if (!finalPhone) {
        return res.status(400).json({ 
          success: false,
          error: "Recipient phone number is missing from the booking or guest record.",
          error_message: "Recipient phone number is missing from the booking or guest record.",
          reason: "Recipient phone number is missing from the booking or guest record."
        });
      }

      const formatted = formatIndianPhoneNumber(finalPhone);
      if (!formatted) {
        return res.status(400).json({
          success: false,
          error: `Recipient phone number "${finalPhone}" is invalid. Must contain a valid country code and local digits.`,
          error_message: `Recipient phone number "${finalPhone}" is invalid. Must contain a valid country code and local digits.`,
          reason: `Recipient phone number "${finalPhone}" is invalid. Must contain a valid country code and local digits.`
        });
      }
      finalPhone = formatted;
    }

    // Look up credentials from guest accounts to append to notification templates
    const lookupAccounts = dbOps.getGuestAccounts();
    const activeAcc = lookupAccounts.find(a => 
      String(a.guest_id_str) === String(finalGuestIdStr) || 
      String(a.account_id) === String(account_id)
    );
    const tempUsername = activeAcc ? activeAcc.username : "guest_temp";
    const tempPassword = activeAcc ? activeAcc.password_hash : "Password@123";

    // Capture standard template fallback text
    let finalMessageContent = customMessage || "";
    if (!finalMessageContent) {
      const activeBooking = dbOps.getBookings().find(b => String(b.booking_id) === String(resolvedBookingId)) || {
        booking_id: resolvedBookingId || 101,
        check_in_date: "08-Jun-2026",
        check_out_date: "12-Jun-2026",
        room_number: "201",
        price_per_night: 3500
      };
      
      finalMessageContent = getTemplateMessage(
        finalCommType, 
        activeAcc || { full_name: finalGuestName, guest_id_str: finalGuestIdStr, username: tempUsername, password_hash: tempPassword }, 
        activeBooking
      );
    }

    // Try to construct bespoke layout using Gemini if available
    if (getAiClient()) {
      try {
        const prompt = `Compose a short, highly secure luxury hotel message for active guest ${finalGuestName}. Custom content type classification: ${finalCommType}. Context: ${finalMessageContent}. Contact channel: WhatsApp/Email. Keep it under 2 lines. Maintain polished premium resort Sai Nirvana Plaza tone. IMPORTANT: If classification is "Guest Login Credentials" or "User Credentials", you MUST preserve and include the exact Username: ${tempUsername} and Temporary Password: ${tempPassword} fields so the guest can access their account.`;
        const aiClient = getAiClient();
        if (aiClient) {
          const aiResponse = await aiClient.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt
          });
          if (aiResponse && aiResponse.text) {
            const genText = aiResponse.text.trim();
            if ((finalCommType === "Guest Login Credentials" || finalCommType === "User Credentials") && (!genText.includes(tempUsername) || !genText.includes(tempPassword))) {
              console.warn("Gemini omitted credentials from generated message. Reverting to safe local template.");
            } else {
              finalMessageContent = genText;
            }
          }
        }
      } catch (geminiError) {
        console.warn("Gemini Customization issue, using standard template.");
      }
    }

    // 4. PROCESS RETRY OR DUAL-DISPATCH FLOW
    // 4. PROCESS RETRY OR DUAL-DISPATCH FLOW
    if (retry_log_id) {
      // Single log retry flow
      const logs = dbOps.getCommunicationLogs();
      const oldLog = logs.find(l => l.log_id === Number(retry_log_id));
      if (!oldLog) {
        return res.status(404).json({ 
          success: false,
          error: "Original communication log record not found for retry.",
          error_message: "Original communication log record not found for retry.",
          reason: "Original communication log record not found for retry."
        });
      }

      const retryAttempts = (oldLog.delivery_attempts || 1) + 1;
      dbOps.updateCommunicationLogStatus(oldLog.log_id, '🔵 In Progress', retryAttempts, "", oldLog.channel === 'Email' ? finalRecipientEmail : finalPhone, "");
      dbOps.updateCommunicationLogStatus(oldLog.log_id, '🟡 Pending Delivery', retryAttempts, "", oldLog.channel === 'Email' ? finalRecipientEmail : finalPhone, "");

      let succeeded = false;
      if (oldLog.channel === 'WhatsApp') {
        succeeded = await runWhatsAppDispatch(oldLog.log_id, finalPhone, finalMessageContent, finalGuestName, resolvedBookingId);
      } else {
        succeeded = await runEmailDispatch(oldLog.log_id, finalRecipientEmail, finalMessageContent);
      }

      const updatedLogs = dbOps.getCommunicationLogs();
      const updatedLog = updatedLogs.find(l => l.log_id === oldLog.log_id) || oldLog;

      if (succeeded) {
        return res.json({ success: true, log: updatedLog });
      } else {
        return res.status(400).json({
          success: false,
          error: updatedLog.failure_reason || "Delivery retry failed.",
          error_message: updatedLog.failure_reason || "Delivery retry failed.",
          reason: updatedLog.failure_reason || "Delivery retry failed.",
          log: updatedLog
        });
      }
    } else {
      // NEW DISPATCH - TRIGGER BOTH INDEPENDENTLY (Waterfall workflow satisfying the requirements)
      console.log("=== INITIATING COMPLETELY INDEPENDENT DISPATCH HIERARCHY ===");

      // Create WhatsApp Audit Entry first
      const whatsappLog = dbOps.createCommunicationLog({
        guest_id_str: finalGuestIdStr,
        guest_name: finalGuestName,
        channel: 'WhatsApp',
        status_info: '🔵 In Progress',
        staff_member: finalStaff,
        communication_type: finalCommType,
        recipient_email: finalPhone,
        api_response: "",
        failure_reason: ""
      });

      // Create Email Audit Entry second
      const emailLog = dbOps.createCommunicationLog({
        guest_id_str: finalGuestIdStr,
        guest_name: finalGuestName,
        channel: 'Email',
        status_info: '🔵 In Progress',
        staff_member: finalStaff,
        communication_type: finalCommType,
        recipient_email: finalRecipientEmail,
        api_response: "",
        failure_reason: ""
      });

      // Set both to Pending
      dbOps.updateCommunicationLogStatus(whatsappLog.log_id, '🟡 Pending Delivery', 1, "", finalPhone, "");
      dbOps.updateCommunicationLogStatus(emailLog.log_id, '🟡 Pending Delivery', 1, "", finalRecipientEmail, "");

      if (targetChannel === 'WhatsApp') {
        console.log(`[Queue Runner] Processing WhatsApp Dispatch Log #${whatsappLog.log_id}`);
        const wsSucceeded = await runWhatsAppDispatch(whatsappLog.log_id, finalPhone, finalMessageContent, finalGuestName, resolvedBookingId);
        
        // Also run email asynchronously in the background as a fallback/waterfall as originally designed
        setTimeout(async () => {
          console.log(`[Queue Runner] Transitioning to Email Log #${emailLog.log_id}`);
          await runEmailDispatch(emailLog.log_id, finalRecipientEmail, finalMessageContent);
          console.log(`[Queue Runner] Independent delivery loop completed safely.`);
        }, 50);

        const updatedLogs = dbOps.getCommunicationLogs();
        const updatedLog = updatedLogs.find(l => l.log_id === whatsappLog.log_id) || whatsappLog;

        if (wsSucceeded) {
          return res.json({ success: true, log: updatedLog });
        } else {
          return res.status(400).json({ 
            success: false, 
            error: updatedLog.failure_reason || "WhatsApp delivery failed.",
            error_message: updatedLog.failure_reason || "WhatsApp delivery failed.",
            reason: updatedLog.failure_reason || "WhatsApp delivery failed.",
            log: updatedLog 
          });
        }
      } else {
        // channel === 'Email'
        console.log(`[Queue Runner] Processing Email Dispatch Log #${emailLog.log_id}`);
        const emailSucceeded = await runEmailDispatch(emailLog.log_id, finalRecipientEmail, finalMessageContent);

        // Run WhatsApp asynchronously in the background
        setTimeout(async () => {
          console.log(`[Queue Runner] Transitioning to WhatsApp Log #${whatsappLog.log_id}`);
          await runWhatsAppDispatch(whatsappLog.log_id, finalPhone, finalMessageContent, finalGuestName, resolvedBookingId);
          console.log(`[Queue Runner] Independent delivery loop completed safely.`);
        }, 50);

        const updatedLogs = dbOps.getCommunicationLogs();
        const updatedLog = updatedLogs.find(l => l.log_id === emailLog.log_id) || emailLog;

        if (emailSucceeded) {
          return res.json({ success: true, log: updatedLog });
        } else {
          return res.status(400).json({ 
            success: false, 
            error: updatedLog.failure_reason || "Email delivery failed.",
            error_message: updatedLog.failure_reason || "Email delivery failed.",
            reason: updatedLog.failure_reason || "Email delivery failed.",
            log: updatedLog 
          });
        }
      }
    }

  } catch (err: any) {
    console.error("Critical Dispatch Failure:", err);
    res.status(500).json({ error: err.message });
  }
});

// Asynchronous background bulk messaging endpoint
app.post('/api/auth/bulk-dispatch', async (req, res) => {
  const {
    selection_type,     // 'single' | 'multiple' | 'group' | 'broadcast'
    target_ids,         // array of guest_id_str / guest_id for multiple / single selection
    group_segment,      // 'checkins_today' | 'checked_in' | 'checked_out' | 'corporate'
    channels,           // Array: ['WhatsApp'], ['Email'], or ['WhatsApp', 'Email']
    communication_type, // 'User Credentials' | 'Notifications' | 'Alerts' | etc.
    customMessage,
    staff_member
  } = req.body;

  try {
    const guests = dbOps.getGuests();
    const accounts = dbOps.getGuestAccounts();
    const bookings = dbOps.getBookings();

    let resolvedAccounts: any[] = [];

    if (selection_type === 'broadcast') {
      resolvedAccounts = accounts;
    } else if (selection_type === 'group') {
      const todayDate = new Date().toISOString().split('T')[0];
      if (group_segment === 'checkins_today') {
        const checkinsGuestIds = bookings
          .filter(b => b.check_in_date === todayDate)
          .map(b => b.guest_id);
        resolvedAccounts = accounts.filter(acc => {
          const guest = guests.find(g => g.email.toLowerCase() === acc.email.toLowerCase());
          return guest && checkinsGuestIds.includes(guest.guest_id);
        });
      } else if (group_segment === 'checked_in') {
        const activeGuestIds = bookings
          .filter(b => b.booking_status === 'Checked-In')
          .map(b => b.guest_id);
        resolvedAccounts = accounts.filter(acc => {
          const guest = guests.find(g => g.email.toLowerCase() === acc.email.toLowerCase());
          return guest && activeGuestIds.includes(guest.guest_id);
        });
      } else if (group_segment === 'checked_out') {
        const pastGuestIds = bookings
          .filter(b => b.booking_status === 'Checked-Out')
          .map(b => b.guest_id);
        resolvedAccounts = accounts.filter(acc => {
          const guest = guests.find(g => g.email.toLowerCase() === acc.email.toLowerCase());
          return guest && pastGuestIds.includes(guest.guest_id);
        });
      } else if (group_segment === 'corporate') {
        const corpGuestIds = bookings
          .filter(b => b.booking_source === 'Corporate')
          .map(b => b.guest_id);
        resolvedAccounts = accounts.filter(acc => {
          const guest = guests.find(g => g.email.toLowerCase() === acc.email.toLowerCase());
          return guest && corpGuestIds.includes(guest.guest_id);
        });
      }
    } else if (selection_type === 'multiple' && Array.isArray(target_ids)) {
      resolvedAccounts = accounts.filter(acc => 
        target_ids.includes(String(acc.account_id)) || target_ids.includes(String(acc.guest_id_str))
      );
    } else if (selection_type === 'single') {
      resolvedAccounts = accounts.filter(acc => 
        String(acc.account_id) === String(req.body.guest_id) || String(acc.guest_id_str) === String(req.body.guest_id)
      );
    }

    if (resolvedAccounts.length === 0 && req.body.guest_id) {
      // Direct guest lookup fallback
      const targetGuest = guests.find(g => String(g.guest_id) === String(req.body.guest_id));
      if (targetGuest) {
        resolvedAccounts = [{
          account_id: targetGuest.guest_id,
          guest_id_str: `SNP-GUEST-${targetGuest.guest_id}`,
          username: targetGuest.email.split('@')[0],
          password_hash: "Temp@123",
          full_name: targetGuest.full_name,
          email: targetGuest.email,
          mobile_number: targetGuest.mobile_number,
          stay_duration: "N/A",
          room_preference: "N/A"
        }];
      }
    }

    const finalStaff = staff_member || 'Operations Console';
    const createdLogs: any[] = [];

    // Create log entries in Pending state to show in the UI immediately
    for (const acc of resolvedAccounts) {
      for (const channel of channels) {
        const log = dbOps.createCommunicationLog({
          guest_id_str: acc.guest_id_str,
          guest_name: acc.full_name,
          channel: channel as 'WhatsApp' | 'Email',
          status_info: '🟡 Pending Delivery',
          staff_member: finalStaff,
          communication_type: communication_type || 'Notification',
          recipient_email: channel === 'Email' ? acc.email : acc.mobile_number,
          api_response: "",
          failure_reason: ""
        });
        createdLogs.push({ log, acc });
      }
    }

    // Process dispatches asynchronously in background to avoid freezing the UI
    setTimeout(async () => {
      console.log(`[Bulk Dispatcher] Starting processing queue of ${createdLogs.length} logs...`);
      for (const { log, acc } of createdLogs) {
        // Retrieve booking reference for templates
        const guest = guests.find(g => g.email.toLowerCase() === acc.email.toLowerCase());
        const matchingBooking: any = (guest ? bookings.find(b => b.guest_id === guest.guest_id) : null) || {
          booking_id: 101,
          check_in_date: "08-Jun-2026",
          check_out_date: "12-Jun-2026",
          room_number: "201",
          price_per_night: 3500
        };

        let finalMessage = customMessage || "";
        if (!finalMessage) {
          finalMessage = getTemplateMessage(communication_type, acc, matchingBooking);
        }

        // Apply Gemini enhancement if active
        const aiClient = getAiClient();
        if (aiClient) {
          try {
            const prompt = `Compose a short, highly secure luxury hotel message for active guest ${acc.full_name}. Custom content type classification: ${communication_type}. Context: ${finalMessage}. Contact channel: ${log.channel}. Keep it under 2 lines. Maintain polished premium resort Sai Nirvana Plaza tone. IMPORTANT: If classification is "User Credentials" or "User Credentials", you MUST preserve and include the exact Username: ${acc.username} and Temporary Password: ${acc.password_hash} fields so the guest can access their account.`;
            const aiResponse = await aiClient.models.generateContent({
              model: 'gemini-3.5-flash',
              contents: prompt
            });
            if (aiResponse && aiResponse.text) {
              const genText = aiResponse.text.trim();
              if (communication_type === 'User Credentials' && (!genText.includes(acc.username) || !genText.includes(acc.password_hash))) {
                // Keep default message template
              } else {
                finalMessage = genText;
              }
            }
          } catch (e) {
            // fallback
          }
        }

        let retrievedPhone = acc.mobile_number || (guest ? guest.mobile_number : "");
        let guestName = acc.full_name || (guest ? guest.full_name : "Valued Guest");
        let bookingId = "";

        if (matchingBooking && matchingBooking.booking_id !== 101) {
          bookingId = String(matchingBooking.booking_id);
        }

        // Set status to In Progress
        dbOps.updateCommunicationLogStatus(log.log_id, '🔵 In Progress', 1, "", log.channel === 'Email' ? acc.email : retrievedPhone, "");

        try {
          // Dispatch directly through default channels (WhatsApp/Email)
          if (log.channel === 'WhatsApp') {
            const formattedPhone = formatIndianPhoneNumber(retrievedPhone);
            if (!formattedPhone) {
              console.error(`[Bulk Dispatcher] Invalid phone number "${retrievedPhone}" for guest "${guestName}". Skipping WhatsApp dispatch.`);
              dbOps.updateCommunicationLogStatus(
                log.log_id,
                '🔴 Delivery Failed',
                1,
                `Invalid phone number format: "${retrievedPhone}"`,
                retrievedPhone,
                "",
                "400"
              );
              continue;
            }
            await runWhatsAppDispatch(log.log_id, formattedPhone, finalMessage, guestName, bookingId);
          } else {
            await runEmailDispatch(log.log_id, acc.email, finalMessage);
          }
        } catch (dispatchError) {
          console.error(`[Bulk Dispatcher] Failed to dispatch log #${log.log_id} to ${retrievedPhone}:`, dispatchError);
          dbOps.updateCommunicationLogStatus(
            log.log_id,
            '🔴 Delivery Failed',
            1,
            String(dispatchError) || "System dispatcher error.",
            log.channel === 'Email' ? acc.email : retrievedPhone,
            "",
            "500"
          );
        }

        // Sleep 150ms between sends to simulate carrier packet delivery queueing and prevent API rate limiting
        await delay(150);
      }
      console.log(`[Bulk Dispatcher] Background processing finished.`);
    }, 500);

    res.json({ success: true, count: resolvedAccounts.length, logs: createdLogs.map(item => item.log) });
  } catch (err: any) {
    console.error("Bulk Dispatch API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Configure Vite standard fallback middleware for Single Page Applications
async function mountVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Helper: kill whatever process is occupying a port (Windows)
  function freePort(port: number): void {
    try {
      const { execSync } = require('child_process');
      // Find the PID listening on the port
      const result = execSync(
        `netstat -ano | findstr ":${port} " | findstr "LISTENING"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();
      if (result) {
        const parts = result.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
          console.log(`[Auto-Recovery] Freed port ${port} by terminating PID ${pid}`);
        }
      }
    } catch {
      // Silently ignore — port may already be free
    }
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sai Nirvana Plaza server booting successfully!`);
    console.log(`Local Access Link: http://localhost:${PORT}`);
  });

  // Graceful EADDRINUSE recovery: auto-kill the occupying process and retry once
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Auto-Recovery] Port ${PORT} is occupied. Attempting to free it automatically...`);
      freePort(PORT);
      // Wait briefly for the OS to release the port, then retry
      setTimeout(() => {
        server.close();
        const retryServer = app.listen(PORT, '0.0.0.0', () => {
          console.log(`Sai Nirvana Plaza server booting successfully! (retry)`);
          console.log(`Local Access Link: http://localhost:${PORT}`);
        });
        retryServer.on('error', (retryErr: NodeJS.ErrnoException) => {
          console.error(`[Auto-Recovery] Retry failed: ${retryErr.message}`);
          console.error(`Please close other applications using port ${PORT} and run: npm run dev`);
          process.exit(1);
        });
      }, 1500);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

if (!process.env.VERCEL) {
  mountVite();
}

export default app;

