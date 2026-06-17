/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Calendar, Landmark, MessageSquare, Coffee, Clipboard, ShieldCheck, 
  Send, Sparkles, Loader2, CheckCircle2, Ticket, AlertTriangle, AlertCircle,
  ShoppingBag, Bell, Search, Receipt, Plus, Minus, Info, X, Printer, Download,
  Check, CheckSquare, FileText, Clock, ArrowUpRight, CheckSquare2
} from 'lucide-react';
import { Booking, Complaint, Feedback, RoomServiceRequest, Payment, GuestAccount } from '../types';
import { playSound } from '../soundUtils';
import { generatePdfReport } from '../utils/pdfGenerator';

interface GuestDashboardProps {
  loggedInGuest?: GuestAccount | null;
  onUpdateGuest?: (acc: GuestAccount) => void;
}

interface FoodItem {
  id: string;
  name: string;
  category: 'Breakfast' | 'Main Meals' | 'Snacks' | 'Beverages';
  price: number;
  deliveryTime: number; // in minutes
  description: string;
}

const DINING_MENU: FoodItem[] = [
  // Breakfast Items
  { id: 'b1', name: "Steaming Idli Sambar Plate", category: 'Breakfast', price: 150, deliveryTime: 15, description: "Three fluffy steamed rice cakes with classic vegetable lentil sambar & fresh coconut chutney." },
  { id: 'b2', name: "Crisp Masala Dosa", category: 'Breakfast', price: 180, deliveryTime: 20, description: "Fermented rice & lentil shell filled with signature spiced potato mash, served with podi & ghee." },
  { id: 'b3', name: "Continental Breakfast Basket", category: 'Breakfast', price: 250, deliveryTime: 15, description: "Assorted hot croissants, multi-grain toast, unsalted butter with organic berries preserve and orange juice." },
  
  // Lunch / Dinner (Main Meals)
  { id: 'm1', name: "North Indian Paneer Butter Masala Meal", category: 'Main Meals', price: 320, deliveryTime: 25, description: "Cottage cheese cubes bathed in rich butter-cream tomato gravy, served with basmati rice & naan." },
  { id: 'm2', name: "Awadhi Fragrant Vegetable Biryani", category: 'Main Meals', price: 350, deliveryTime: 30, description: "Layered royal recipe long-grain basmati rice with exotic vegetables, gold saffron and kewra." },
  { id: 'm3', name: "Sri Nirvana Dal Makhani with Laccha Paratha", category: 'Main Meals', price: 280, deliveryTime: 20, description: "Slow cream-churned black lentils simmered for 24 hours, paired with layered crispy flatbread." },
  
  // Snacks
  { id: 's1', name: "Hot Samosas with Mint Chutney (Plate of 2)", category: 'Snacks', price: 90, deliveryTime: 10, description: "Spiced potato turnover pastries with savory whole pea nodes, accompanied by mint & sweet dates pulp." },
  { id: 's2', name: "Crispy Vegetable Pakodas", category: 'Snacks', price: 120, deliveryTime: 15, description: "Deep-fried gram-flour coated crispies of hand-sliced onions, spinach and premium potatoes." },
  { id: 's3', name: "Club Sandwich with Golden Fries", category: 'Snacks', price: 210, deliveryTime: 20, description: "Three-layered white toast with grilled bell peppers, garden lettuce, cucumber, and cheddar slices." },
  
  // Beverages
  { id: 'be1', name: "Traditional Adrak Masala Tea", category: 'Beverages', price: 60, deliveryTime: 10, description: "Hand-milled Assam dust tea boiled with fresh ginger nodes, lemongrass, and rich farm milk." },
  { id: 'be2', name: "Southern Filter Coffee", category: 'Beverages', price: 80, deliveryTime: 10, description: "Strong traditional decanter chicory-coffee extraction whipped with foamed whole milk." },
  { id: 'be3', name: "Fresh Mint Lime Soda (Sweet & Salted)", category: 'Beverages', price: 100, deliveryTime: 10, description: "Squeezed fresh green lemon, dynamic mint block, mineral soda with natural sweet-salt crystals." }
];

interface GuestNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'booking' | 'dining' | 'issue' | 'payment' | 'offer';
  read: boolean;
}

export function GuestDashboard({ loggedInGuest, onUpdateGuest }: GuestDashboardProps) {
  // Determine guest email dynamically or fallback to test account
  const guestEmail = loggedInGuest?.email || 'thunikipatiabhiram173@gmail.com';
  const guestName = loggedInGuest?.full_name || 'Valued Guest';
  const guestIdStr = loggedInGuest?.guest_id_str || 'SNP2026001';

  // Sub-Tab Switcher state
  const [activeTab, setActiveTab] = useState<'active-stay' | 'history' | 'receipts' | 'dining' | 'issues'>('active-stay');

  // Bookings state loaded from MySQL APIs
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoadingStays, setIsLoadingStays] = useState(false);

  // Active Stay extraction
  const [activeStays, setActiveStays] = useState<Booking[]>([]);
  const [selectedActiveStayId, setSelectedActiveStayId] = useState<number | null>(null);
  const activeStay = activeStays.find(s => s.booking_id === selectedActiveStayId) || activeStays[0] || null;
  const [stayHistory, setStayHistory] = useState<Booking[]>([]);

  // Dining States & Cart logic
  const [diningCategory, setDiningCategory] = useState<'All' | 'Breakfast' | 'Main Meals' | 'Snacks' | 'Beverages'>('All');
  const [cart, setCart] = useState<{ item: FoodItem; quantity: number }[]>([]);
  const [placedOrders, setPlacedOrders] = useState<RoomServiceRequest[]>([]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState('');

  // Issues State & Inputs
  const [issues, setIssues] = useState<Complaint[]>([]);
  const [issueCategory, setIssueCategory] = useState<Complaint['complaint_category']>('Wi-Fi Internet Disconnections');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [issuePriority, setIssuePriority] = useState<Complaint['priority_level']>('Medium');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{ priority: string; reasoning: string } | null>(null);

  // Stay History visual filtering & searching
  const [searchQuery, setSearchQuery] = useState('');
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');

  // Invoice Detailed modal state
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<Booking | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<GuestNotification[]>([
    {
      id: 'n1',
      title: 'Welcome to Sri Nirvana Portal',
      message: `Namaste, ${guestName}! Rest assured that your stay is locked in with premium 256-bit database hashing. Enjoy seamless self-service benefits.`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      type: 'booking',
      read: false
    }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Feedback states
  const [fbRating, setFbRating] = useState(5);
  const [fbComment, setFbComment] = useState('');
  const [isSubmittingFb, setIsSubmittingFb] = useState(false);
  const [fbSuccess, setFbSuccess] = useState(false);

  // AI Summary States
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiSummary, setAiSummary] = useState<{ summary: string; whatsapp_template: string } | null>(null);

  // Active status progression interval refs
  const prevOrdersRef = useRef<RoomServiceRequest[]>([]);
  const prevIssuesRef = useRef<Complaint[]>([]);

  // Initialize and Fetch MySQL Data
  const fetchAllData = async (silent = false, pollOnly = false) => {
    if (!silent) setIsLoadingStays(true);
    try {
      // Fetch endpoints depending on whether it's a poll or a full sync
      const fetchBookingsPromise = pollOnly ? Promise.resolve(null) : fetch('/api/bookings');
      const fetchPaymentsPromise = pollOnly ? Promise.resolve(null) : fetch('/api/payments');
      const fetchAccountsPromise = pollOnly ? Promise.resolve(null) : fetch('/api/auth/guest-accounts');
      const fetchServicePromise = fetch('/api/room-service');
      const fetchComplaintPromise = fetch('/api/complaints');

      // Fetch all endpoints in parallel
      const [bookRes, payRes, serviceRes, complaintRes, accountRes] = await Promise.all([
        fetchBookingsPromise,
        fetchPaymentsPromise,
        fetchServicePromise,
        fetchComplaintPromise,
        fetchAccountsPromise
      ]);

      if (accountRes && accountRes.ok) {
        const accData = await accountRes.json();
        const myAccount = accData.accounts.find((a: any) => a.email.toLowerCase() === guestEmail.toLowerCase());
        if (myAccount && onUpdateGuest) {
          if (JSON.stringify(myAccount) !== JSON.stringify(loggedInGuest)) {
            onUpdateGuest(myAccount);
          }
        }
      }

      let myBookings: Booking[] = bookings;
      if (bookRes && bookRes.ok) {
        const data = await bookRes.json();
        // filter by email
        myBookings = data.bookings.filter((b: Booking) => b.guest_email?.toLowerCase() === guestEmail.toLowerCase());
        setBookings(myBookings);

        // Classify stays
        const activeList = myBookings.filter(b => b.booking_status === 'Checked-In');
        setActiveStays(activeList);
        setSelectedActiveStayId(prev => {
          if (prev && activeList.some(s => s.booking_id === prev)) {
            return prev;
          }
          return activeList[0]?.booking_id || null;
        });

        const history = myBookings.filter(b => b.booking_status === 'Checked-Out' || b.booking_status === 'Cancelled');
        setStayHistory(history);
      }

      if (payRes && payRes.ok) {
        const data = await payRes.json();
        // filter payments corresponding to our bookings
        const bookingIds = myBookings.map(b => b.booking_id);
        const myPayments = data.payments.filter((p: Payment) => bookingIds.includes(p.booking_id));
        setPayments(myPayments);
      }

      if (serviceRes.ok) {
        const data = await serviceRes.json();
        const activeRoomIds = myBookings.filter(b => b.booking_status === 'Checked-In').map(b => b.room_id);
        let myServices: RoomServiceRequest[] = data.requests.filter((r: RoomServiceRequest) => 
          activeRoomIds.includes(r.room_id) || r.guest_name?.toLowerCase() === guestName.toLowerCase()
        );
        setPlacedOrders(myServices);

        // Check for state changes to trigger live notification alerts
        if (silent && prevOrdersRef.current.length > 0) {
          myServices.forEach(curr => {
            const prev = prevOrdersRef.current.find(p => p.request_id === curr.request_id);
            if (prev && prev.request_status !== curr.request_status) {
              triggerInAppNotification(
                'Dining Request Update',
                `Your room dining order #${curr.request_id} has progressed to: ${curr.request_status}`,
                'dining'
              );
            }
          });
        }
        prevOrdersRef.current = myServices;
      }

      if (complaintRes.ok) {
        const data = await complaintRes.json();
        const myComplaints = data.complaints.filter((c: Complaint) => c.guest_name?.toLowerCase() === guestName.toLowerCase());
        setIssues(myComplaints);

        // Check for state changes to trigger live notification alerts
        if (silent && prevIssuesRef.current.length > 0) {
          myComplaints.forEach(curr => {
            const prev = prevIssuesRef.current.find(p => p.complaint_id === curr.complaint_id);
            if (prev && prev.complaint_status !== curr.complaint_status) {
              triggerInAppNotification(
                'Issue Desk Update',
                `Ticket #${curr.complaint_id} (${curr.complaint_category}) is now: ${curr.complaint_status}`,
                'issue'
              );
            }
          });
        }
        prevIssuesRef.current = myComplaints;
      }

    } catch (err) {
      console.warn("Error querying MySQL central structures:", err);
    } finally {
      if (!silent) setIsLoadingStays(false);
    }
  };

  // Sound and notification trigger helper
  const triggerInAppNotification = (title: string, message: string, type: GuestNotification['type']) => {
    if (type === 'offer') {
      playSound('offer');
    } else {
      playSound('success');
    }
    const newNotif: GuestNotification = {
      id: 'notif_' + Date.now() + Math.random().toString(36).substring(2, 6),
      title,
      message,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      type,
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Initial Data Fetch
  useEffect(() => {
    fetchAllData();
  }, [guestEmail]);


  // INSTANT SYNC: Listen for Front Desk booking status broadcasts.
  // FrontDeskDashboard writes 'snp_booking_status_change' to localStorage after
  // every Check-In or Check-Out. This storage event fires in the same tab and
  // across all tabs on the same origin — eliminating the polling delay.
  // HousekeepingDashboard writes 'snp_service_status_change' to localStorage
  // after every room-service or complaint status update.
  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (
        e.key === 'snp_booking_status_change' ||
        e.key === 'snp_service_status_change'
      ) {
        // A status changed on Front Desk or Housekeeping — refresh immediately
        fetchAllData(true);
      }
    };

    // Also handle same-tab dispatched events via custom DOM events
    const handleSameTabSync = () => {
      fetchAllData(true);
    };

    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('snp_booking_status_change', handleSameTabSync);
    window.addEventListener('snp_service_status_change', handleSameTabSync);

    return () => {
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('snp_booking_status_change', handleSameTabSync);
      window.removeEventListener('snp_service_status_change', handleSameTabSync);
    };
  }, [guestEmail]);

  // POLLING FALLBACK: Refresh room-service + complaint data every 10 seconds.
  // This guarantees GuestDashboard always converges to the latest status even
  // when running in a separate browser tab where cross-tab custom DOM events
  // cannot fire.
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchAllData(true, true);
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [guestEmail]);

  const getGuestStatusLabel = () => {
    const myBookings = bookings.filter((b: Booking) => b.booking_status !== 'Cancelled');
    if (myBookings.some(b => b.booking_status === 'Checked-In')) {
      return 'Active';
    }
    const latest = myBookings.sort((a, b) => b.booking_id - a.booking_id)[0];
    if (!latest) return 'Inactive';
    if (latest.booking_status === 'Pending' || latest.booking_status === 'Confirmed') {
      return 'Pending';
    }
    if (latest.booking_status === 'Verified') {
      return 'Verified';
    }
    if (latest.booking_status === 'Checked-Out') {
      return 'Inactive';
    }
    return 'Inactive';
  };

  // Request AI Booking Summary using Gemini 3.5 API
  const fetchAiSummary = async (targetStay?: Booking) => {
    const stay = targetStay || activeStay;
    if (!stay) return;
    setIsLoadingAi(true);
    setAiSummary(null);
    playSound('assistant');
    try {
      const pm = payments.find(p => p.booking_id === stay.booking_id);
      const res = await fetch('/api/ai/booking-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: guestName,
          room_type: stay.room_type,
          room_number: stay.room_number,
          check_in: stay.check_in_date,
          check_out: stay.check_out_date,
          total_paid: pm ? pm.amount : stay.price_per_night * 4,
          payment_method: pm ? pm.payment_method : 'UPI'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data);
        playSound('success');
        triggerInAppNotification(
          'Gemini AI Breakdown Complete',
          `A reservation summary for ${guestName} (Room ${activeStay.room_number}) synthesized by Gemini 3.5 Flash.`,
          'booking'
        );
      }
    } catch (err) {
      console.warn("Could not retrieve AI stay summary:", err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Add Item to Shopping Cart
  const handleAddToCart = (item: FoodItem) => {
    playSound('click');
    setCart(prev => {
      const found = prev.find(i => i.item.id === item.id);
      if (found) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  // Modify quantity inside Shopping Cart
  const handleUpdateCartQty = (itemId: string, increment: boolean) => {
    playSound('tap');
    setCart(prev => {
      return prev.map(i => {
        if (i.item.id === itemId) {
          const nextQty = increment ? i.quantity + 1 : i.quantity - 1;
          return nextQty > 0 ? { ...i, quantity: nextQty } : null;
        }
        return i;
      }).filter(Boolean) as { item: FoodItem; quantity: number }[];
    });
  };

  // Checkout Receipt Download implementation
  const downloadInvoicePdf = (booking: Booking, payment?: Payment) => {
    if (!booking) return;
    const invoiceNum = `INV-2026-${String(booking.booking_id).padStart(3, '0')}`;

    // Generate and download a real professional PDF invoice report
    generatePdfReport('receipt', { bookings: [booking], payments: payment ? [payment] : [] }, {
      customBooking: booking,
      customPayment: payment,
      generatedBy: guestName || "Sai Nirvana Guest"
    });
    
    // Play sound and trigger feedback
    playSound('success');
    triggerInAppNotification(
      'Receipt Downloaded',
      `VAT/GST compliant tax receipt invoice ${invoiceNum} exported as PDF successfully.`,
      'payment'
    );
  };

  const triggerWindowPrint = () => {
    playSound('print');
    if (!selectedInvoiceBooking) {
      alert("Receipt data not available.");
      return;
    }

    const booking = selectedInvoiceBooking;
    const payment = payments.find(p => p.booking_id === booking.booking_id);

    // Calculate nights
    const date1 = new Date(booking.check_in_date);
    const date2 = new Date(booking.check_out_date);
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    const amountWithGst = payment ? payment.amount : booking.price_per_night * diffDays * 1.18;
    const gstVal = payment ? payment.gst_amount : Math.round(booking.price_per_night * diffDays * 0.18);
    const baseRate = amountWithGst - gstVal;
    
    const receiptNum = `REC-2026-${String(booking.booking_id).padStart(3, '0')}`;
    const formattedGeneratedDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const htmlString = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${receiptNum}</title>
          <style>
            body {
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              color: #1e293b;
              background: #ffffff;
              padding: 30px;
              margin: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 30px;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #cbd5e1;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .logo-container {
              font-size: 32px;
              margin-bottom: 8px;
            }
            .hotel-name {
              font-size: 20px;
              font-weight: 800;
              color: #003366;
              margin: 0;
              letter-spacing: 0.5px;
            }
            .hotel-sub {
              font-size: 10px;
              color: #64748b;
              margin: 4px 0 8px;
            }
            .badge {
              display: inline-block;
              font-size: 10px;
              font-weight: 700;
              background: #f1f5f9;
              color: #0f172a;
              border: 1px solid #e2e8f0;
              padding: 3px 10px;
              border-radius: 9999px;
              letter-spacing: 0.5px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
              font-size: 11px;
            }
            .grid-col-right {
              text-align: right;
            }
            .section-title {
              font-size: 9px;
              font-weight: 800;
              color: #003366;
              letter-spacing: 0.75px;
              text-transform: uppercase;
              margin: 0 0 6px;
            }
            .value {
              font-weight: 600;
              color: #0f172a;
              margin: 2px 0;
            }
            .label-sub {
              color: #64748b;
              margin: 2px 0;
            }
            .stay-banner {
              background: rgba(0, 51, 102, 0.03);
              border: 1px solid rgba(0, 51, 102, 0.06);
              border-radius: 10px;
              padding: 10px 14px;
              font-size: 11px;
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              color: #003366;
            }
            .stay-banner strong {
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 11px;
            }
            th {
              color: #64748b;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 9px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
              text-align: left;
            }
            td {
              padding: 10px 0;
              border-bottom: 1px solid #f1f5f9;
            }
            .text-right {
              text-align: right;
            }
            .total-row {
              font-weight: 800;
              font-size: 12px;
              color: #0f172a;
            }
            .total-row td {
              border-top: 2px double #cbd5e1;
              border-bottom: 2px double #cbd5e1;
              padding: 12px 6px;
              background: #f8fafc;
            }
            .footer-note {
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
              font-style: italic;
              margin-top: 25px;
            }
            @media print {
              body {
                padding: 0;
                background: none;
              }
              .container {
                border: none;
                box-shadow: none;
                padding: 0;
                max-width: 100%;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-container">🏨</div>
              <h1 class="hotel-name">SAI NIRVANA PLAZA HOTEL</h1>
              <p class="hotel-sub">Sector 22, Dwarka, New Delhi - 110077 | Tel: +91 11-4560-6000</p>
              <span class="badge">OFFICIAL STAY RECEIPT (GST TAX INVOICE)</span>
            </div>

            <div class="grid">
              <div>
                <h3 class="section-title">GUEST INFORMATION</h3>
                <p class="value">Guest Name: ${guestName}</p>
                <p class="label-sub">Email: ${guestEmail}</p>
                <p class="label-sub">Guest ID: ${guestIdStr}</p>
              </div>
              <div class="grid-col-right">
                <h3 class="section-title">RECEIPT DETAILS</h3>
                <p class="value">Receipt Number: ${receiptNum}</p>
                <p class="label-sub">Booking ID: BK-${booking.booking_id}</p>
                <p class="label-sub">Payment: ${payment?.payment_method || 'UPI'}</p>
                <p class="label-sub">Payment Status: <strong style="color: #10b981;">${payment?.payment_status || 'Paid'}</strong></p>
              </div>
            </div>

            <div class="stay-banner">
              <span>Room Number: <strong>${booking.room_number || 'N/A'}</strong></span>
              <span>Room Type: <strong>${booking.room_type}</strong></span>
              <span>Stay: <strong>${booking.check_in_date}</strong> to <strong>${booking.check_out_date}</strong> (${diffDays} Nights)</span>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-right">Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Base Lodging Fee (${diffDays} Nights @ ₹${booking.price_per_night?.toLocaleString('en-IN') || '0'}/Night)</td>
                  <td class="text-right">₹${baseRate.toLocaleString('en-IN')}.00</td>
                </tr>
                <tr>
                  <td>Central GST (CGST) at 9.0%</td>
                  <td class="text-right">₹${(gstVal / 2).toLocaleString('en-IN')}.00</td>
                </tr>
                <tr>
                  <td>State GST (SGST) at 9.0%</td>
                  <td class="text-right">₹${(gstVal / 2).toLocaleString('en-IN')}.00</td>
                </tr>
                <tr class="total-row">
                  <td>Total Amount (GST-Itemized Final)</td>
                  <td class="text-right">₹${amountWithGst.toLocaleString('en-IN')}.00</td>
                </tr>
              </tbody>
            </table>

            <div class="grid" style="margin-top: 20px; font-size: 10px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
              <div>
                <p class="label-sub">Generated Date: <strong>${formattedGeneratedDate}</strong></p>
                <p class="label-sub">Authority: Digital Signature Processed</p>
              </div>
              <div class="grid-col-right">
                <p class="value" style="font-size: 11px; color: #003366;">Sai Nirvana Front Desk</p>
                <p class="label-sub">System Generated Invoice</p>
              </div>
            </div>

            <div class="footer-note">
              This is a standard system generated document under Indian GST regulations. No physical signature required.
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlString);
      doc.close();
    }

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1500);
  };

  // Submit Room Dining Order
  const handlePlaceDiningOrder = async () => {
    if (cart.length === 0) return;
    if (!activeStay) {
      alert("Must have an active checked-in stay at Sai Nirvana Plaza to request room service dining.");
      return;
    }

    setIsPlacingOrder(true);
    setOrderFeedback('');
    playSound('confirm');

    // Create itemized details string
    const itemsDescription = cart.map(i => `${i.item.name} (Qty: ${i.quantity}, Price: ₹${i.item.price})`).join(', ');
    const finalRequestType = `Dining Order: [${itemsDescription}]`;

    try {
      const res = await fetch('/api/room-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: guestEmail,
          request_type: finalRequestType,
          room_id: activeStay.room_id,
          booking_id: activeStay.booking_id
        })
      });

      if (res.ok) {
        const data = await res.json();
        playSound('success');
        setCart([]);
        setOrderFeedback('Your gourmet dining order has been delivered to Sri Nirvana Kitchen.');
        triggerInAppNotification(
          'Dining Order Placed',
          `Order #${data.request?.request_id || ''} for Room ${activeStay.room_number || ''} submitted successfully. Estimated prep time: ${Math.max(...cart.map(c => c.item.deliveryTime))} mins.`,
          'dining'
        );
        setTimeout(() => setOrderFeedback(''), 6000);
        fetchAllData(true);
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to submit kitchen order. Verify stay status.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Submit Issue Desk Complaint
  const handleLodgeComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueDesc.trim()) return;
    if (!activeStay) {
      alert("Only checked-in active guests can file complaints.");
      return;
    }

    setIsSubmittingIssue(true);
    setIssueSuccess(false);
    setAiAnalysis(null);
    playSound('confirm');

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: guestEmail,
          complaint_category: issueCategory,
          complaint_description: `${issueTitle ? issueTitle + ' - ' : ''}${issueDesc}`,
          room_id: activeStay.room_id,
          booking_id: activeStay.booking_id
        })
      });

      const data = await res.json();

      if (res.ok) {
        playSound('success');
        setIssueSuccess(true);
        setIssueTitle('');
        setIssueDesc('');
        
        // Expose Gemini AI-graded Priority and Reason
        if (data.ai_insights) {
          setAiAnalysis({
            priority: data.ai_insights.priority_assigned,
            reasoning: data.ai_insights.reasoning
          });
        }
        
        triggerInAppNotification(
          'Issue Token Created',
          `Complaint filed successfully. Segment priority graded by Gemini AI as: ${data.complaint?.priority_level || 'Medium'}`,
          'issue'
        );
        setTimeout(() => setIssueSuccess(false), 8000);
        fetchAllData(true);
      } else {
        alert(data.error || "Unable to submit ticket.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  // Submit Feedback & Comments
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbComment.trim()) return;
    setIsSubmittingFb(true);
    setFbSuccess(false);
    playSound('confirm');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: guestName,
          email: guestEmail,
          rating: fbRating,
          comments: fbComment
        })
      });
      if (res.ok) {
        playSound('success');
        setFbSuccess(true);
        setFbComment('');
        setTimeout(() => setFbSuccess(false), 5050);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingFb(false);
    }
  };

  // Stays History Visual Filtering Logic
  const filteredStays = React.useMemo(() => {
    return stayHistory.filter(b => {
      // 1. Search text filter
      const matchesQuery = searchQuery ? (
        (b.room_number && b.room_number.includes(searchQuery)) ||
        (b.room_type && b.room_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.booking_id && String(b.booking_id).includes(searchQuery))
      ) : true;

      // 2. Date filters
      const matchesStart = startDateStr ? (b.check_in_date >= startDateStr) : true;
      const matchesEnd = endDateStr ? (b.check_out_date <= endDateStr) : true;

      return matchesQuery && matchesStart && matchesEnd;
    });
  }, [stayHistory, searchQuery, startDateStr, endDateStr]);

  // Calculate dynamic cart amounts
  const cartSubtotal = cart.reduce((acc, c) => acc + (c.item.price * c.quantity), 0);
  const cartGst = Math.round(cartSubtotal * 0.18); // standard 18% restaurant service tax in dynamic segments
  const cartTotal = cartSubtotal + cartGst;

  // Filter dining catalog list
  const filteredDiningMenu = React.useMemo(() => {
    return diningCategory === 'All' 
      ? DINING_MENU 
      : DINING_MENU.filter(m => m.category === diningCategory);
  }, [diningCategory]);

  // Mark all notifications as read helper
  const markAllNotificationsRead = () => {
    playSound('tap');
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="space-y-6" id="active_guest_stay_portal">
      
      {/* 1. GUEST SUMMARY PORTAL HEADER BLOCK */}
      <div className="bg-white border border-[#D4AF37]/25 rounded-3xl p-6 shadow-md" id="portal_guest_header">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-[#003366] text-[#F9D976] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Resident Account Certified
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase flex items-center gap-1 ${
                getGuestStatusLabel() === 'Active'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : getGuestStatusLabel() === 'Verified'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : getGuestStatusLabel() === 'Pending'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-50 text-slate-800 border-slate-300'
              }`}>
                ● Status: {getGuestStatusLabel()}
              </span>
            </div>
            
            <h3 className="text-xl font-extrabold text-[#003366] font-heading tracking-tight leading-none">
              Welcome, {guestName}
            </h3>
            
            <p className="text-xs text-slate-500 font-mono">
              Guest ID: <strong className="text-slate-800">{guestIdStr}</strong> • Registered Email: <strong className="text-slate-800">{guestEmail}</strong>
            </p>
          </div>

          {/* Quick Active Indicators and Settings */}
          <div className="flex flex-wrap gap-4 items-center">
            
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${activeStays.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <div className="text-left leading-none">
                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Stay status</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5">
                  {activeStays.length > 0 
                    ? `Checked-In (Room${activeStays.length > 1 ? 's' : ''}: ${activeStays.map(s => s.room_number).join(', ')})` 
                    : 'No Active Stay'}
                </span>
              </div>
            </div>

            {/* Notification bell and inbox count */}
            <div className="relative">
              <button 
                onClick={() => { playSound('tap'); setShowNotifications(!showNotifications); }}
                className="h-10 w-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full flex items-center justify-center border transition-all relative cursor-pointer"
                id="btn_bell_alerts"
              >
                <Bell className="h-4 w-4" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-extrabold text-[9px] h-5 w-5 rounded-full flex items-center justify-center animate-bounce border-2 border-white">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {/* Notification dropdown dialog */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-50 p-4 space-y-4 animate-fade-in text-[11px]" id="alert_box_inbox">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h5 className="font-extrabold text-slate-900 font-heading uppercase tracking-wide">Stay Alerts Inbox</h5>
                    <button 
                      onClick={markAllNotificationsRead} 
                      className="text-[#003366] hover:underline hover:opacity-80 font-bold uppercase text-[9px]"
                    >
                      Clear Badge
                    </button>
                  </div>

                  <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
                    {notifications.map(n => (
                      <div key={n.id} className={`p-2.5 rounded-lg border ${n.read ? 'bg-slate-50 border-slate-150 notification-card-reads' : 'bg-amber-50/50 border-amber-200 notification-card-unreads'}`}>
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-slate-800 font-sans notification-title">{n.title}</span>
                          <span className="text-[8px] text-slate-400 font-mono">{n.timestamp}</span>
                        </div>
                        <p className="text-slate-600 mt-1 leading-normal leading-relaxed text-[10px] notification-desc">{n.message}</p>
                      </div>
                    ))}
                  </div>
                  
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="w-full bg-slate-900 text-white font-bold py-1 px-2 rounded hover:bg-slate-800 uppercase text-[9px]"
                  >
                    Close Panel
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* 2. TAB CONTROLLER ROW */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 border-b border-slate-200 scrollbar-none" id="dashboard_tab_navigator">
        {[
          { key: 'active-stay', label: '🛎️ Active Stay', id: 'tab_active_stay' },
          { key: 'history', label: '💼 Stay History', id: 'tab_stay_history' },
          { key: 'receipts', label: '🧾 Checkout Receipts', id: 'tab_checkout_receipts' },
          { key: 'dining', label: '🍲 Room Dining menu', id: 'tab_room_dining' },
          { key: 'issues', label: '⚠️ Issue reporting', id: 'tab_issue_reporting' }
        ].map(tb => (
          <button
            key={tb.key} id={tb.id}
            onClick={() => { playSound('tap'); setActiveTab(tb.key as any); }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex-shrink-0 flex items-center gap-1.5 ${
              activeTab === tb.key 
                ? 'bg-[#003366] text-[#F9D976] shadow-sm border border-[#D4AF37]/45' 
                : 'bg-white hover:bg-slate-100 text-slate-600 border'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* 3. DYNAMIC VIEWS CONTAINER */}
      <div className="min-h-[400px]">
        {isLoadingStays && activeStays.length === 0 && stayHistory.length === 0 ? (
          <div className="py-6 space-y-6 animate-pulse" id="guest_dashboard_skeleton">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-48 bg-slate-200 rounded-3xl"></div>
                <div className="h-32 bg-slate-200 rounded-2xl"></div>
              </div>
              <div className="space-y-4">
                <div className="h-40 bg-slate-200 rounded-2xl"></div>
                <div className="h-40 bg-slate-200 rounded-2xl"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in" id="dashboard_sub_view_panel">
            
            {/* TAB A: ACTIVE STAY INFORMATION */}
            {activeTab === 'active-stay' && (
              <div className="space-y-6" id="panel_active_stay_view">
                {activeStays.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Active stay details card list */}
                    <div className="lg:col-span-2 space-y-6">
                      {activeStays.map(stay => {
                        const isSelected = stay.booking_id === selectedActiveStayId;
                        return (
                          <div 
                            key={stay.booking_id}
                            onClick={() => { playSound('tap'); setSelectedActiveStayId(stay.booking_id); }}
                            className={`bg-gradient-to-br from-white to-slate-50 border rounded-3xl p-6 shadow space-y-6 transition-all cursor-pointer ${
                              isSelected ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/20 shadow-lg' : 'border-slate-200 hover:border-slate-350'
                            }`}
                          >
                            <div className="flex justify-between items-start border-b pb-4">
                              <div>
                                <span className="text-[9px] uppercase font-bold text-[#003366] tracking-wider block">Currently Checked-In</span>
                                <h4 className="text-lg font-extrabold text-[#003366] font-heading mt-1">
                                  {stay.room_type} — Room {stay.room_number}
                                </h4>
                              </div>
                              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                                isSelected ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}>
                                {isSelected ? '★ Focused Room' : '● Checked-In'}
                              </span>
                            </div>

                            {/* Specs listing */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-xs text-slate-600 leading-normal">
                              <div>
                                <span className="font-extrabold text-[9px] uppercase text-slate-400 block tracking-wider">Guest Name</span>
                                <span className="text-slate-800 font-bold mt-1 inline-block">{guestName}</span>
                              </div>
                              <div>
                                <span className="font-extrabold text-[9px] uppercase text-slate-400 block tracking-wider">Guest ID</span>
                                <span className="text-slate-800 font-mono font-bold mt-1 inline-block">{guestIdStr} (ID: {stay.guest_id})</span>
                              </div>
                              <div>
                                <span className="font-extrabold text-[9px] uppercase text-slate-400 block tracking-wider">Booking ID</span>
                                <span className="font-mono text-slate-800 font-bold mt-1 inline-block">BK-{stay.booking_id}</span>
                              </div>
                              <div>
                                <span className="font-extrabold text-[9px] uppercase text-slate-400 block tracking-wider">Check-In Date</span>
                                <span className="text-slate-800 font-semibold mt-1 inline-block">{stay.check_in_date}</span>
                              </div>
                              <div>
                                <span className="font-extrabold text-[9px] uppercase text-slate-400 block tracking-wider">Check-Out Date</span>
                                <span className="text-slate-800 font-semibold mt-1 inline-block">{stay.check_out_date}</span>
                              </div>
                              <div>
                                <span className="font-extrabold text-[9px] uppercase text-slate-400 block tracking-wider">Stay Status</span>
                                <span className="text-emerald-700 font-bold mt-1 inline-block">Active</span>
                              </div>
                              <div>
                                <span className="font-extrabold text-[9px] uppercase text-slate-400 block tracking-wider">Channel Code</span>
                                <span className="text-slate-800 font-semibold mt-1 inline-block">{stay.booking_source}</span>
                              </div>
                              <div>
                                <span className="font-extrabold text-[9px] uppercase text-slate-400 block tracking-wider">Assigned Staff</span>
                                <span className="text-slate-800 font-semibold mt-1 inline-block">{stay.assigned_staff || 'Front Desk'}</span>
                              </div>
                            </div>

                            {/* Request AI Summary with WhatsApp */}
                            <div className="border-t dark:border-slate-850 pt-4 flex justify-between items-center">
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                                {isSelected ? 'This room is currently selected for kitchen ordering and complaints.' : 'Click to select this room for service requests.'}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedActiveStayId(stay.booking_id);
                                  fetchAiSummary(stay);
                                }}
                                disabled={isLoadingAi}
                                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                {isLoadingAi && selectedActiveStayId === stay.booking_id ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Synthesizing...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-3.5 w-3.5 text-[#F9D976]" />
                                    AI Summary
                                  </>
                                )}
                              </button>
                            </div>

                          </div>
                        );
                      })}

                      {/* Prompt action guidance */}
                      <div className="bg-[#003366]/5 p-4 rounded-2xl border border-[#003366]/10 text-xs text-slate-600 leading-relaxed flex gap-3" id="notice_self_service">
                        <Info className="h-5 w-5 text-[#003366] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[#003366] block font-heading uppercase text-[10px]">Self-Service Notice</strong>
                          <span>You have {activeStays.length} active stays. Click on any room card to target that room for dining order placements and lodging complaints.</span>
                        </div>
                      </div>

                    </div>

                    {/* AI Generated outputs panel */}
                    <div className="bg-white dark:bg-slate-900/60 p-5 border border-slate-200 dark:border-slate-800 rounded-3xl shadow text-slate-900 dark:text-slate-100">
                      <h5 className="font-bold text-[#003366] dark:text-[#F9D976] text-sm uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                        <Sparkles className="h-4.5 w-4.5 text-[#F9D976] fill-[#F9D976]/30" />
                        <span>Sai AI Booking Assistant</span>
                      </h5>
                      
                      {aiSummary ? (
                        <div className="mt-4 space-y-4 animate-fade-in text-xs">
                          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line text-[11px]" id="ai_booking_summary_text">
                            {aiSummary.summary}
                          </div>

                          <div className="bg-emerald-950 text-emerald-100 p-3.5 rounded-xl space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] bg-emerald-800 text-white font-mono font-bold px-1.5 py-0.5 rounded">
                                WHATSAPP TEMPLATE
                              </span>
                              <span className="text-[9px] text-emerald-300">Auto Sent</span>
                            </div>
                            <div className="bg-emerald-900/40 p-2.5 rounded border border-emerald-800 font-mono text-[10px] whitespace-pre-wrap leading-relaxed" id="whatsapp_preview_text">
                              {aiSummary.whatsapp_template}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-60 mt-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500 space-y-2">
                          <Sparkles className="h-8 w-8 text-slate-350 dark:text-slate-600 animate-pulse" />
                          <p className="text-xs">Click "AI Summary" on active stay card to generate a confirmation with WhatsApp notification.</p>
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-12 text-center border space-y-3" id="blank_active_stay">
                    <Info className="h-10 w-10 text-amber-500 mx-auto" />
                    <h4 className="font-bold text-slate-800">No Currently Checked-In Stays Found</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      According to Sri Nirvana central relational index logs, your email is not currently marked as checked-in to any room. Checked-out stays and receipts are available inside the other tabs.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB B: STAY HISTORY MODULE */}
            {activeTab === 'history' && (
              <div className="container bg-white border border-slate-200 rounded-3xl p-6 shadow space-y-6" id="panel_stay_history_view">
                
                {/* Stay History Search Tool bar and Sorting */}
                <div className="flex flex-col md:flex-row gap-4 items-stretch justify-between pb-4 border-b border-slate-100">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Search className="h-4 w-4" />
                    </span>
                    <input 
                      type="text"
                      placeholder="Search stay history by room number or category index..."
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 text-xs border rounded-xl focus:outline-none focus:border-[#003366] focus:bg-white transition-colors"
                      id="inp_search_stays"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400">From Date</span>
                      <input 
                        type="date"
                        value={startDateStr} onChange={(e) => setStartDateStr(e.target.value)}
                        className="py-1.5 px-2 bg-slate-50 rounded border text-xs text-slate-600 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400">To Date</span>
                      <input 
                        type="date"
                        value={endDateStr} onChange={(e) => setEndDateStr(e.target.value)}
                        className="py-1.5 px-2 bg-slate-50 rounded border text-xs text-slate-600 focus:outline-none"
                      />
                    </div>
                    {(startDateStr || endDateStr || searchQuery) && (
                      <button 
                        onClick={() => { setSearchQuery(''); setStartDateStr(''); setEndDateStr(''); }}
                        className="text-xs text-rose-600 hover:underline font-bold"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Stays History List */}
                {filteredStays.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <AlertCircle className="h-10 w-10 text-slate-300 mx-auto" />
                    <h5 className="font-bold text-slate-700">No Previous Stay History Available</h5>
                    <p className="text-xs">There are no checked-out bookings matching your query coordinates.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStays.map(booking => {
                      const pm = payments.find(p => p.booking_id === booking.booking_id);
                      return (
                        <div key={booking.booking_id} className="p-5 bg-slate-50/60 border rounded-2xl flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded font-mono">
                                ID: BK-{booking.booking_id}
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                booking.booking_status === 'Checked-Out' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {booking.booking_status}
                              </span>
                            </div>

                            <h5 className="font-extrabold text-slate-900 text-sm font-heading mt-2">
                              {booking.room_type} — Room {booking.room_number || 'N/A'}
                            </h5>

                            <div className="space-y-1.5 mt-3 text-xs text-slate-500">
                              <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {booking.check_in_date} to {booking.check_out_date}</p>
                              {pm && <p className="flex items-center gap-1.5 text-slate-700 font-medium">💵 Transaction Paid: <strong className="text-[#003366]">₹{pm.amount.toLocaleString('en-IN')}</strong></p>}
                            </div>
                          </div>

                          <div className="pt-3 border-t flex gap-2">
                            <button
                              onClick={() => { playSound('tap'); setSelectedInvoiceBooking(booking); }}
                              className="flex-1 bg-[#003366] hover:bg-[#001f3f] text-[#F9D976] py-1.5 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
                            >
                              View Receipt
                            </button>
                            <button
                              onClick={() => downloadInvoicePdf(booking, pm)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-800 p-1.5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer"
                              title="Download PDF Receipt"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            )}

            {/* TAB C: CHECKOUT RECEIPTS MODULE */}
            {activeTab === 'receipts' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow space-y-6 animate-fade-in" id="panel_receipts_view">
                <div className="border-b pb-4">
                  <h4 className="text-base font-bold text-[#003366] font-heading uppercase">Checkout Receipts & GST Slabs</h4>
                  <p className="text-xs text-slate-500 mt-1">Select an active stay or previous checkout logs to print GST itemized invoices in local formats.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Select stays for Receipt list */}
                  <div className="lg:col-span-1 space-y-4">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Completed & Active folios</span>
                    
                    {bookings.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No bookings recorded under this account email.</p>
                    ) : (
                      <div className="space-y-3">
                        {bookings.map(b => {
                          const isSel = selectedInvoiceBooking?.booking_id === b.booking_id;
                          return (
                            <button
                              key={b.booking_id}
                              onClick={() => { playSound('tap'); setSelectedInvoiceBooking(b); }}
                              className={`w-full p-3.5 rounded-2xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                                isSel ? 'border-[#003366] bg-[#003366]/5 shadow-sm' : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="text-[9px] font-mono text-slate-400 font-bold">BK-{b.booking_id}</span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${
                                  b.booking_status === 'Checked-In' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {b.booking_status}
                                </span>
                              </div>
                              <h5 className="font-bold text-slate-800 text-xs mt-1.5">{b.room_type} — Room {b.room_number || 'N/A'}</h5>
                              <p className="text-[10px] text-slate-500 mt-1 font-mono">{b.check_in_date} to {b.check_out_date}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Receipt display screen */}
                  <div className="lg:col-span-2">
                    {selectedInvoiceBooking ? (
                      <div className="border border-slate-200 rounded-3xl p-6 bg-slate-50/30 space-y-6" id="invoice_content_card">
                        
                        {/* Printable invoice layout standard */}
                        <div className="bg-white border rounded-2xl p-6 shadow-sm font-mono text-xs text-slate-700 space-y-5" id="printable_invoice_area">
                          <div className="text-center pb-4 border-b border-dashed border-slate-300 space-y-1">
                            <h5 className="font-extrabold text-base text-[#003366] uppercase tracking-wide">Sai Nirvana Plaza Hotel</h5>
                            <p className="text-[9.5px] text-slate-400">Sector 22, Dwarka, New Delhi - 110077 | Tel: +91 11-4560-6000</p>
                            <p className="text-[9.5px] text-slate-400 uppercase font-black tracking-widest mt-1 text-slate-900 border border-slate-900/10 inline-block px-3 py-0.5">
                              GSTIN: 07AAAAS3289R1ZX (Tax Invoice)
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-[10px] font-sans">
                            <div className="space-y-1">
                              <p className="text-[#003366] font-bold">CLIENT INFORMATION</p>
                              <p className="text-slate-800 font-medium">Name: {guestName}</p>
                              <p className="text-slate-500">Email: {guestEmail}</p>
                              <p className="text-slate-500">Guest ID: {guestIdStr}</p>
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-[#003366] font-bold">INVOICE SPECIFICATION</p>
                              <p className="text-slate-800 font-medium">Invoice No: INV-2026-{String(selectedInvoiceBooking.booking_id).padStart(3, '0')}</p>
                              <p className="text-slate-500">Date: {new Date().toLocaleDateString('en-IN')}</p>
                              <p className="text-slate-500">Method: {payments.find(p => p.booking_id === selectedInvoiceBooking.booking_id)?.payment_method || 'UPI'}</p>
                            </div>
                          </div>

                          {/* Stays duration information */}
                          <div className="p-3 bg-[#003366]/5 rounded-xl text-[10px] font-sans text-[#003366] flex justify-between">
                            <span>Room Category: <strong>{selectedInvoiceBooking.room_type} (Room {selectedInvoiceBooking.room_number})</strong></span>
                            <span>Stay: <strong>{selectedInvoiceBooking.check_in_date}</strong> to <strong>{selectedInvoiceBooking.check_out_date}</strong></span>
                          </div>

                          {/* Billing Calculations */}
                          <table className="w-full text-left border-t border-b border-slate-200 py-2">
                            <thead>
                              <tr className="text-[9.5px] text-slate-400 font-extrabold uppercase border-b pb-1">
                                <th className="py-1">Description Reference</th>
                                <th className="text-right py-1">Amount Rate (INR)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const pm = payments.find(p => p.booking_id === selectedInvoiceBooking.booking_id);
                                const amountWithGst = pm ? pm.amount : selectedInvoiceBooking.price_per_night * 4;
                                const gstVal = pm ? pm.gst_amount : Math.round(selectedInvoiceBooking.price_per_night * 0.18 * 4);
                                const baseRate = amountWithGst - gstVal;
                                return (
                                  <>
                                    <tr className="text-slate-700">
                                      <td className="py-2 font-sans font-medium">Tariff Lodging Fee (Base Stay)</td>
                                      <td className="text-right py-2 font-mono">₹{baseRate.toLocaleString('en-IN')}.00</td>
                                    </tr>
                                    <tr className="text-slate-500 border-t border-dashed">
                                      <td className="py-1 font-sans">Central GST CGST (9.0%)</td>
                                      <td className="text-right py-1 font-mono">₹{(gstVal/2).toLocaleString('en-IN')}.00</td>
                                    </tr>
                                    <tr className="text-slate-500">
                                      <td className="py-1 font-sans">State GST SGST (9.0%)</td>
                                      <td className="text-right py-1 font-mono">₹{(gstVal/2).toLocaleString('en-IN')}.00</td>
                                    </tr>
                                    <tr className="border-t-2 border-double border-slate-300 font-extrabold text-slate-900 bg-slate-50 p-2 text-xs">
                                      <td className="py-2.5 font-sans pl-1">Folio Grand Total GST-Itemized</td>
                                      <td className="text-right py-2.5 font-mono pr-1">₹{amountWithGst.toLocaleString('en-IN')}.00</td>
                                    </tr>
                                  </>
                                );
                              })()}
                            </tbody>
                          </table>

                          <div className="text-center text-[9.5px] italic text-slate-400 pt-2 font-sans">
                            Payments are fully processed under RBI / GST tax acts inside Dwarka Circle.
                          </div>

                        </div>

                        {/* Interactive triggers */}
                        <div className="flex gap-4">
                          <button
                            onClick={triggerWindowPrint}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 flex-1 cursor-pointer"
                          >
                            <Printer className="h-4 w-4" />
                            <span>Print Receipt</span>
                          </button>
                          
                          <button
                            onClick={() => downloadInvoicePdf(selectedInvoiceBooking, payments.find(p => p.booking_id === selectedInvoiceBooking.booking_id))}
                            className="bg-[#003366] hover:bg-[#001f3f] text-[#F9D976] font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 flex-1 cursor-pointer"
                          >
                            <Download className="h-4 w-4 text-[#F9D976]" />
                            <span>Download PDF</span>
                          </button>
                        </div>

                      </div>
                    ) : (
                      <div className="border border-dashed p-12 text-center rounded-3xl text-slate-400 space-y-2">
                        <Receipt className="h-8 w-8 mx-auto animate-pulse text-slate-300" />
                        <p className="text-sm font-semibold text-rose-500">Receipt data not available.</p>
                        <p className="text-xs">Select any completed stay folio on the left to review its GST itemized invoice breakdown and download the signed tax copy.</p>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* TAB D: ROOM DINING SERVICE MODULE */}
            {activeTab === 'dining' && (
              <div className="space-y-6" id="panel_room_service_view">
                
                {activeStay ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Dining catalog display */}
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow space-y-5">
                      
                      <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-3">
                        <div>
                          <h4 className="text-base font-extrabold text-[#003366] font-heading uppercase">Room service Culinary menu</h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[11px] text-slate-500">Delivering to:</span>
                            <select
                              value={selectedActiveStayId || ''}
                              onChange={(e) => {
                                playSound('tap');
                                setSelectedActiveStayId(Number(e.target.value));
                              }}
                              className="text-xs p-1 bg-slate-50 border rounded-lg focus:outline-none font-bold text-[#003366]"
                            >
                              {activeStays.map(stay => (
                                <option key={stay.booking_id} value={stay.booking_id}>
                                  Room {stay.room_number} ({stay.room_type})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        {/* Food Category navigation buttons */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl scrollbar-none max-w-full overflow-x-auto text-[10px]">
                          {['All', 'Breakfast', 'Main Meals', 'Snacks', 'Beverages'].map(cat => (
                            <button
                              key={cat}
                              onClick={() => { playSound('tap'); setDiningCategory(cat as any); }}
                              className={`px-3 py-1.5 rounded-lg font-bold uppercase ${
                                diningCategory === cat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Food Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredDiningMenu.map(food => (
                          <div key={food.id} className="p-4 bg-slate-50 hover:bg-slate-50/80 border rounded-2xl flex flex-col justify-between space-y-3 transition-colors">
                            <div className="space-y-1">
                              <div className="flex justify-between items-start">
                                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  {food.category}
                                </span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {food.deliveryTime}m
                                </span>
                              </div>
                              <h5 className="font-extrabold text-slate-900 text-xs font-sans mt-1.5">{food.name}</h5>
                              <p className="text-[10.5px] text-slate-500 leading-normal line-clamp-2 leading-relaxed">{food.description}</p>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                              <span className="text-sm font-black text-[#003366] font-mono">₹{food.price}</span>
                              <button
                                onClick={() => handleAddToCart(food)}
                                className="bg-[#003366] hover:bg-[#001f3f] text-white text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add to Cart</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>

                    {/* Shopping Cart Summary and placed orders */}
                    <div className="space-y-6">
                      
                      {/* Active Basket Card */}
                      <div className="bg-white p-5 border border-slate-200 rounded-3xl shadow flex flex-col justify-between h-fit space-y-4">
                        
                        <div className="border-b pb-2 flex justify-between items-center">
                          <h5 className="font-extrabold text-[#003366] text-sm uppercase tracking-wider flex items-center gap-1.5">
                            <ShoppingBag className="h-4.5 w-4.5 text-orange-600" />
                            <span>Room Folio Cart</span>
                          </h5>
                          <span className="text-[10px] bg-slate-100 font-bold px-2 py-0.5 rounded text-slate-600 font-mono">
                            {cart.reduce((s, i) => s + i.quantity, 0)} Items
                          </span>
                        </div>

                        {orderFeedback && (
                          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] p-2.5 rounded-xl">
                            {orderFeedback}
                          </div>
                        )}

                        {cart.length === 0 ? (
                          <div className="h-32 flex flex-col items-center justify-center p-4 text-center text-slate-400 text-xs">
                            <ShoppingBag className="h-8 w-8 text-slate-200 animate-pulse mb-1" />
                            <p>Dining cart is empty. Select culinary offerings on the left catalog!</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            
                            {/* Inner Cart Rows */}
                            <div className="space-y-3.5 max-h-52 overflow-y-auto pr-1">
                              {cart.map(item => (
                                <div key={item.item.id} className="flex justify-between items-center text-xs">
                                  <div className="space-y-0.5 max-w-[60%]">
                                    <strong className="text-slate-850 truncate block font-semibold">{item.item.name}</strong>
                                    <span className="text-slate-400 font-mono text-[10px]">₹{item.item.price} x {item.quantity}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 border rounded-lg bg-slate-50 p-0.5">
                                    <button 
                                      onClick={() => handleUpdateCartQty(item.item.id, false)}
                                      className="h-5 w-5 rounded bg-white font-bold flex items-center justify-center text-slate-500 hover:text-slate-800 border cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold text-slate-800 w-4 text-center font-mono">{item.quantity}</span>
                                    <button 
                                      onClick={() => handleUpdateCartQty(item.item.id, true)}
                                      className="h-5 w-5 rounded bg-white font-bold flex items-center justify-center text-slate-500 hover:text-slate-800 border cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Cart Summary itemization */}
                            <div className="bg-slate-50 p-3 rounded-2xl text-[11px] text-slate-500 space-y-1">
                              <div className="flex justify-between">
                                <span>Cart Subtotal</span>
                                <span className="font-mono text-slate-700">₹{cartSubtotal.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Restaurant GST (18%)</span>
                                <span className="font-mono text-slate-700">₹{cartGst.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between font-bold text-slate-900 border-t pt-1.5 mt-1">
                                <span className="text-slate-800">Total Charged Folio</span>
                                <span className="font-sans font-mono text-[#003366] text-sm">₹{cartTotal.toLocaleString('en-IN')}</span>
                              </div>
                            </div>

                            <button
                              onClick={handlePlaceDiningOrder}
                              disabled={isPlacingOrder}
                              className="w-full bg-[#003366] hover:bg-[#001f3f] text-[#F9D976] py-2.5 rounded-xl font-bold uppercase transition-colors tracking-wide text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                              id="btn_submit_room_service"
                            >
                              {isPlacingOrder ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Routing order coordinates...</span>
                                </>
                              ) : (
                                <>
                                  <Coffee className="h-4 w-4" />
                                  <span>Place Dining Order</span>
                                </>
                              )}
                            </button>

                          </div>
                        )}

                      </div>

                      {/* Display active ordered items with stepper progress */}
                      {placedOrders.length > 0 && (
                        <div className="bg-white p-5 border border-slate-200 rounded-3xl shadow space-y-4">
                          <h6 className="font-bold text-slate-950 text-xs uppercase tracking-wider border-b pb-2">
                            🍲 Active Dining Trackers
                          </h6>

                          <div className="space-y-4 max-h-60 overflow-y-auto">
                            {placedOrders.map((ord) => (
                              <div key={ord.request_id} className="p-3 bg-slate-50 border rounded-xl space-y-2 text-[10px]">
                                <div className="flex justify-between items-center">
                                  <span className="font-mono font-bold text-[#003366]">
                                    ORD#{ord.request_id} {ord.room_number ? `(Room ${ord.room_number})` : ''}
                                  </span>
                                  <span className="text-slate-400 font-sans">{new Date(ord.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-slate-600 font-semibold line-clamp-2 leading-relaxed">{ord.request_type}</p>
                                
                                {/* Live Visual Status Stepper */}
                                <div className="pt-2">
                                  <div className="flex items-center justify-between font-bold text-[8.5px] uppercase tracking-wide px-1">
                                    <span className={ord.request_status === 'Pending' ? 'text-amber-600' : 'text-slate-400'}>Pending</span>
                                    <span className={ord.request_status === 'In Progress' ? 'text-indigo-600' : 'text-slate-400'}>Preparing</span>
                                    <span className={ord.request_status === 'Delivered' ? 'text-emerald-600' : 'text-slate-400'}>Delivered</span>
                                  </div>
                                  <div className="h-1 bg-slate-250 w-full rounded mt-1 overflow-hidden relative">
                                    <div className={`h-full absolute left-0 transition-all duration-1000 ${
                                      ord.request_status === 'Pending' ? 'bg-amber-505 bg-amber-500 w-[30%]' : 
                                      ord.request_status === 'In Progress' ? 'bg-indigo-500 w-[65%]' : 
                                      ord.request_status === 'Delivered' ? 'bg-emerald-500 w-full' : 'bg-slate-300 w-full'
                                    }`} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>

                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-12 text-center border space-y-3">
                    <Info className="h-10 w-10 text-amber-500 mx-auto" />
                    <h4 className="font-bold text-slate-800">Active Stay Booking Required</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Only activechecked-in guests with validated room assignments can place online dining orders. Please sign in via an operational session.
                    </p>
                  </div>
                )}

              </div>
            )}

            {/* TAB E: COMPLAINT FILING & ISSUES DESK */}
            {activeTab === 'issues' && (
              <div className="space-y-6" id="panel_issues_view">
                
                {activeStay ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Raise complaint fields */}
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow space-y-5">
                      
                      <div className="border-b pb-3">
                        <h4 className="text-base font-extrabold text-[#003366] font-heading uppercase">Lodge Guest Concern / Room Complaint</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-slate-500">Lodge concern for:</span>
                          <select
                            value={selectedActiveStayId || ''}
                            onChange={(e) => {
                              playSound('tap');
                              setSelectedActiveStayId(Number(e.target.value));
                            }}
                            className="text-xs p-1 bg-slate-50 border rounded-lg focus:outline-none font-bold text-[#003366]"
                          >
                            {activeStays.map(stay => (
                              <option key={stay.booking_id} value={stay.booking_id}>
                                Room {stay.room_number} ({stay.room_type})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {issueSuccess && (
                        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs p-3 rounded-xl">
                          Your concern has been submitted successfully to our central supervisor desk for prompt dispatch.
                        </div>
                      )}

                      <form onSubmit={handleLodgeComplaint} className="space-y-4">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Issue Category Segment</label>
                            <select
                              value={issueCategory} onChange={(e) => setIssueCategory(e.target.value as any)}
                              className="w-full text-xs p-3 bg-slate-50 border rounded-xl focus:outline-none"
                            >
                              <option value="Room Cleaning / Guest Services">Room Cleaning / Guest Services</option>
                              <option value="Air Conditioning Problem">Air Conditioning Problem</option>
                              <option value="Wi-Fi Internet Disconnections">Wi-Fi Internet Disconnections</option>
                              <option value="Television / DTH Issue">Television / DTH Issue</option>
                              <option value="Plumbing / Water Leakage">Plumbing / Water Leakage</option>
                              <option value="Environmental Noise Complaint">Environmental Noise Complaint</option>
                              <option value="Room Service Delay">Room Service Delay</option>
                              <option value="Other Specific Concerns">Other Specific Concerns</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Guest Graded Urgency</label>
                            <div className="flex gap-2">
                              {['Low', 'Medium', 'High', 'Critical'].map(prio => (
                                <button
                                  key={prio} type="button"
                                  onClick={() => { playSound('tap'); setIssuePriority(prio as any); }}
                                  className={`flex-1 py-2 text-center rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border ${
                                    issuePriority === prio 
                                      ? 'bg-rose-50 text-rose-800 border-rose-400' 
                                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200'
                                  }`}
                                >
                                  {prio}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Issue Headline / title</label>
                          <input 
                            type="text" required
                            placeholder="e.g. Toilet sensor flush leaking or AC fan rattling sound"
                            value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)}
                            className="w-full text-xs p-3 bg-slate-50 border rounded-xl focus:outline-none focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Elaborate and Describe Issue (AI priority analysis applies)</label>
                          <textarea 
                            rows={3} required
                            placeholder="Please provide explicit details. E.g. The AC fan in Room 203 makes a sharp rattling noise when set to High. Water pressure is standard otherwise..."
                            value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)}
                            className="w-full text-xs p-3 bg-slate-50 border rounded-xl focus:outline-none focus:bg-white"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingIssue}
                          className="w-full bg-[#003366] hover:bg-[#001f3f] text-[#F9D976] hover:opacity-90 font-bold py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          {isSubmittingIssue ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                              <span>AI dispatching ticket segment...</span>
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              <span>File Concern tickets</span>
                            </>
                          )}
                        </button>

                      </form>

                      {/* Display live priority classification analysis */}
                      {aiAnalysis && (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-2 animate-fade-in text-[11px] text-slate-700">
                          <span className="font-extrabold text-amber-800 flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Gemini AI Categorizer Verdict
                          </span>
                          <div className="flex gap-4">
                            <div>
                              <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Assigned Priority</span>
                              <strong className="text-rose-700 font-bold text-xs">{aiAnalysis.priority}</strong>
                            </div>
                            <div className="flex-1">
                              <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">AI Reasoning and Dispatch</span>
                              <p className="mt-0.5 leading-normal leading-relaxed text-slate-600">{aiAnalysis.reasoning}</p>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Active reported grievances status logs */}
                    <div className="bg-white p-5 border border-slate-200 rounded-3xl shadow space-y-4">
                      
                      <div className="border-b pb-2">
                        <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                          📋 Filed Issues & Status
                        </h5>
                      </div>

                      {issues.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 text-xs space-y-2" id="blank_issues">
                          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto animate-pulse" />
                          <h6 className="font-bold text-slate-700">No Open Issues</h6>
                          <p>Your room folio experiences perfect operational standards!</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                          {issues.map(com => {
                            const isResolved = com.complaint_status === 'Resolved';
                            return (
                              <div key={com.complaint_id} className="p-3 bg-slate-50 border rounded-2xl text-[10px] space-y-2">
                                <div className="flex justify-between items-center bg-slate-200/50 -mx-3 -mt-3 px-3 py-1.5 rounded-t-2xl font-mono">
                                  <span className="text-[#003366] font-bold">
                                    TKT-{com.complaint_id} {com.room_number ? `(Room ${com.room_number})` : ''}
                                  </span>
                                  <span className={`font-bold px-1.5 py-0.2 rounded uppercase text-[8px] ${
                                    isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {com.complaint_status}
                                  </span>
                                </div>
                                
                                <p className="text-slate-800 font-semibold line-clamp-2 mt-2 leading-relaxed">{com.complaint_description}</p>
                                
                                <div className="flex justify-between items-center border-t pt-2 mt-1 font-sans">
                                  <span>Priority: <strong className="text-rose-700">{com.priority_level}</strong></span>
                                  <span className="text-slate-400">{new Date(com.created_at).toLocaleDateString('en-IN')}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>

                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-12 text-center border space-y-3">
                    <Info className="h-10 w-10 text-amber-500 mx-auto" />
                    <h4 className="font-bold text-slate-800">Verified Access Denied</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Grievance desk reports must correspond to verified ongoing Checked-In rooms. Sign in to post maintenance orders.
                    </p>
                  </div>
                )}

              </div>
            )}

          </div>
        )}
      </div>

      {/* 4. SEPARATED FEEDBACK SUBMISSION BANNER FOOTER */}
      <div className="bg-white border rounded-3xl p-6 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6" id="stay_feedback_quick_banner">
        <div className="space-y-2 lg:col-span-1">
          <h5 className="font-extrabold text-[#003366] text-sm uppercase font-heading">Feedback & Luxury Reviews</h5>
          <p className="text-[11px] text-slate-500 leading-normal leading-relaxed">Let us know how your residential experience can reach higher thresholds. Leave comments directly with our hotel manager.</p>
        </div>

        <div className="lg:col-span-2">
          {fbSuccess ? (
            <div className="h-full bg-emerald-50 text-emerald-800 p-4 border rounded-2xl flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>Grateful for your luxury review! Comments logged to DBMS indexes.</span>
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
              
              <div className="w-full sm:w-1/4 shrink-0">
                <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Rate Stay</label>
                <div className="flex gap-1 bg-slate-50 p-1.5 rounded-xl border max-w-fit">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star} type="button"
                      onClick={() => setFbRating(star)}
                      className={`h-5 w-5 rounded flex items-center justify-center text-xs font-bold leading-none select-none transition-colors ${
                        fbRating >= star ? 'text-amber-500' : 'text-slate-350 hover:text-slate-500'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 w-full">
                <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Stay Review Commentaires</label>
                <input 
                  type="text" required
                  placeholder="Share details on service efficiency..."
                  value={fbComment} onChange={(e) => setFbComment(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingFb}
                className="bg-[#003366] hover:bg-[#001f3f] text-[#F9D976] font-bold px-4 py-2.5 rounded-xl text-xs uppercase transition-colors shrink-0 cursor-pointer"
              >
                {isSubmittingFb ? 'Saving Review...' : 'Submit Review'}
              </button>

            </form>
          )}
        </div>
      </div>

    </div>
  );
}
