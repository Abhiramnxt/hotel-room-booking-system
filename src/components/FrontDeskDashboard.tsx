/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, CheckSquare, LogOut, CheckCircle, RefreshCw, 
  MapPin, ShieldAlert, FileText, Smartphone, Ban, Search,
  AlertTriangle, X, Archive, ShieldCheck, Sparkles, Home, Clock,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { Booking, UserRole, Room } from '../types';
import { playSound } from '../soundUtils';
import { CreateGuestAccountForm } from './CreateGuestAccountForm';
import { generatePdfReport } from '../utils/pdfGenerator';
import { RoomImage } from './RoomImage';

interface FrontDeskDashboardProps {
  currentRole?: UserRole;
}

export function FrontDeskDashboard({ currentRole = 'Front Desk Staff' }: FrontDeskDashboardProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom enhanced states for professional hotel operations
  const [rooms, setRooms] = useState<Room[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [selectedBookingIds, setSelectedBookingIds] = useState<number[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'stays' | 'credentials' | 'rooms'>('stays');
  const [resetRoomConfirm, setResetRoomConfirm] = useState<Room | null>(null);
  const [isResettingRoom, setIsResettingRoom] = useState(false);
  const [commLogs, setCommLogs] = useState<any[]>([]);
  const [sendingBookingId, setSendingBookingId] = useState<number | null>(null);
  const [expandedBookingIds, setExpandedBookingIds] = useState<number[]>([]);

  const toggleRowExpand = (bookingId: number) => {
    playSound('tap');
    if (expandedBookingIds.includes(bookingId)) {
      setExpandedBookingIds(expandedBookingIds.filter(id => id !== bookingId));
    } else {
      setExpandedBookingIds([...expandedBookingIds, bookingId]);
    }
  };

  const showLocalToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Clear selections when any active filter criteria shifts
  useEffect(() => {
    setSelectedBookingIds([]);
  }, [statusFilter, showArchivedOnly, searchQuery]);

  // Reset filters when changing active tab
  useEffect(() => {
    setStatusFilter('All');
    setSearchQuery('');
  }, [activeTab]);

  // Verification Modal states
  const [activeVerifyBooking, setActiveVerifyBooking] = useState<Booking | null>(null);
  const [idVerified, setIdVerified] = useState(false);
  
  // ── Cancel Booking Modal states ─────────────────────────────────────────────
  const [cancelTargetBooking, setCancelTargetBooking] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  // ────────────────────────────────────────────────────────────────────────────

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const [bookingsRes, roomsRes, logsRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/rooms'),
        fetch('/api/auth/communication-logs')
      ]);
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings);
      }
      if (roomsRes.ok) {
        const data = await roomsRes.json();
        setRooms(data.rooms);
      }
      if (logsRes && logsRes.ok) {
        const data = await logsRes.json();
        setCommLogs(data.logs || []);
      }
    } catch (e) {
      console.warn("Could not query front desk data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  /**
   * Broadcasts a booking status change signal so that GuestDashboard
   * (which may be mounted in the same tab or another tab) can immediately
   * refresh its data instead of waiting for its next polling cycle.
   *
   * Two mechanisms are used:
   *   1. localStorage write → fires the 'storage' event in OTHER tabs on same origin.
   *   2. Custom DOM event   → fires in the SAME tab (localStorage.setItem does NOT
   *      trigger 'storage' in the tab that wrote the value).
   */
  const broadcastBookingStatusChange = () => {
    try {
      localStorage.setItem('snp_booking_status_change', String(Date.now()));
    } catch {
      // localStorage might be unavailable in some environments; ignore silently
    }
    window.dispatchEvent(new CustomEvent('snp_booking_status_change'));
  };

  const handleUpdateStatus = async (bookingId: number, nextStatus: Booking['booking_status']) => {
    playSound('confirm');
    
    // Backup states for rollback
    const prevBookings = [...bookings];
    const prevRooms = [...rooms];

    // Optimistically update bookings status locally
    setBookings(prev => prev.map(b => b.booking_id === bookingId ? { ...b, booking_status: nextStatus } : b));

    // Find the booking to update corresponding room status locally
    const targetBooking = bookings.find(b => b.booking_id === bookingId);
    if (targetBooking) {
      if (nextStatus === 'Checked-In') {
        setRooms(prev => prev.map(r => r.room_number === targetBooking.room_number ? { ...r, room_status: 'Occupied' } : r));
      } else if (nextStatus === 'Checked-Out') {
        setRooms(prev => prev.map(r => r.room_number === targetBooking.room_number ? { ...r, room_status: 'Dirty' } : r));
      } else if (nextStatus === 'Cancelled') {
        setRooms(prev => prev.map(r => r.room_number === targetBooking.room_number ? { ...r, room_status: 'Available' } : r));
      }
    }

    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        const data = await res.json();
        playSound('success');
        
        // Sync state with the final returned booking from the server
        if (data.booking) {
          setBookings(prev => prev.map(b => b.booking_id === bookingId ? { ...b, ...data.booking } : b));
        }
        
        // Immediately notify GuestDashboard of the status change
        broadcastBookingStatusChange();
        setActiveVerifyBooking(null);
        setIdVerified(false);
      } else {
        // Rollback states
        setBookings(prevBookings);
        setRooms(prevRooms);
        showLocalToast("Failed to update booking status.", "error");
      }
    } catch (e) {
      console.warn(e);
      // Rollback states
      setBookings(prevBookings);
      setRooms(prevRooms);
      showLocalToast("Network error occurred.", "error");
    }
  };

  const handleResetRoomClean = async (room: Room) => {
    setIsResettingRoom(true);
    playSound('confirm');
    
    // Backup rooms state
    const prevRooms = [...rooms];
    
    // Optimistically update room status to 'Available'
    setRooms(prev => prev.map(r => r.room_id === room.room_id ? { ...r, room_status: 'Available' } : r));

    try {
      const res = await fetch(`/api/rooms/${room.room_id}/reset-clean`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffMember: currentRole })
      });
      if (res.ok) {
        playSound('success');
        showLocalToast(`Room ${room.room_number} successfully cleaned and released for booking.`);
        setResetRoomConfirm(null);
      } else {
        const err = await res.json();
        showLocalToast(err.error || 'Failed to reset room status.', 'error');
        // Rollback
        setRooms(prevRooms);
      }
    } catch (e) {
      console.warn("Could not reset room clean status:", e);
      showLocalToast("Network error. Please try again.", 'error');
      // Rollback
      setRooms(prevRooms);
    } finally {
      setIsResettingRoom(false);
    }
  };

  const handleOpenVerification = (booking: Booking) => {
    playSound('tap');
    setActiveVerifyBooking(booking);
    setIdVerified(booking.booking_status === 'Verified' || booking.booking_status === 'Checked-In');
  };

  const handleAcceptVerification = async () => {
    if (!activeVerifyBooking) return;
    const bookingId = activeVerifyBooking.booking_id;
    
    // Backup state for rollback
    const prevBookings = [...bookings];

    // Optimistically update status to 'Verified'
    setBookings(prev => prev.map(b => b.booking_id === bookingId ? { ...b, booking_status: 'Verified' } : b));
    setIdVerified(true);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Verified' })
      });
      if (res.ok) {
        const data = await res.json();
        playSound('success');
        
        // Sync final state
        if (data.booking) {
          setBookings(prev => prev.map(b => b.booking_id === bookingId ? { ...b, ...data.booking } : b));
        }
        
        // Immediately notify GuestDashboard of the verification/check-in status change
        broadcastBookingStatusChange();
      } else {
        // Rollback states
        setBookings(prevBookings);
        setIdVerified(false);
        showLocalToast("Failed to verify guest documents.", "error");
      }
    } catch (e) {
      console.warn("Could not verify booking documents:", e);
      // Rollback states
      setBookings(prevBookings);
      setIdVerified(false);
      showLocalToast("Network error occurred.", "error");
    }
  };

  // ── Cancel Booking Handlers ─────────────────────────────────────────────────

  /** Open the cancel confirmation modal — blocks Checked-In / Checked-Out */
  const handleOpenCancelModal = (booking: Booking) => {
    playSound('tap');
    setCancelError(null);

    const nonCancellableStatuses: Booking['booking_status'][] = ['Checked-In', 'Checked-Out'];
    if (nonCancellableStatuses.includes(booking.booking_status)) {
      setCancelError('Checked-In or Completed bookings cannot be cancelled.');
      setCancelTargetBooking(booking);
      return;
    }

    setCancelTargetBooking(booking);
  };

  /** Confirm and execute cancellation */
  const handleConfirmCancel = async () => {
    if (!cancelTargetBooking) return;
    const bookingId = cancelTargetBooking.booking_id;
    
    setIsCancelling(true);
    setCancelError(null);
    playSound('confirm');

    // Backup states for rollback
    const prevBookings = [...bookings];
    const prevRooms = [...rooms];

    // Optimistically update state to 'Cancelled'
    setBookings(prev => prev.map(b => b.booking_id === bookingId ? { ...b, booking_status: 'Cancelled' } : b));
    setRooms(prev => prev.map(r => r.room_number === cancelTargetBooking.room_number ? { ...r, room_status: 'Available' } : r));

    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' })
      });

      if (res.ok) {
        const data = await res.json();
        playSound('success');
        
        // Sync final state
        if (data.booking) {
          setBookings(prev => prev.map(b => b.booking_id === bookingId ? { ...b, ...data.booking } : b));
        }
        
        setCancelTargetBooking(null);
        broadcastBookingStatusChange();
      } else {
        const errData = await res.json();
        setCancelError(errData.error || 'Unable to cancel this booking.');
        // Rollback states
        setBookings(prevBookings);
        setRooms(prevRooms);
      }
    } catch (e) {
      setCancelError('Network error. Please try again.');
      console.warn('Cancel booking error:', e);
      // Rollback states
      setBookings(prevBookings);
      setRooms(prevRooms);
    } finally {
      setIsCancelling(false);
    }
  };

  /** Close cancel modal and reset state */
  const handleCloseCancelModal = () => {
    setCancelTargetBooking(null);
    setCancelError(null);
    setIsCancelling(false);
  };

  const fetchCommLogsOnly = async () => {
    try {
      const logsRes = await fetch('/api/auth/communication-logs');
      if (logsRes.ok) {
        const data = await logsRes.json();
        setCommLogs(data.logs || []);
      }
    } catch (e) {
      console.warn("Could not fetch communication logs:", e);
    }
  };

  const handleSendConfirmation = async (booking: Booking) => {
    playSound('confirm');
    setSendingBookingId(booking.booking_id);
    
    // Backup commLogs for rollback
    const prevLogs = [...commLogs];

    // Optimistically create a pending log entry to trigger immediate 'Queued' status in UI
    const tempLogId = -1 * Math.floor(Math.random() * 100000);
    const tempLog = {
      log_id: tempLogId,
      guest_id_str: `SNP-GUEST-${booking.guest_id}`,
      guest_name: booking.guest_name,
      channel: 'WhatsApp',
      status_info: '🟡 Pending Delivery',
      timestamp: new Date().toISOString(),
      communication_type: 'Booking Confirmation',
      recipient_email: booking.guest_phone,
      api_response: "",
      failure_reason: ""
    };
    setCommLogs(prev => [tempLog, ...prev]);

    try {
      const res = await fetch('/api/auth/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.booking_id,
          communication_type: 'Send Booking Confirmation',
          channel: 'Both',
          staff_member: currentRole
        })
      });
      if (res.ok) {
        const data = await res.json();
        playSound('success');
        showLocalToast(`Confirmation dispatch registered for guest ${booking.guest_name}.`);
        
        // Replace temp log with the registered pending log from the server
        if (data.log) {
          setCommLogs(prev => prev.map(l => l.log_id === tempLogId ? data.log : l));
        }
        
        // Trigger a series of short background polling logs refreshes to catch the final status
        // without doing a full reload. We poll at 2.5s, 5.0s, and 7.5s.
        setTimeout(fetchCommLogsOnly, 2500);
        setTimeout(fetchCommLogsOnly, 5000);
        setTimeout(fetchCommLogsOnly, 7500);
      } else {
        showLocalToast(`Confirmation dispatch failed.`, 'error');
        // Rollback logs
        setCommLogs(prevLogs);
      }
    } catch (e) {
      console.warn("Could not dispatch confirmation:", e);
      showLocalToast("Network error during dispatch.", 'error');
      // Rollback logs
      setCommLogs(prevLogs);
    } finally {
      setSendingBookingId(null);
    }
  };

  const getConfirmationStatus = (booking: Booking) => {
    if (sendingBookingId === booking.booking_id) {
      return 'Sending';
    }

    const bookingLogs = commLogs.filter(l => 
      l.communication_type === 'Booking Confirmation' && (
        (l.guest_name && booking.guest_name && l.guest_name.toLowerCase() === booking.guest_name.toLowerCase()) ||
        (l.recipient_email && booking.guest_email && l.recipient_email.toLowerCase() === booking.guest_email.toLowerCase())
      )
    );

    if (bookingLogs.length === 0) {
      return 'Pending';
    }

    // Sort by timestamp descending to get the latest log
    const latestLog = [...bookingLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    const statusInfo = latestLog.status_info || '';

    if (statusInfo.includes('🟢') || statusInfo.toLowerCase().includes('success') || statusInfo.toLowerCase().includes('delivered')) {
      return 'Delivered';
    }
    if (statusInfo.includes('🔴') || statusInfo.toLowerCase().includes('failed')) {
      return 'Failed';
    }
    return 'Queued';
  };

  const renderConfirmationStatus = (booking: Booking) => {
    // 1. Cancelled Bookings
    if (booking.booking_status === 'Cancelled') {
      return (
        <div className="flex items-center justify-center gap-2 h-8 whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 h-8 shrink-0 font-sans select-none">
            🚫 Confirmation Not Required
          </span>
        </div>
      );
    }

    // 2. Checked-Out Bookings
    if (booking.booking_status === 'Checked-Out') {
      return (
        <div className="flex items-center justify-center gap-2 h-8 whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 h-8 shrink-0 font-sans select-none">
            📨 Communication Completed
          </span>
        </div>
      );
    }

    // 3. Checked-In Bookings
    if (booking.booking_status === 'Checked-In') {
      return (
        <div className="flex items-center justify-center gap-2 h-8 whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-250 h-8 shrink-0 font-sans select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            🟢 Confirmation Sent
          </span>
          <button
            type="button"
            onClick={() => handleSendConfirmation(booking)}
            className="bg-[#003366] hover:bg-[#002147] text-white font-bold h-8 px-3.5 rounded-lg text-[10px] uppercase transition-colors shrink-0 text-center flex items-center justify-center shadow-sm cursor-pointer border border-[#D4AF37]/20"
            id={`btn_resend_confirmation_${booking.booking_id}`}
          >
            Resend Confirmation
          </button>
        </div>
      );
    }

    // 4. Other statuses (Pending, Confirmed, Verified)
    const status = getConfirmationStatus(booking);

    switch (status) {
      case 'Pending':
        return (
          <div className="flex items-center justify-center gap-2 h-8 whitespace-nowrap">
            <button
              type="button"
              onClick={() => handleSendConfirmation(booking)}
              className="bg-[#003366] hover:bg-[#002147] text-white font-bold h-8 px-3.5 rounded-lg text-[10px] uppercase transition-colors shrink-0 text-center flex items-center justify-center shadow-sm cursor-pointer border border-[#D4AF37]/20"
              id={`btn_send_confirmation_${booking.booking_id}`}
            >
              Send Confirmation
            </button>
          </div>
        );
      case 'Sending':
        return (
          <div className="flex items-center justify-center gap-2 h-8 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg bg-blue-50 text-blue-800 border border-blue-200 h-8 shrink-0 font-sans select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              🔵 Sending...
            </span>
          </div>
        );
      case 'Delivered':
        return (
          <div className="flex items-center justify-center gap-2 h-8 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-250 h-8 shrink-0 font-sans select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              🟢 Confirmation Sent
            </span>
            <button
              type="button"
              onClick={() => handleSendConfirmation(booking)}
              className="bg-[#003366] hover:bg-[#002147] text-white font-bold h-8 px-3.5 rounded-lg text-[10px] uppercase transition-colors shrink-0 text-center flex items-center justify-center shadow-sm cursor-pointer border border-[#D4AF37]/20"
              id={`btn_resend_confirmation_${booking.booking_id}`}
            >
              Resend Confirmation
            </button>
          </div>
        );
      case 'Failed':
        return (
          <div className="flex items-center justify-center gap-2 h-8 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg bg-rose-50 text-rose-800 border border-rose-250 h-8 shrink-0 font-sans select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              🔴 Delivery Failed
            </span>
            <button
              type="button"
              onClick={() => handleSendConfirmation(booking)}
              className="bg-[#003366] hover:bg-[#002147] text-white font-bold h-8 px-3.5 rounded-lg text-[10px] uppercase transition-colors shrink-0 text-center flex items-center justify-center shadow-sm cursor-pointer border border-[#D4AF37]/20"
              id={`btn_resend_confirmation_${booking.booking_id}`}
            >
              Resend Confirmation
            </button>
          </div>
        );
      case 'Queued':
        return (
          <div className="flex items-center justify-center gap-2 h-8 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg bg-purple-50 text-purple-800 border border-purple-250 h-8 shrink-0 font-sans select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              🟣 Queued
            </span>
            <button
              type="button"
              onClick={() => handleSendConfirmation(booking)}
              className="bg-[#003366] hover:bg-[#002147] text-white font-bold h-8 px-3.5 rounded-lg text-[10px] uppercase transition-colors shrink-0 text-center flex items-center justify-center shadow-sm cursor-pointer border border-[#D4AF37]/20"
              id={`btn_resend_confirmation_${booking.booking_id}`}
            >
              Resend Confirmation
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  const handleDeleteBooking = async (booking: Booking) => {
    if (!window.confirm("Are you sure you want to delete this archived record?")) return;
    playSound('confirm');
    try {
      const res = await fetch(`/api/bookings/${booking.booking_id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        playSound('success');
        showLocalToast(data.message || "Archived guest record deleted successfully.");
        fetchBookings();
      } else {
        showLocalToast(data.message || "Failed to delete archived record.", "error");
      }
    } catch (err) {
      showLocalToast("Network error trying to delete archived record.", "error");
    }
  };

  // ────────────────────────────────────────────────────────────────────────────

  // Date and filter logic:
  const filteredBookings = React.useMemo(() => {
    return bookings.filter(b => {
      // 1. Archive Filter
      const matchesArchive = showArchivedOnly ? !!b.is_archived : !b.is_archived;
      if (!matchesArchive) return false;

      // 3. Status Filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Pending') {
          if (b.booking_status !== 'Pending' && b.booking_status !== 'Confirmed') return false;
        } else {
          if (b.booking_status !== statusFilter) return false;
        }
      }

      // 4. Search Query Filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          b.guest_name?.toLowerCase().includes(query) ||
          `bk-${b.booking_id}`.toLowerCase().includes(query) ||
          b.booking_id.toString().includes(query) ||
          b.guest_id.toString().includes(query) ||
          b.room_number?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [bookings, showArchivedOnly, statusFilter, searchQuery]);

  /** Whether this booking is eligible for cancellation */
  const isCancellable = (status: Booking['booking_status']) =>
    status === 'Pending' || status === 'Confirmed' || status === 'Verified';

  // Statistics calculation:
  const activeGuestsCount = bookings.filter(b => b.booking_status === 'Checked-In' && !b.is_archived).length;
  const availableRoomsCount = rooms.filter(r => r.room_status === 'Available').length;
  const occupiedRoomsCount = rooms.filter(r => r.room_status === 'Occupied').length;
  const pendingVerificationsCount = bookings.filter(b => (b.booking_status === 'Pending' || b.booking_status === 'Confirmed') && !b.is_archived).length;
  const handleToggleSelectAll = () => {
    if (selectedBookingIds.length === filteredBookings.length) {
      setSelectedBookingIds([]);
    } else {
      setSelectedBookingIds(filteredBookings.map(b => b.booking_id));
    }
  };

  const handleToggleSelect = (bookingId: number) => {
    if (selectedBookingIds.includes(bookingId)) {
      setSelectedBookingIds(selectedBookingIds.filter(id => id !== bookingId));
    } else {
      setSelectedBookingIds([...selectedBookingIds, bookingId]);
    }
  };

  const handleBulkArchive = async (archive: boolean) => {
    if (selectedBookingIds.length === 0) return;
    playSound('confirm');
    try {
      const res = await fetch('/api/bookings/archive', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingIds: selectedBookingIds,
          is_archived: archive
        })
      });
      if (res.ok) {
        playSound('success');
        showLocalToast(`Successfully ${archive ? 'archived' : 'restored'} ${selectedBookingIds.length} records.`);
        setSelectedBookingIds([]);
        fetchBookings();
      } else {
        showLocalToast(`Failed to update archive status.`, 'error');
      }
    } catch (e) {
      console.warn("Could not archive/restore bookings:", e);
      showLocalToast("Network error occurred.", 'error');
    }
  };

  const getStatusBadge = (status: Booking['booking_status']) => {
    switch (status) {
      case 'Pending':
      case 'Confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Pending
          </span>
        );
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Verified
          </span>
        );
      case 'Checked-In':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Checked-In
          </span>
        );
      case 'Checked-Out':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded-full bg-slate-100 text-slate-800 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            Checked-Out
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded-full bg-slate-100 text-slate-800 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" id="front_desk_dashboard">
      
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 gap-2 mb-2 overflow-x-auto whitespace-nowrap scrollbar-none no-scrollbar">
        <button
          onClick={() => { playSound('tap'); setActiveTab('stays'); }}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex-shrink-0 ${
            activeTab === 'stays'
              ? 'border-[#003366] text-[#003366]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🏨 Front Desk Stay Lodger
        </button>
        <button
          onClick={() => { playSound('tap'); setActiveTab('credentials'); }}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex-shrink-0 ${
            activeTab === 'credentials'
              ? 'border-[#003366] text-[#003366]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🔑 Create & Manage Guest Access
        </button>
        <button
          onClick={() => { playSound('tap'); setActiveTab('rooms'); }}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex-shrink-0 ${
            activeTab === 'rooms'
              ? 'border-[#003366] text-[#003366]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          id="btn_tab_rooms"
        >
          🧹 Room Inventory & Clean Status
        </button>
      </div>

      {activeTab === 'credentials' && (
        <CreateGuestAccountForm currentRole={currentRole} />
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 animate-bounce bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-100">
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {activeTab === 'stays' && (
        <>
          {/* Quick Statistics Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/90 backdrop-blur border border-slate-200/80 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Active Guests</span>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-[#003366]">{activeGuestsCount}</div>
                <p className="text-[9px] text-slate-500 font-medium mt-0.5">Currently checked in</p>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur border border-slate-200/80 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Available Rooms</span>
                <RefreshCw className="h-4 w-4 text-blue-500" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-[#003366]">{availableRoomsCount}</div>
                <p className="text-[9px] text-slate-500 font-medium mt-0.5">Vacant & ready chambers</p>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur border border-slate-200/80 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Occupied Rooms</span>
                <ShieldAlert className="h-4 w-4 text-rose-500" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-[#003366]">{occupiedRoomsCount}</div>
                <p className="text-[9px] text-slate-500 font-medium mt-0.5">In-house occupied units</p>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur border border-slate-200/80 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Pending Verify</span>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-[#003366]">{pendingVerificationsCount}</div>
                <p className="text-[9px] text-slate-500 font-medium mt-0.5">Awaiting desk matches</p>
              </div>
            </div>
          </div>

          {/* Control and Filter Header Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Status Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Filter by Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { playSound('tap'); setStatusFilter(e.target.value); }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] focus:bg-white"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending / Confirmed</option>
                  <option value="Verified">Verified</option>
                  <option value="Checked-In">Checked-In</option>
                  <option value="Checked-Out">Checked-Out</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Text Search */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Instant Guest Search</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search Guest Name, Room #, Guest ID, Booking ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {selectedBookingIds.length > 0 ? (
                  <>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
                      {selectedBookingIds.length} Selected
                    </span>
                    {showArchivedOnly ? (
                      <button
                        onClick={() => handleBulkArchive(false)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Archive className="h-4 w-4" />
                        <span>Restore Selected Records</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBulkArchive(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Archive className="h-4 w-4" />
                        <span>📦 Archive Records</span>
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic">Select stay rows below for bulk operations</span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
                <button
                  onClick={() => { playSound('tap'); setShowArchivedOnly(!showArchivedOnly); }}
                  className={`text-xs font-bold px-4 py-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                    showArchivedOnly
                      ? 'bg-amber-500 border-amber-600 text-slate-950 font-black'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <Archive className="h-4 w-4" />
                  <span>{showArchivedOnly ? '📂 Show Active Stays' : '📦 View Archived Registry'}</span>
                </button>

                <button
                  onClick={fetchBookings}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold p-2.5 rounded-lg transition-colors cursor-pointer"
                  title="Force Refresh Live Database"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bookings table list */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-indigo-600" />
                <span>{showArchivedOnly ? '📦 Archived Booking Archives' : '🏨 Active Operational Booking Ledger'}</span>
              </h4>
              <span className="text-xs font-mono text-slate-500 font-bold bg-slate-200/50 px-2 py-0.5 rounded">
                {filteredBookings.length} Bookings matched
              </span>
            </div>

            {isLoading ? (
              <div className="py-20 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto text-indigo-600" />
                <p>Scanning relational index entries...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                {showArchivedOnly 
                  ? 'No archived stays match the current filter criteria.' 
                  : 'No bookings found. Please process reservations under Guest portal.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                      <th className="p-4 w-10 text-center">
                        <input
                           type="checkbox"
                           checked={filteredBookings.length > 0 && selectedBookingIds.length === filteredBookings.length}
                           onChange={handleToggleSelectAll}
                           className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                        />
                      </th>
                      <th className="p-4 w-8"></th>
                      <th className="p-4">Stay Details</th>
                      <th className="p-4">Guest Information</th>
                      <th className="p-4 text-center">Overall Status</th>
                      <th className="p-4 text-center min-w-[280px] w-[280px]">Guest Communications</th>
                      <th className="p-4 text-right min-w-[240px] w-[240px]">Operational Actions</th>
                      {showArchivedOnly && <th className="p-4 w-28 text-center">Delete</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.map((booking) => {
                      const checkIn = new Date(booking.check_in_date);
                      const checkOut = new Date(booking.check_out_date);
                      const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
                      const isExpanded = expandedBookingIds.includes(booking.booking_id);

                      return (
                        <React.Fragment key={booking.booking_id}>
                          <tr className={`hover:bg-slate-50/50 transition-colors ${selectedBookingIds.includes(booking.booking_id) ? 'bg-slate-50' : ''} ${isExpanded ? 'border-b-transparent bg-[#003366]/5' : ''}`}>
                            {/* Checkbox column */}
                            <td className="p-4 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={selectedBookingIds.includes(booking.booking_id)}
                                onChange={() => handleToggleSelect(booking.booking_id)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                              />
                            </td>

                            {/* Chevron expand column */}
                            <td className="p-4 w-8 text-center">
                              <button
                                type="button"
                                onClick={() => toggleRowExpand(booking.booking_id)}
                                className="text-slate-500 hover:text-[#003366] transition-colors p-1 rounded-lg cursor-pointer flex items-center justify-center"
                                title={isExpanded ? "Hide secondary details" : "Show secondary details"}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 shrink-0" />
                                )}
                              </button>
                            </td>

                            {/* Stay Info */}
                            <td className="p-4">
                              <span className="text-[10px] font-mono text-slate-400">BK-{booking.booking_id}</span>
                              <div className="font-bold text-slate-900 text-sm">{booking.room_type}</div>
                              <span className="text-amber-600 font-semibold font-mono">Room {booking.room_number}</span>
                            </td>

                            {/* Guest info */}
                            <td className="p-4">
                              <div className="font-bold text-slate-800">{booking.guest_name}</div>
                              <div className="text-slate-500 text-[11px] break-all">{booking.guest_email}</div>
                              <div className="text-slate-400 text-[11px] font-mono">{booking.guest_phone}</div>
                            </td>

                            {/* Status badge */}
                            <td className="p-4 text-center">
                              {getStatusBadge(booking.booking_status)}
                            </td>

                            {/* Guest Communications */}
                            <td className="p-4 text-center">
                              {renderConfirmationStatus(booking)}
                            </td>

                            {/* Operational Action Buttons */}
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2 whitespace-nowrap h-8">

                                {/* Restore from archive button */}
                                {booking.is_archived ? (
                                  <button
                                    onClick={async () => {
                                      playSound('confirm');
                                      try {
                                        const res = await fetch('/api/bookings/archive', {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ bookingIds: [booking.booking_id], is_archived: false })
                                        });
                                        if (res.ok) {
                                          playSound('success');
                                          showLocalToast(`Successfully restored stay record BK-${booking.booking_id}.`);
                                          fetchBookings();
                                        }
                                      } catch (e) {
                                        console.warn(e);
                                      }
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 px-3.5 rounded-lg text-[10px] uppercase transition-colors shrink-0 text-center flex items-center justify-center cursor-pointer"
                                  >
                                    Restore Stay
                                  </button>
                                ) : (
                                  <>
                                    {/* Existing action flow */}
                                    {(booking.booking_status === 'Pending' || booking.booking_status === 'Confirmed') && (
                                      <button
                                        onClick={() => handleOpenVerification(booking)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 px-3.5 rounded-lg text-[10px] uppercase transition-colors shrink-0 text-center flex items-center justify-center cursor-pointer"
                                        id={`btn_verify_${booking.booking_id}`}
                                      >
                                        Verify
                                      </button>
                                    )}
                                    {booking.booking_status === 'Verified' && (
                                      <button
                                        onClick={() => handleOpenVerification(booking)}
                                        className="bg-[#003366] hover:bg-[#001f3f] text-white font-bold h-8 px-3.5 rounded-lg text-[10px] uppercase transition-colors shrink-0 text-center flex items-center justify-center cursor-pointer"
                                        id={`btn_checkin_${booking.booking_id}`}
                                      >
                                        Check-In
                                      </button>
                                    )}
                                    {booking.booking_status === 'Checked-In' && (
                                      <button
                                        onClick={() => handleUpdateStatus(booking.booking_id, 'Checked-Out')}
                                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold h-8 px-3.5 rounded-lg text-[10px] uppercase transition-colors shrink-0 text-center flex items-center justify-center gap-1 cursor-pointer"
                                        id={`btn_checkout_${booking.booking_id}`}
                                      >
                                        <LogOut className="h-3.5 w-3.5 shrink-0" />
                                        <span>Process Check-Out</span>
                                      </button>
                                    )}

                                    {booking.booking_status === 'Checked-Out' && (
                                      <span className="text-slate-400 italic font-medium text-[10px] h-8 flex items-center select-none">Stays Completed</span>
                                    )}
                                    {booking.booking_status === 'Cancelled' && (
                                      <span className="text-rose-600 font-bold text-[10px] uppercase flex items-center gap-1 h-8 select-none">
                                        <Ban className="h-3.5 w-3.5 text-rose-600 shrink-0" /> Cancelled
                                      </span>
                                    )}

                                    {/* Cancel Booking button */}
                                    {isCancellable(booking.booking_status) && (
                                      <button
                                        onClick={() => handleOpenCancelModal(booking)}
                                        className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold h-8 px-3.5 rounded-lg text-[10px] uppercase transition-all shrink-0 text-center flex items-center justify-center gap-1 cursor-pointer"
                                        id={`btn_cancel_${booking.booking_id}`}
                                        title="Cancel this booking"
                                      >
                                        <Ban className="h-3.5 w-3.5 shrink-0" />
                                        <span>Cancel Booking</span>
                                      </button>
                                    )}
                                  </>
                                )}

                              </div>
                            </td>
                            {showArchivedOnly && (
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => handleDeleteBooking(booking)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold p-1.5 px-3 rounded text-[10px] uppercase cursor-pointer transition-colors"
                                  id={`btn_delete_archived_${booking.booking_id}`}
                                >
                                  Delete
                                </button>
                              </td>
                            )}
                          </tr>

                          {/* Expandable sub-row details panel */}
                          {isExpanded && (
                            <tr className="bg-slate-50/70 border-b border-slate-200">
                              <td colSpan={showArchivedOnly ? 8 : 7} className="p-4 pl-12 pr-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700">
                                  
                                  {/* Stay Duration & Dates Card */}
                                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-2 text-left">
                                    <div>
                                      <span className="text-[9px] font-extrabold uppercase text-[#003366] tracking-wider block mb-1">Stay Timeline & Dates</span>
                                      <div className="font-bold text-slate-900 text-sm mb-1">{nights} {nights === 1 ? 'Night' : 'Nights'} duration</div>
                                      <div className="space-y-1 text-slate-650 font-sans mt-1 leading-normal">
                                        <div className="flex justify-between">
                                          <span className="text-slate-455">Check-In:</span>
                                          <strong className="text-slate-800 font-mono">{booking.check_in_date} (12:00 PM)</strong>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-slate-455">Check-Out:</span>
                                          <strong className="text-slate-800 font-mono">{booking.check_out_date} (11:00 AM)</strong>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Simulated ID Document Card */}
                                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-2 text-left">
                                    <div>
                                      <span className="text-[9px] font-extrabold uppercase text-[#003366] tracking-wider block mb-1">Government ID Document</span>
                                      <div className="font-bold text-slate-900 text-sm mb-1">
                                        {booking.guest_phone === 'N/A' ? 'No ID Registered' : 'ID Registry Matches'}
                                      </div>
                                      <div className="space-y-1 text-slate-650 font-sans mt-1 leading-normal">
                                        <div className="flex justify-between">
                                          <span className="text-slate-455">Status:</span>
                                          <strong className="text-slate-800">{booking.guest_phone === 'N/A' ? 'Awaiting verification' : 'Verified Aadhaar / Passport'}</strong>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-slate-455">ID Reference:</span>
                                          <strong className="text-slate-850 font-mono max-w-[130px] truncate" title={booking.government_id}>{booking.government_id || 'N/A'}</strong>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Address & Guest Meta Card */}
                                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-2 text-left">
                                    <div>
                                      <span className="text-[9px] font-extrabold uppercase text-[#003366] tracking-wider block mb-1">Additional Information</span>
                                      <div className="font-bold text-slate-900 text-sm mb-1">Address Details</div>
                                      <p className="text-slate-655 text-[11px] leading-relaxed break-words">
                                        {booking.address && booking.address !== 'N/A' ? booking.address : 'No billing or home address registered on profile.'}
                                      </p>
                                    </div>
                                    <div className="text-[9px] text-slate-450 font-mono flex justify-between border-t pt-1.5 mt-1">
                                      <span>Guest Identifier:</span>
                                      <span className="font-bold text-[#003366]">SNP-{booking.guest_id}</span>
                                    </div>
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* GUEST ID VERIFICATION TRIGGER MODAL */}
          {activeVerifyBooking && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100 text-center space-y-6">
                <div>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded-full">
                    Front Desk Protection
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 font-heading mt-2">
                    Verify Government Document ID
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    You are verifying guest <strong className="text-slate-800">{activeVerifyBooking.guest_name}</strong> checking into Room <strong className="text-indigo-600">{activeVerifyBooking.room_number}</strong>.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-left text-xs">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500 font-medium">Guest Identity Info:</span>
                    <strong className="text-slate-800">{activeVerifyBooking.guest_name}</strong>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500 font-medium">Mobile Number:</span>
                    <strong className="text-slate-800">{activeVerifyBooking.guest_phone}</strong>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 font-medium block">Adhaar / PAN Registration:</span>
                    <div className="bg-amber-50 p-2 border border-amber-200 rounded font-mono text-center text-sm font-bold text-slate-800">
                      {activeVerifyBooking.guest_phone === 'N/A' ? 'No Document Registered' : 'Aadhaar Card: Verified on DB Index'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptVerification()}
                    disabled={idVerified}
                    className={`flex-1 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors ${
                      idVerified 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{idVerified ? 'Documents Approved' : 'Accept Photo Matches'}</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveVerifyBooking(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                </div>

                <button
                  onClick={() => handleUpdateStatus(activeVerifyBooking.booking_id, 'Checked-In')}
                  disabled={!idVerified}
                  className="w-full bg-slate-900 hover:bg-slate-850 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>Complete Check-In Process</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'rooms' && (
        <div className="space-y-6" id="rooms_management_section">
          {/* Header Description */}
          <div className="bg-gradient-to-r from-[#003366] to-[#001f3f] text-white p-6 rounded-3xl border border-[#D4AF37]/30 shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2 text-left">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#F9D976] bg-[#D4AF37]/10 border border-[#D4AF37]/35 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
                  Room Status & Clean Management
                </span>
                <h3 className="text-xl md:text-2xl font-black font-heading tracking-wide uppercase">
                  Chamber Inventory Reset Controller
                </h3>
                <p className="text-xs text-slate-200 max-w-2xl leading-relaxed">
                  Reset chambers to Available after guest check-out, clear housekeeping locks, and update real-time availability.
                </p>
              </div>

              <button
                onClick={fetchBookings}
                disabled={isLoading}
                className="shrink-0 bg-white/10 hover:bg-white/20 text-[#F9D976] hover:text-[#fff] text-xs font-bold px-4 py-2.5 rounded-xl border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer uppercase shadow"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Inventory</span>
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400">Filter Status:</span>
              <div className="flex flex-wrap gap-1">
                {['All', 'Available', 'Occupied', 'Dirty', 'Maintenance'].map((status) => {
                  const isActive = statusFilter === status;
                  return (
                    <button
                      key={status}
                      onClick={() => { playSound('tap'); setStatusFilter(status); }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                        isActive 
                          ? 'bg-[#003366] text-[#F9D976] border-[#D4AF37]' 
                          : 'bg-slate-50 text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search Room Number or Tier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border rounded-xl focus:outline-none focus:border-[#003366] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Room Inventory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms
              .filter((room) => {
                const matchesStatus = statusFilter === 'All' || room.room_status === statusFilter;
                const matchesSearch = searchQuery.trim() === '' || 
                  room.room_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  room.room_type.toLowerCase().includes(searchQuery.toLowerCase());
                return matchesStatus && matchesSearch;
              })
              .map((room) => {
                const isRoomAvailable = room.room_status === 'Available';
                const isRoomDirty = room.room_status === 'Dirty';
                const isRoomOccupied = room.room_status === 'Occupied';
                const isRoomMaintenance = room.room_status === 'Maintenance';

                return (
                  <div 
                    key={room.room_id} 
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      {/* Image Banner */}
                      <div className="relative h-40 bg-slate-900 w-full">
                        <RoomImage 
                          src={room.image_url} 
                          alt={room.room_type} 
                          category={room.room_type}
                          width={400}
                          quality={80}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3 bg-[#001f3f]/90 backdrop-blur-sm p-1 px-2.5 rounded-lg text-white font-mono text-xs font-bold border border-[#D4AF37]/35">
                          Room {room.room_number}
                        </div>
                        <div className="absolute bottom-3 left-3 bg-[#003366]/90 backdrop-blur-sm text-[#F9D976] text-[9px] font-extrabold tracking-wider uppercase p-0.5 px-2 rounded border border-[#D4AF37]/30">
                          {room.room_type}
                        </div>
                      </div>

                      {/* Info Panel */}
                      <div className="p-4 space-y-3 text-left">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-450 font-mono">Max Capacity: {room.capacity} Pax</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider border ${
                            isRoomAvailable 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                              : isRoomDirty
                              ? 'bg-amber-50 text-amber-800 border-amber-250 animate-pulse'
                              : isRoomOccupied
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {room.room_status}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 font-sans">
                          Price tariff: <strong className="text-slate-800 font-mono">₹{room.price_per_night.toLocaleString('en-IN')}</strong> / night
                        </div>

                        {/* Description / Status Indicators */}
                        <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-[11px] leading-normal text-slate-600 font-sans">
                          {isRoomAvailable && (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                              <span>Ready for new guest booking. No freeze locks active.</span>
                            </span>
                          )}
                          {isRoomDirty && (
                            <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              <span>Housekeeping pending clean-up request in queue.</span>
                            </span>
                          )}
                          {isRoomOccupied && (
                            <span className="text-blue-700 font-semibold flex items-center gap-1.5">
                              <Home className="h-3.5 w-3.5 shrink-0" />
                              <span>Guest is currently checked-in. Live active stay.</span>
                            </span>
                          )}
                          {isRoomMaintenance && (
                            <span className="text-rose-700 font-semibold flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>Room is under maintenance. Service lock active.</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reset Button */}
                    <div className="p-4 pt-0">
                      <button
                        onClick={() => { playSound('tap'); setResetRoomConfirm(room); }}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          !isRoomAvailable 
                            ? 'bg-[#003366]/10 hover:bg-[#003366] hover:text-white border border-[#003366]/30 text-[#003366]' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        }`}
                        disabled={isRoomAvailable}
                      >
                        <span>Mark Room Clean & Available</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Empty state when no rooms match */}
          {rooms.filter((room) => {
            const matchesStatus = statusFilter === 'All' || room.room_status === statusFilter;
            const matchesSearch = searchQuery.trim() === '' || 
              room.room_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
              room.room_type.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesStatus && matchesSearch;
          }).length === 0 && (
            <div className="py-20 text-center text-xs text-slate-450">
              No chambers match the current filter selection.
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CANCEL BOOKING CONFIRMATION MODAL                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {cancelTargetBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          id="cancel_booking_modal_overlay"
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-100 overflow-hidden"
            id="cancel_booking_modal"
          >
            {/* Modal Header */}
            <div className="bg-rose-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-white" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-heading">
                  Cancel Booking
                </h3>
              </div>
              <button
                onClick={handleCloseCancelModal}
                className="text-white/70 hover:text-white transition-colors rounded-full p-1"
                id="btn_close_cancel_modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">

              {/* Error message for non-cancellable statuses */}
              {cancelError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="font-semibold">{cancelError}</span>
                </div>
              )}

              {/* Confirmation message */}
              {!cancelError && (
                <p className="text-sm text-slate-700 font-medium text-center">
                  Are you sure you want to cancel this booking?
                </p>
              )}

              {/* Booking Details summary card */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-slate-500 font-semibold uppercase tracking-wide text-[10px]">Guest Name</span>
                  <span className="font-bold text-slate-900">{cancelTargetBooking.guest_name}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-slate-500 font-semibold uppercase tracking-wide text-[10px]">Guest ID</span>
                  <span className="font-mono font-bold text-slate-700">{cancelTargetBooking.guest_email}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-slate-500 font-semibold uppercase tracking-wide text-[10px]">Booking ID</span>
                  <span className="font-mono font-bold text-[#003366]">BK-{cancelTargetBooking.booking_id}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-slate-500 font-semibold uppercase tracking-wide text-[10px]">Room Number</span>
                  <span className="font-bold text-amber-700">Room {cancelTargetBooking.room_number}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-slate-500 font-semibold uppercase tracking-wide text-[10px]">Booking Date</span>
                  <span className="font-mono text-slate-700">
                    {cancelTargetBooking.check_in_date} → {cancelTargetBooking.check_out_date}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-slate-500 font-semibold uppercase tracking-wide text-[10px]">Current Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    cancelTargetBooking.booking_status === 'Pending' ? 'bg-indigo-100 text-indigo-800' :
                    cancelTargetBooking.booking_status === 'Confirmed' ? 'bg-indigo-100 text-indigo-800' :
                    cancelTargetBooking.booking_status === 'Verified' ? 'bg-blue-100 text-blue-800' :
                    cancelTargetBooking.booking_status === 'Checked-In' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {cancelTargetBooking.booking_status}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                {/* No, Keep Booking */}
                <button
                  onClick={handleCloseCancelModal}
                  disabled={isCancelling}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                  id="btn_keep_booking"
                >
                  No, Keep Booking
                </button>

                {/* Yes, Cancel Booking — only shown when cancellation is allowed */}
                {!cancelError && (
                  <button
                    onClick={handleConfirmCancel}
                    disabled={isCancelling}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer"
                    id="btn_confirm_cancel"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    <span>{isCancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ROOM CLEAN RESET CONFIRMATION MODAL                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {resetRoomConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#D4AF37]/35 overflow-hidden text-center p-6 space-y-6">
            <div>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded-full">
                Inventory Status Override
              </span>
              <h3 className="text-lg font-bold text-slate-900 font-heading mt-2">
                Release Chamber Inventory
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to mark this room as cleaned and available for booking?
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-medium">Chamber Number:</span>
                <strong className="text-slate-900">Room {resetRoomConfirm.room_number}</strong>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-medium">Room Category:</span>
                <strong className="text-slate-900">{resetRoomConfirm.room_type}</strong>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-medium">Current Status:</span>
                <strong className="text-amber-700 uppercase font-mono">{resetRoomConfirm.room_status}</strong>
              </div>
              <div className="text-[10px] text-slate-400 leading-relaxed font-sans pt-1">
                Confirming this action will update the status index, mark all pending housekeeping tasks for this room as complete, delete active stay records, and release blocked dates in the availability calendar starting today.
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setResetRoomConfirm(null)}
                disabled={isResettingRoom}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                No, Go Back
              </button>

              <button
                onClick={() => handleResetRoomClean(resetRoomConfirm)}
                disabled={isResettingRoom}
                className="flex-1 bg-[#003366] hover:brightness-110 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                id="btn_confirm_reset_clean"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>{isResettingRoom ? 'Confirming...' : 'Yes, Confirm Clean'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════════════════ */}

    </div>
  );
}
