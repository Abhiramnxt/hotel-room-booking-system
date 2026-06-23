import { jsPDF } from 'jspdf';

export interface PDFReportData {
  reportId?: string;
  title: string;
  description: string;
  headers: string[];
  rows: any[][];
  summaryKey?: string;
  summaryValue?: string;
  meta?: Record<string, string>;
}

/**
 * Generates an official, publication-ready PDF document for Sai Nirvana Plaza.
 * Format: A4 Portrait, Elegant branding, Gold highlights, Professional Grid & Footer.
 */
export function generatePdfReport(
  type: string,
  state: any,
  options?: {
    customBooking?: any;
    customPayment?: any;
    generatedBy?: string;
  }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const generatedBy = options?.generatedBy || "Sai Nirvana Plaza Management System";
  const now = new Date();
  const generatedDate = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' });
  const generatedTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', timeStyle: 'short' });
  const reportRef = `SNP-RPT-${Math.floor(100000 + Math.random() * 900000)}`;

  // Core dimensions
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const usableWidth = pageWidth - (margin * 2);

  // Styling helper: set colors
  const setPrimaryColor = () => doc.setTextColor(0, 31, 63); // Navy #001f3f
  const setAccentColor = () => doc.setTextColor(212, 175, 55); // Gold #D4AF37
  const setTextColor = () => doc.setTextColor(51, 65, 85); // Slate
  const setLightColor = () => doc.setTextColor(100, 116, 139); // Light slate

  // 1. DRAW PAGE BORDER & LUXURY BRAND LINES
  doc.setDrawColor(212, 175, 55); // Gold
  doc.setLineWidth(0.5);
  doc.rect(margin - 4, margin - 4, usableWidth + 8, pageHeight - (margin * 2) + 8); // outer luxury framework border
  doc.setDrawColor(226, 232, 240); // Standard slate dividers

  // 2. HEADER BLOCK (Branding + Document Metadata)
  // Drawn logo - Luxury gold seal filled rectangular card
  doc.setFillColor(0, 31, 63); // Navy background box
  doc.rect(margin, margin + 1, 10, 10, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 230, 150); // Cream gold letter
  doc.text('SN', margin + 3, margin + 7.5);

  // Logo titles - Incorporates ANTIGRAVITY 2.0 branding as requested
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 31, 63); // Primary Navy
  doc.text('SAI NIRVANA PLAZA', margin + 12, margin + 5.5);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(212, 175, 55); // Gold
  doc.text('POWERED BY ANTIGRAVITY 2.0', margin + 12, margin + 9);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text('Sector 22, Dwarka, New Delhi 110077, India | compliance@sai-nirvana.com', margin + 12, margin + 12.5);

  // Right metadata header side
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 33, 102);
  doc.text('OFFICIAL RECORD DOC', pageWidth - margin - 42, margin + 4);
  
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Ref ID: ${reportRef}`, pageWidth - margin - 42, margin + 6.5);
  doc.text(`Date: ${generatedDate}`, pageWidth - margin - 42, margin + 9);
  doc.text(`Time: ${generatedTime}`, pageWidth - margin - 42, margin + 11.5);
  doc.text(`By: ${generatedBy}`, pageWidth - margin - 42, margin + 14);

  // Gold accent separator bar
  doc.setDrawColor(212, 175, 55); // Gold Line
  doc.setLineWidth(0.6);
  doc.line(margin, margin + 15.5, pageWidth - margin, margin + 15.5);

  // Helper functions to populate specific records matching database structures
  let title = "Official Operational Audit Report";
  let description = "Detailed compliance log and ledger summaries captured from the primary hotel database.";
  let headers: string[] = ["Detail", "Value"];
  let rows: any[][] = [];
  let summaryText = "";

  // Switch types
  switch (type) {
    case 'booking': {
      title = "Booking Confirmation Registry";
      description = "Official reservation records and check-in timeline audits booked at standard premium rates.";
      headers = ["Booking ID", "Guest Name", "Chamber No", "Stay Dates", "Source Channel", "Status", "Tariff Paid"];
      
      const bookList = state?.bookings || [];
      rows = bookList.map((b: any) => [
        `BK-${b.booking_id}`,
        b.guest_name || "N/A",
        b.room_number ? `Room ${b.room_number}` : 'N/A',
        `${b.check_in_date || 'N/A'} to ${b.check_out_date || 'N/A'}`,
        b.booking_source || "N/A",
        b.booking_status || "N/A",
        b.price_per_night ? `Rs. ${Number(b.price_per_night).toLocaleString('en-IN')}` : 'N/A'
      ]);
      
      if (rows.length === 0) {
        rows.push(["—", "No Records Available", "—", "—", "—", "—", "—"]);
      }
      const sumTotal = bookList.reduce((acc: number, b: any) => acc + Number(b.price_per_night || 0), 0);
      summaryText = `Stays Audited: ${bookList.length} | Total Tariff Value: Rs. ${sumTotal.toLocaleString('en-IN')}`;
      break;
    }

    case 'gst':
    case 'invoice': {
      title = "GST Tax Invoice (GSTR-2 Compliant)";
      description = "Itemized service billing receipt displaying CGST/SGST tax liabilities from actual Railway MySQL payment records.";
      headers = ["Tax Ref Hash", "Guest Client", "Room Unit", "Timeline Duration", "Nights", "Base Charges (Rs)", "GST (Rs)", "Total Fare (Rs)"];
      
      const bookList = state?.bookings || [];
      const paymentList = state?.payments || [];
      rows = bookList.map((b: any) => {
        // Find actual payment for this booking
        const matchedPayment = paymentList.find((p: any) => p.booking_id === b.booking_id);
        // Calculate real nights
        let nights = 1;
        if (b.check_in_date && b.check_out_date) {
          const cin = new Date(b.check_in_date);
          const cout = new Date(b.check_out_date);
          const diff = Math.round((cout.getTime() - cin.getTime()) / (1000 * 60 * 60 * 24));
          if (diff > 0) nights = diff;
        }
        const baseAmt = matchedPayment ? (Number(matchedPayment.amount) - Number(matchedPayment.gst_amount || 0)) : (Number(b.price_per_night || 0) * nights);
        const gstVal = matchedPayment ? Number(matchedPayment.gst_amount || 0) : Math.round(baseAmt * 0.18);
        const finalCost = baseAmt + gstVal;
        return [
          `TAX-SN-${b.booking_id}11`,
          b.guest_name || "Self Entrant",
          b.room_number ? `Room ${b.room_number}` : "N/A",
          `${b.check_in_date || 'N/A'} to ${b.check_out_date || 'N/A'}`,
          `${nights} Night${nights !== 1 ? 's' : ''}`,
          baseAmt.toLocaleString('en-IN'),
          gstVal.toLocaleString('en-IN'),
          finalCost.toLocaleString('en-IN')
        ];
      });

      if (rows.length === 0) {
        rows.push(["N/A", "No invoiced bookings found to compile tax records.", "", "", "", "", "", ""]);
      }
      
      const totalBase = rows.filter(r => r[0] !== 'N/A').reduce((acc: number, r: any) => acc + (parseFloat(String(r[5]).replace(/,/g,'')) || 0), 0);
      const totalGst = rows.filter(r => r[0] !== 'N/A').reduce((acc: number, r: any) => acc + (parseFloat(String(r[6]).replace(/,/g,'')) || 0), 0);
      const grandTotal = totalBase + totalGst;
      summaryText = `Net Base Charges: Rs. ${totalBase.toLocaleString('en-IN')} | Total GST: Rs. ${totalGst.toLocaleString('en-IN')} | Grand Total: Rs. ${grandTotal.toLocaleString('en-IN')}`;
      break;
    }

    case 'receipt':
    case 'checkout': {
      title = "Official Checkout Stay Receipt";
      description = "Discharged invoice log for fully settled reservations. Certified for corporate billing clearance.";
      headers = ["Financial Component", "Audited Stay Specifications"];
      
      const b = options?.customBooking || (state?.bookings && state.bookings[0]);
      const pay = options?.customPayment || (state?.payments && state.payments.find((p: any) => p.booking_id === b?.booking_id));
      
      if (!b) {
        rows = [["Notice", "No booking record provided for receipt generation."]];
        summaryText = "No receipt data available.";
        break;
      }

      // Calculate real nights from actual check-in/out dates
      let daysNum = 1;
      if (b.check_in_date && b.check_out_date) {
        const cin = new Date(b.check_in_date);
        const cout = new Date(b.check_out_date);
        const diff = Math.round((cout.getTime() - cin.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0) daysNum = diff;
      }

      // Use real payment amount if available, otherwise calculate
      let baseTariff: number;
      let gstAmt: number;
      let finalAmt: number;
      
      if (pay && pay.amount) {
        finalAmt = Number(pay.amount);
        gstAmt = Number(pay.gst_amount || 0);
        baseTariff = finalAmt - gstAmt;
      } else {
        baseTariff = Number(b.price_per_night || 0) * daysNum;
        gstAmt = Math.round(baseTariff * 0.18);
        finalAmt = baseTariff + gstAmt;
      }

      rows = [
        ["Invoice Number", `INV-2026-${String(b.booking_id).padStart(3, '0')}`],
        ["Guest Customer", b.guest_name || 'N/A'],
        ["Assigned Unit", `Room ${b.room_number || 'N/A'} - ${b.room_type || 'N/A'}`],
        ["Stay Period", `${b.check_in_date || 'N/A'} to ${b.check_out_date || 'N/A'} (${daysNum} Night${daysNum !== 1 ? 's' : ''})`],
        ["Base Accommodation Tariff", `Rs. ${baseTariff.toLocaleString('en-IN')}.00`],
        ["CGST (9.0%)", `Rs. ${Math.floor(gstAmt / 2).toLocaleString('en-IN')}.00`],
        ["SGST (9.0%)", `Rs. ${Math.ceil(gstAmt / 2).toLocaleString('en-IN')}.00`],
        ["Payment Method", pay?.payment_method || 'N/A'],
        ["Transaction Reference ID", pay?.transaction_reference || 'N/A'],
        ["Settlement Status", pay?.payment_status === 'Paid' ? '🟢 FULLY PAID & SETTLED' : pay?.payment_status === 'Refunded' ? '🔴 REFUNDED' : '🟡 PENDING PAYMENT']
      ];

      summaryText = `Final Discharged Amount: Rs. ${finalAmt.toLocaleString('en-IN')}.00 | Duration: ${daysNum} Night${daysNum !== 1 ? 's' : ''}`;
      break;
    }

    case 'history': {
      title = "Guest Stay History & Feedback Registry";
      description = "Aggregated records of historical reservations, real accommodation costs, feedback, and customer satisfaction index from Railway MySQL.";
      headers = ["ID", "Guest Client", "Previous Booking Unit", "Stay Dates Interval", "Nights", "Total INR Paid", "Audit Rating Feedback"];
      
      const bookList = state?.bookings || [];
      const feedbackList = state?.feedback || [];
      const paymentList = state?.payments || [];
      
      rows = bookList.map((b: any) => {
        const guestFeedback = feedbackList.find((f: any) => String(f.guest_id) === String(b.guest_id) || String(f.guest_name) === String(b.guest_name));
        // Calculate real nights from actual dates
        let nights = 1;
        if (b.check_in_date && b.check_out_date) {
          const cin = new Date(b.check_in_date);
          const cout = new Date(b.check_out_date);
          const diff = Math.round((cout.getTime() - cin.getTime()) / (1000 * 60 * 60 * 24));
          if (diff > 0) nights = diff;
        }
        // Use real payment amount if available
        const matchedPayment = paymentList.find((p: any) => p.booking_id === b.booking_id);
        const totalPaid = matchedPayment ? Number(matchedPayment.amount || 0) : (Number(b.price_per_night || 0) * nights);
        const ratingStr = guestFeedback ? `★ ${guestFeedback.rating} / ${String(guestFeedback.comments || '').substring(0, 22)}...` : 'No feedback yet';
        return [
          `BK-${b.booking_id}`,
          b.guest_name || "Premium Lodger",
          b.room_number ? `Room ${b.room_number}` : "N/A",
          `${b.check_in_date || 'N/A'} to ${b.check_out_date || 'N/A'}`,
          `${nights} Night${nights !== 1 ? 's' : ''}`,
          `Rs. ${totalPaid.toLocaleString('en-IN')}`,
          ratingStr
        ];
      });

      if (rows.length === 0) {
        rows.push(["N/A", "No stay records found in the database.", "", "", "", "", ""]);
      }
      summaryText = `Total Stays Indexed: ${rows.length} | Feedback Received: ${feedbackList.length}`;
      break;
    }

    case 'revenue': {
      title = "Revenue Audit & Balance Ledger Sheet";
      description = "Live payment transactions from Railway MySQL — actual booking revenue, GST collected, payment methods, and transaction references.";
      headers = ["Payment ID", "Guest Name", "Room", "Stay Duration", "Base Amount (Rs)", "GST (Rs)", "Total Paid (Rs)", "Method", "Status"];
      
      const payList = state?.payments || [];
      rows = payList.map((p: any, idx: number) => {
        const baseAmount = Number(p.amount || 0) - Number(p.gst_amount || 0);
        let daysNum = 1;
        if (p.check_in_date && p.check_out_date) {
          const cin = new Date(p.check_in_date);
          const cout = new Date(p.check_out_date);
          const diff = Math.round((cout.getTime() - cin.getTime()) / (1000 * 60 * 60 * 24));
          if (diff > 0) daysNum = diff;
        }
        return [
          `PAY-${p.payment_id || (idx + 1)}`,
          p.guest_name || 'N/A',
          p.room_number ? `Room ${p.room_number}` : 'N/A',
          p.check_in_date && p.check_out_date ? `${p.check_in_date} to ${p.check_out_date} (${p.nights || daysNum}N)` : 'N/A',
          baseAmount.toLocaleString('en-IN'),
          Number(p.gst_amount || 0).toLocaleString('en-IN'),
          Number(p.amount || 0).toLocaleString('en-IN'),
          p.payment_method || 'N/A',
          p.payment_status === 'Paid' ? '🟢 Paid' : p.payment_status === 'Refunded' ? '🔴 Refunded' : '🟡 Pending'
        ];
      });
      
      if (rows.length === 0) {
        rows.push(['N/A', 'No payment records found in the database.', '', '', '', '', '', '', '']);
      }
      
      const totalRevenue = payList.filter((p: any) => p.payment_status === 'Paid').reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const totalGst = payList.filter((p: any) => p.payment_status === 'Paid').reduce((s: number, p: any) => s + Number(p.gst_amount || 0), 0);
      summaryText = `Total Revenue: Rs. ${totalRevenue.toLocaleString('en-IN')} | GST Collected: Rs. ${totalGst.toLocaleString('en-IN')} | Transactions: ${payList.length}`;
      break;
    }

    case 'occupancy': {
      title = "Chamber Occupancy & Live Inventory Index";
      description = "Real-time room status from Railway MySQL — actual Available, Occupied, Dirty, and Maintenance counts from the rooms table.";
      headers = ["Room Number", "Room Class Pattern", "Live Status State", "Base Rent / Night", "Fitted Amenities"];
      
      const roomsList = state?.rooms || [];
      rows = roomsList.map((r: any) => {
        const amenities = Array.isArray(r.amenities) ? r.amenities.slice(0, 3).join(', ') : (r.amenities || 'Standard Amenities');
        const statusLabel = r.room_status === 'Available' ? '🟢 Available'
          : r.room_status === 'Occupied' ? '🔴 Occupied'
          : r.room_status === 'Dirty' ? '🟡 Pending Clean'
          : r.room_status === 'Maintenance' ? '🔵 Maintenance'
          : (r.room_status || 'Unknown');
        return [
          `Room ${r.room_number}`,
          r.room_type || 'Standard Room',
          statusLabel,
          `Rs. ${Number(r.price_per_night || 0).toLocaleString('en-IN')}`,
          amenities
        ];
      });

      if (rows.length === 0) {
        rows.push(['N/A', 'No room records found in the database.', '', '', '']);
      }

      const totalRooms = roomsList.length;
      const occupied = roomsList.filter((r: any) => r.room_status === 'Occupied').length;
      const available = roomsList.filter((r: any) => r.room_status === 'Available').length;
      const dirty = roomsList.filter((r: any) => r.room_status === 'Dirty').length;
      const maintenance = roomsList.filter((r: any) => r.room_status === 'Maintenance').length;
      const pct = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;
      summaryText = `Total Chambers: ${totalRooms} | Occupied: ${occupied} | Available: ${available} | Dirty: ${dirty} | Maintenance: ${maintenance} | Occupancy: ${pct}%`;
      break;
    }

    case 'housekeeping': {
      title = "Guest Services Duties & Bedding Dispatch Queue";
      description = "Live housekeeping task queue from Railway MySQL — actual room assignments, staff, and turnaround statuses.";
      headers = ["Task Job ID", "Chamber No", "Room Class", "Staff Assigned", "Operational Clean Status", "Last Complete Log"];
      
      const hList = state?.housekeeping || [];
      rows = hList.map((t: any) => [
        `JOB-${String(t.task_id).padStart(3, '0')}`,
        `Chamber ${t.room_number || 'N/A'}`,
        t.room_type || 'Standard Room',
        t.assigned_staff || 'Unassigned',
        t.task_status === 'Completed' ? '🟢 Ready & Safe' : t.task_status === 'In Progress' ? '🔵 In Progress' : '🟡 Pending',
        t.completion_time ? new Date(t.completion_time).toLocaleTimeString() : 'Pending Discharge'
      ]);

      if (rows.length === 0) {
        rows.push(['N/A', 'No housekeeping tasks found in the database.', '', '', '', '']);
      }

      const completed = hList.filter((t: any) => t.task_status === 'Completed').length;
      const total = hList.length;
      summaryText = `Tasks Scheduled: ${total} | Jobs Completed: ${completed} | Pending: ${total - completed}`;
      break;
    }

    case 'complaints':
    case 'complaint': {
      title = "Guest Redressal & Support Ticket Audit";
      description = "Analytical review of guest grievances, mechanical support inquiries, smart TV configurations, and engineering resolution times.";
      headers = ["Support ID", "Registrant Passenger", "Issue Category", "Priority Urgency", "Operational State", "Chronos Date"];
      
      const cList = state?.complaints || [];
      rows = cList.map((c: any) => [
        `CASE-00${c.complaint_id}`,
        c.guest_name || "Premium Entrant",
        c.complaint_category || "In-Room Tech",
        c.priority_level || "Medium",
        c.complaint_status === 'Resolved' ? '🟢 Solved & Reconciled' : '🟡 Waiting Front Desk Support',
        c.created_at ? c.created_at.substring(0,10) : '2026-06-05'
      ]);

      if (rows.length === 0) {
        rows.push(["N/A", "Acknowledge: No live guest support cases recorded in the system.", "", "", "", ""]);
      }
      
      const resolved = rows.filter(r => r[4].includes('Resolved') || r[4].includes('🟢')).length;
      summaryText = `Grievances Registered: ${rows.length} | Solved Issues Index: ${resolved}`;
      break;
    }

    case 'communication':
    case 'comm': {
      title = "Automated Communication Transmission Report";
      description = "Live outbound gateway delivery logs from Railway MySQL communication_history table — WhatsApp and Email delivery statuses.";
      headers = ["Activity Timestamp", "Guest Name", "Recipient Contact", "Comm Type", "Gateway Channel", "Deliverability State"];
      
      const logsList = state?.commLogs || [];
      rows = logsList.map((l: any) => [
        l.timestamp ? new Date(l.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' }) : 'N/A',
        l.guest_name || 'N/A',
        l.recipient_email || l.guest_id_str || 'N/A',
        l.communication_type || 'N/A',
        l.channel || 'N/A',
        l.status_info || '🟡 Unknown'
      ]);

      if (rows.length === 0) {
        rows.push(['N/A', 'N/A', 'No communication logs found in the database.', '', '', '']);
      }

      const success = logsList.filter((l: any) => l.status_info && l.status_info.includes('🟢')).length;
      const failed = logsList.filter((l: any) => l.status_info && l.status_info.includes('🔴')).length;
      summaryText = `Total Logs: ${logsList.length} | Delivered: ${success} | Failed: ${failed} | WhatsApp: ${logsList.filter((l: any) => l.channel === 'WhatsApp').length} | Email: ${logsList.filter((l: any) => l.channel === 'Email').length}`;
      break;
    }

    case 'corporate': {
      title = "Corporate Bulk Bookings & MICE Business Audit";
      description = "Exclusive business accounts audit — high-priority bulk reservation slots, liaison contacts, and booking confirmation status from Railway MySQL corporate_bookings table.";
      headers = ["Reference ID", "Enterprise Entity", "Liaison Officer", "Contact Email", "Rooms Enquired", "Intended Dates", "Status"];

      const corpList = state?.corporate || [];
      rows = corpList.map((c: any) => [
        `CORP-B-${c.corporate_booking_id}`,
        c.company_name || 'N/A',
        c.contact_person || 'N/A',
        c.contact_email || 'N/A',
        c.number_of_rooms ? `${c.number_of_rooms} Unit${Number(c.number_of_rooms) !== 1 ? 's' : ''}` : 'N/A',
        c.booking_dates || 'N/A',
        c.booking_status === 'Approved' ? '🟢 Approved'
          : c.booking_status === 'Rejected' ? '🔴 Rejected'
          : c.booking_status === 'Pending' ? '🟡 Pending Review'
          : (c.booking_status || 'N/A')
      ]);

      if (rows.length === 0) {
        rows.push(["—", "No Records Available", "—", "—", "—", "—", "—"]);
      }

      const approvedCount = corpList.filter((c: any) => c.booking_status === 'Approved').length;
      const pendingCount = corpList.filter((c: any) => c.booking_status === 'Pending').length;
      const totalRoomsReq = corpList.reduce((acc: number, c: any) => acc + Number(c.number_of_rooms || 0), 0);
      summaryText = `Corporate Leads: ${corpList.length} | Approved: ${approvedCount} | Pending: ${pendingCount} | Total Rooms Requested: ${totalRoomsReq}`;
      break;
    }

    default: {
      // Use standard formatting
      title = "Official Records Sheet";
      description = "Administrative information generated securely for executive review.";
      headers = ["Record Label Field", "Associated Operational Value"];
      rows = [
        ["Report Ref Reference", reportRef],
        ["Generated Author", generatedBy],
        ["Host Node", "Dwarka Cloud Server"]
      ];
      summaryText = "Record safe.";
      break;
    }
  }

  // 3. TITLE SECTIONS WRITER
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 31, 63); // Navy color
  doc.text(title.toUpperCase(), margin, margin + 23.5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  
  // Wrap text description elegantly to handle long titles safely
  const wrappedDesc = doc.splitTextToSize(description, usableWidth);
  doc.text(wrappedDesc, margin, margin + 28.5);

  // Set line drawing below headers
  let currentY = margin + 36.5;

  // 4. DRAW THE ADVERTISING TABLE GRID MANUALLY FOR MASSIVE PIXEL-PERFECT RESOLUTION (Avoiding auto-table plugin load crashes)
  // Headers Background Banner
  doc.setFillColor(0, 31, 63); // Navy
  doc.rect(margin, currentY, usableWidth, 8, 'F');
  
  // Header Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 230, 150); // Gold Letters

  // Calculate Column Widths dynamically
  const colCount = headers.length;
  const colWidth = usableWidth / colCount;

  headers.forEach((h, idx) => {
    // Draw text with spacing padding
    doc.text(h, margin + (colWidth * idx) + 2.5, currentY + 5.2);
  });

  currentY += 8;

  // Let's write the rows elements
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);

  rows.forEach((row, rowIdx) => {
    // Alternating row highlights
    if (rowIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252); // light slate background
      doc.rect(margin, currentY, usableWidth, 7.5, 'F');
    }

    // Border line beneath row
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY + 7.5, pageWidth - margin, currentY + 7.5);

    doc.setTextColor(15, 23, 42); // dark charcoal text
    
    // Draw columns cells
    row.forEach((cellVal, colIdx) => {
      const cellText = cellVal !== undefined && cellVal !== null ? String(cellVal) : "";
      
      // If cell includes status indicators, highlight nicely
      if (cellText.includes('🟢')) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 124, 65); // Green color text
      } else if (cellText.includes('🔴')) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 35, 24); // Red color text
      } else if (cellText.includes('🟡') || cellText.includes('🔵')) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 110, 10); // Amber orange text
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
      }

      // Clip cell text to fit column perfectly without overlapping adjacent columns
      let textToDraw = cellText;
      if (doc.getTextWidth(textToDraw) > colWidth - 4.5) {
        while (textToDraw.length > 5 && doc.getTextWidth(textToDraw + '...') > colWidth - 4.5) {
          textToDraw = textToDraw.substring(0, textToDraw.length - 1);
        }
        textToDraw += '...';
      }

      doc.text(textToDraw, margin + (colWidth * colIdx) + 2.5, currentY + 4.9);
    });

    currentY += 7.5;

    // Support simple page overflow guard just incase list is extremely long
    if (currentY > pageHeight - 32) {
      doc.addPage();
      currentY = margin + 20;

      // Draw outer luxury boundary on next page
      doc.setDrawColor(212, 175, 55); 
      doc.setLineWidth(0.5);
      doc.rect(margin - 4, margin - 4, usableWidth + 8, pageHeight - (margin * 2) + 8);

      // Re-draw small header logo band on second page
      doc.setFillColor(0, 31, 63);
      doc.rect(margin, margin, 10, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 230, 150);
      doc.text('SN', margin + 3, margin + 6.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 31, 63);
      doc.text('SAI NIRVANA PLAZA - AUDIT REPORT CONTINUED', margin + 12, margin + 6.5);

      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.line(margin, margin + 11, pageWidth - margin, margin + 11);

      // Re-draw headers
      doc.setFillColor(0, 31, 63);
      doc.rect(margin, currentY, usableWidth, 7, 'F');
      doc.setTextColor(255, 230, 150);
      doc.setFontSize(7);
      headers.forEach((h, idx) => {
        doc.text(h, margin + (colWidth * idx) + 2.5, currentY + 4.7);
      });
      currentY += 7;
    }
  });

  // 5. SUMMARY STATS TOTAL BLOCK
  currentY += 3.5;
  doc.setFillColor(241, 245, 249); // light blue/gray background box
  doc.setDrawColor(212, 175, 55);  // gold frame accent
  doc.setLineWidth(0.3);
  doc.rect(margin, currentY, usableWidth, 8.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 31, 63); // Navy color text
  doc.text("VERIFIED SUMMARY TALLY:", margin + 4, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42); // very dark
  doc.text(summaryText, margin + 45, currentY + 5.5);

  // 6. DRAW SIGN SEAL SIGNATURE BLOCK
  currentY += 15;
  if (currentY > pageHeight - 30) {
    // Avoid signature overlaying on bottom edge margins
    doc.addPage();
    currentY = margin + 20;
    doc.setDrawColor(212, 175, 55);
    doc.rect(margin - 4, margin - 4, usableWidth + 8, pageHeight - (margin * 2) + 8);
  }

  doc.setDrawColor(203, 213, 225); // light grey
  doc.setLineWidth(0.25);
  doc.line(pageWidth - margin - 45, currentY + 11, pageWidth - margin, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Hotel Compliance Liaison Officer", pageWidth - margin - 45, currentY + 14.5);
  doc.text("Authorized Signature & Seal", pageWidth - margin - 45, currentY + 17.5);

  // Clean logo seal print signature details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(212, 175, 55);
  doc.text("SAI NIRVANA PLAZA", pageWidth - margin - 45, currentY + 10);

  // Post-render Dynamic Page Numbering and Footer Generator on all generated pages
  const totalPagesCount = doc.getNumberOfPages();
  for (let i = 1; i <= totalPagesCount; i++) {
    doc.setPage(i);
    drawPageFooter(doc, pageWidth, pageHeight, margin, generatedBy, i, totalPagesCount);
  }

  const formattedFilename = `Sai_Nirvana_${type.charAt(0).toUpperCase() + type.slice(1)}_Report_${reportRef}.pdf`;
  doc.save(formattedFilename);

  return {
    filename: formattedFilename,
    refId: reportRef
  };
}

/**
 * Draws professional corporate page footer elements with ANTIGRAVITY 2.0 branding and page numbers
 */
function drawPageFooter(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  generatedBy: string,
  pageNum: number,
  totalPagesCount: number
) {
  doc.setDrawColor(226, 232, 240); // very soft border
  doc.setLineWidth(0.35);
  doc.line(margin, pageHeight - margin - 5, pageWidth - margin, pageHeight - margin - 5);

  // Left Disclaimer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184); // light gray text
  doc.text("Official electronic document certified under ANTIGRAVITY 2.0 & Sai Nirvana Plaza corporate accounts regulations. All amounts indicated are in INR (Rs).", margin, pageHeight - margin - 2);

  // Right index / user
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated by: ${generatedBy} | Page ${pageNum} of ${totalPagesCount}`, pageWidth - margin - 44, pageHeight - margin - 2);
}
