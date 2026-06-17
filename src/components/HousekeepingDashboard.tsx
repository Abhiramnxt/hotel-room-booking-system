import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, RefreshCw, AlertTriangle, UserCheck, ShieldAlert, 
  Utensils, Coffee, Wrench, ClipboardList, AlertOctagon, ListFilter,
  Search, Clock, ChevronRight, User, Home, Sparkles,
  PlayCircle, UserPlus, Eye, ShieldCheck
} from 'lucide-react';
import { HousekeepingTask, RoomServiceRequest, Complaint, Booking } from '../types';
import { playSound } from '../soundUtils';

interface UnifiedRequest {
  id: string; // e.g., HK-1, RS-3, CP-4
  originalId: number;
  roomNumber: string;
  guestName: string;
  requestType: 'Food Order' | 'Room Service' | 'Housekeeping Clean' | 'Maintenance Request' | 'Issue Report' | 'Special Service Request';
  requestDetails: string;
  dateTime: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Pending' | 'In Progress' | 'Completed';
  category: 'housekeeping' | 'room_service' | 'complaint';
}

export function HousekeepingDashboard() {
  const [unifiedRequests, setUnifiedRequests] = useState<UnifiedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Food Orders' | 'Room Service Requests' | 'Issue Reports' | 'Maintenance Requests' | 'Guest Complaints' | 'Housekeeping Requests' | 'Completed' | 'Pending'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAllRequests = async () => {
    setIsLoading(true);
    try {
      // Fetch datasets in parallel
      const [hkRes, rsRes, cpRes, bookingsRes] = await Promise.all([
        fetch('/api/housekeeping'),
        fetch('/api/room-service'),
        fetch('/api/complaints'),
        fetch('/api/bookings')
      ]);

      let housekeepingTasks: HousekeepingTask[] = [];
      let roomServices: RoomServiceRequest[] = [];
      let complaints: Complaint[] = [];
      let bookings: Booking[] = [];

      if (hkRes.ok) housekeepingTasks = (await hkRes.json()).tasks || [];
      if (rsRes.ok) roomServices = (await rsRes.json()).requests || [];
      if (cpRes.ok) complaints = (await cpRes.json()).complaints || [];
      if (bookingsRes.ok) bookings = (await bookingsRes.json()).bookings || [];

      // Normalize and combine tasks
      const combined: UnifiedRequest[] = [];

      // 1. Process Housekeeping tasks
      housekeepingTasks.forEach(task => {
        // Find latest booking for this room to resolve guest name
        const roomBookings = bookings.filter(b => String(b.room_id) === String(task.room_id));
        const latestBooking = roomBookings.length > 0 ? roomBookings[0] : null;
        const guestName = latestBooking ? latestBooking.guest_name || 'Checked-Out Guest' : 'Checked-Out Room';

        combined.push({
          id: `HK-${task.task_id}`,
          originalId: task.task_id,
          roomNumber: task.room_number || 'N/A',
          guestName: guestName,
          requestType: 'Housekeeping Clean',
          requestDetails: 'Standard checkout deep sanitize & clean chamber.',
          dateTime: task.created_at || new Date().toISOString(),
          priority: 'Medium',
          status: task.task_status,
          category: 'housekeeping'
        });
      });

      // 2. Process Room Service & Food requests
      roomServices.forEach(req => {
        const isFood = req.request_type.includes('Dining Order') || req.request_type.includes('Food');
        combined.push({
          id: `RS-${req.request_id}`,
          originalId: req.request_id,
          roomNumber: req.room_number || 'N/A',
          guestName: req.guest_name || 'Resident Guest',
          requestType: isFood ? 'Food Order' : 'Room Service',
          requestDetails: req.request_type,
          dateTime: req.created_at || new Date().toISOString(),
          priority: 'High',
          status: req.request_status === 'Delivered' || req.request_status === 'Cancelled' ? 'Completed' : req.request_status,
          category: 'room_service'
        });
      });

      // 3. Process Complaints & Maintenance reports
      complaints.forEach(cp => {
        const isMaintenance = cp.complaint_category === 'Plumbing / Water Leakage' || cp.complaint_category === 'Air Conditioning Problem';
        combined.push({
          id: `CP-${cp.complaint_id}`,
          originalId: cp.complaint_id,
          roomNumber: cp.room_number || 'N/A',
          guestName: cp.guest_name || 'Resident Guest',
          requestType: isMaintenance ? 'Maintenance Request' : 'Issue Report',
          requestDetails: `[${cp.complaint_category}] ${cp.complaint_description}`,
          dateTime: cp.created_at || new Date().toISOString(),
          priority: cp.priority_level || 'Medium',
          status: cp.complaint_status === 'Resolved' ? 'Completed' : cp.complaint_status,
          category: 'complaint'
        });
      });

      // Sort by date/time (newest first)
      combined.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
      setUnifiedRequests(combined);
    } catch (e) {
      console.warn("Error loading unified housekeeping dashboard data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRequests();
  }, []);

  /**
   * Broadcasts a service status change signal so that GuestDashboard
   * (which may be mounted in the same tab or another tab) can immediately
   * refresh its room-service and complaint data.
   *
   * Two mechanisms are used:
   *   1. localStorage write → fires the 'storage' event in OTHER tabs.
   *   2. Custom DOM event  → fires in the SAME tab (localStorage does NOT
   *      trigger 'storage' in the tab that wrote the value).
   */
  const broadcastServiceStatusChange = () => {
    try {
      localStorage.setItem('snp_service_status_change', String(Date.now()));
    } catch {
      // localStorage might be unavailable in some environments; ignore silently
    }
    window.dispatchEvent(new CustomEvent('snp_service_status_change'));
  };

  const handleUpdateStatus = async (item: UnifiedRequest, nextStatus: 'In Progress' | 'Completed') => {
    playSound('click');
    let url = '';
    let statusValue = '';

    if (item.category === 'housekeeping') {
      url = `/api/housekeeping/${item.originalId}/status`;
      statusValue = nextStatus;
    } else if (item.category === 'room_service') {
      url = `/api/room-service/${item.originalId}/status`;
      statusValue = nextStatus === 'Completed' ? 'Delivered' : 'In Progress';
    } else if (item.category === 'complaint') {
      url = `/api/complaints/${item.originalId}/status`;
      statusValue = nextStatus === 'Completed' ? 'Resolved' : 'In Progress';
    }

    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusValue })
      });
      if (res.ok) {
        playSound('success');
        fetchAllRequests();
        // Immediately notify GuestDashboard of the room-service/complaint status change
        broadcastServiceStatusChange();
      }
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  // Filtering logic
  const filteredRequests = React.useMemo(() => {
    return unifiedRequests.filter(req => {
      // Search filter
      const matchesSearch = searchQuery.trim() === '' || 
        req.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
        req.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Category filter
      switch (activeFilter) {
        case 'Food Orders':
          return req.requestType === 'Food Order';
        case 'Room Service Requests':
          return req.requestType === 'Room Service';
        case 'Issue Reports':
          return req.requestType === 'Issue Report' || req.requestType === 'Special Service Request';
        case 'Maintenance Requests':
          return req.requestType === 'Maintenance Request';
        case 'Guest Complaints':
          return req.category === 'complaint';
        case 'Housekeeping Requests':
          return req.requestType === 'Housekeeping Clean';
        case 'Completed':
          return req.status === 'Completed';
        case 'Pending':
          return req.status === 'Pending';
        case 'All':
        default:
          return true;
      }
    });
  }, [unifiedRequests, searchQuery, activeFilter]);

  // Calculate quick stats counters
  const { totalCount, pendingCount, inProgressCount, completedCount } = React.useMemo(() => {
    const totalCount = unifiedRequests.length;
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    for (const r of unifiedRequests) {
      if (r.status === 'Pending') pending++;
      else if (r.status === 'In Progress') inProgress++;
      else if (r.status === 'Completed') completed++;
    }
    return {
      totalCount,
      pendingCount: pending,
      inProgressCount: inProgress,
      completedCount: completed
    };
  }, [unifiedRequests]);

  // Render badge helper for request type
  const renderTypeBadge = (type: UnifiedRequest['requestType']) => {
    switch (type) {
      case 'Food Order':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Utensils className="h-3 w-3 shrink-0" />
            <span>Food Orders</span>
          </span>
        );
      case 'Room Service':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Coffee className="h-3 w-3 shrink-0" />
            <span>Room Service</span>
          </span>
        );
      case 'Housekeeping Clean':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Home className="h-3 w-3 shrink-0" />
            <span>Housekeeping</span>
          </span>
        );
      case 'Maintenance Request':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <Wrench className="h-3 w-3 shrink-0" />
            <span>Maintenance</span>
          </span>
        );
      case 'Issue Report':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>Issue Report</span>
          </span>
        );
    }
  };

  // Render priority badge helper
  const renderPriorityBadge = (priority: UnifiedRequest['priority']) => {
    switch (priority) {
      case 'Critical':
        return <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-red-100 text-red-800 border border-red-200 uppercase animate-pulse">Critical</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase">High</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 uppercase">Medium</span>;
      case 'Low':
      default:
        return <span className="px-2 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-800 border border-slate-200 uppercase">Low</span>;
    }
  };

  /**
   * renderActionButtons — returns the correct set of operational buttons
   * for each request type, based on the current status.
   *
   * Food Orders         → Start Processing | Mark Completed
   * Room Service        → Assign           | In Progress    | Mark Completed
   * Issue Reports       → Review           | Resolve        | Mark Completed
   * Maintenance Request → Assign Staff     | In Progress    | Mark Completed
   * Housekeeping Clean  → Assign Staff     | In Progress    | Mark Completed
   * Guest Complaints    → Investigate      | Resolve        | Mark Completed
   */
  const renderActionButtons = (req: UnifiedRequest, compact = false) => {
    const btnBase = compact
      ? 'font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap'
      : 'font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap';

    const pendingBtn = 'bg-slate-900 hover:bg-slate-800 text-white ' + btnBase;
    const progressBtn = 'bg-blue-600 hover:bg-blue-700 text-white ' + btnBase;
    const resolveBtn = 'bg-violet-600 hover:bg-violet-700 text-white ' + btnBase;
    const completeBtn = 'bg-emerald-600 hover:bg-emerald-700 text-white ' + btnBase;

    if (req.status === 'Completed') {
      return (
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50/50 p-1 px-2 border border-emerald-200 rounded-md flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          <span>Done</span>
        </span>
      );
    }

    // ── Food Orders ──────────────────────────────────────────────
    if (req.requestType === 'Food Order') {
      return (
        <div className="flex flex-wrap gap-1">
          {req.status === 'Pending' && (
            <button
              onClick={() => handleUpdateStatus(req, 'In Progress')}
              className={pendingBtn}
              title="Start Processing this food order"
            >
              <PlayCircle className="h-3 w-3" />
              <span>Start Processing</span>
            </button>
          )}
          {req.status === 'In Progress' && (
            <button
              onClick={() => handleUpdateStatus(req, 'Completed')}
              className={completeBtn}
              title="Mark food order as delivered & completed"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Mark Completed</span>
            </button>
          )}
        </div>
      );
    }

    // ── Room Service Requests ────────────────────────────────────
    if (req.requestType === 'Room Service') {
      return (
        <div className="flex flex-wrap gap-1">
          {req.status === 'Pending' && (
            <button
              onClick={() => handleUpdateStatus(req, 'In Progress')}
              className={pendingBtn}
              title="Assign staff to this room service request"
            >
              <UserPlus className="h-3 w-3" />
              <span>Assign</span>
            </button>
          )}
          {req.status === 'In Progress' && (
            <>
              <button
                onClick={() => handleUpdateStatus(req, 'Completed')}
                className={completeBtn}
                title="Mark room service as completed"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Mark Completed</span>
              </button>
            </>
          )}
        </div>
      );
    }

    // ── Issue Reports ────────────────────────────────────────────
    if (req.requestType === 'Issue Report' || req.requestType === 'Special Service Request') {
      return (
        <div className="flex flex-wrap gap-1">
          {req.status === 'Pending' && (
            <button
              onClick={() => handleUpdateStatus(req, 'In Progress')}
              className={pendingBtn}
              title="Start reviewing this issue report"
            >
              <Eye className="h-3 w-3" />
              <span>Review</span>
            </button>
          )}
          {req.status === 'In Progress' && (
            <>
              <button
                onClick={() => handleUpdateStatus(req, 'Completed')}
                className={resolveBtn}
                title="Resolve and close this issue report"
              >
                <ShieldCheck className="h-3 w-3" />
                <span>Resolve</span>
              </button>
              <button
                onClick={() => handleUpdateStatus(req, 'Completed')}
                className={completeBtn}
                title="Mark issue as completed"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Complete</span>
              </button>
            </>
          )}
        </div>
      );
    }

    // ── Maintenance Requests ─────────────────────────────────────
    if (req.requestType === 'Maintenance Request') {
      return (
        <div className="flex flex-wrap gap-1">
          {req.status === 'Pending' && (
            <button
              onClick={() => handleUpdateStatus(req, 'In Progress')}
              className={pendingBtn}
              title="Assign maintenance staff"
            >
              <UserPlus className="h-3 w-3" />
              <span>Assign Staff</span>
            </button>
          )}
          {req.status === 'In Progress' && (
            <button
              onClick={() => handleUpdateStatus(req, 'Completed')}
              className={completeBtn}
              title="Mark maintenance as completed"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Mark Completed</span>
            </button>
          )}
        </div>
      );
    }

    // ── Housekeeping Clean ───────────────────────────────────────
    if (req.requestType === 'Housekeeping Clean') {
      return (
        <div className="flex flex-wrap gap-1">
          {req.status === 'Pending' && (
            <button
              onClick={() => handleUpdateStatus(req, 'In Progress')}
              className={pendingBtn}
              title="Assign housekeeping staff to this room"
            >
              <UserPlus className="h-3 w-3" />
              <span>Assign Staff</span>
            </button>
          )}
          {req.status === 'In Progress' && (
            <button
              onClick={() => handleUpdateStatus(req, 'Completed')}
              className={completeBtn}
              title="Mark housekeeping as completed"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Mark Completed</span>
            </button>
          )}
        </div>
      );
    }

    // ── Guest Complaints (catch-all complaint category) ──────────
    return (
      <div className="flex flex-wrap gap-1">
        {req.status === 'Pending' && (
          <button
            onClick={() => handleUpdateStatus(req, 'In Progress')}
            className={pendingBtn}
            title="Begin investigating this guest complaint"
          >
            <ShieldAlert className="h-3 w-3" />
            <span>Investigate</span>
          </button>
        )}
        {req.status === 'In Progress' && (
          <>
            <button
              onClick={() => handleUpdateStatus(req, 'Completed')}
              className={resolveBtn}
              title="Resolve this complaint"
            >
              <ShieldCheck className="h-3 w-3" />
              <span>Resolve</span>
            </button>
            <button
              onClick={() => handleUpdateStatus(req, 'Completed')}
              className={completeBtn}
              title="Mark complaint as completed"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Complete</span>
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6" id="housekeeping_dashboard_unified">
      
      {/* 1. TOP HEADER SUMMARY CARD */}
      <div className="bg-gradient-to-r from-[#003366] to-[#001f3f] text-white p-6 rounded-3xl border border-[#D4AF37]/30 shadow-lg" id="housekeeping_summary_banner">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 text-left">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-[#F9D976] bg-[#D4AF37]/10 border border-[#D4AF37]/35 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              Unified Operations Console
            </span>
            <h3 className="text-xl md:text-2xl font-black font-heading tracking-wide uppercase">
              Staff Services &amp; Guest Services Dashboard
            </h3>
            <p className="text-xs text-slate-200 max-w-2xl leading-relaxed">
              Consolidated workspace managing guest room service orders, kitchen dining tickets, AC/plumbing complaints, and checkout chamber cleans in real-time.
            </p>
          </div>

          <button
            onClick={fetchAllRequests}
            disabled={isLoading}
            className="shrink-0 bg-white/10 hover:bg-white/20 text-[#F9D976] hover:text-[#fff] text-xs font-bold px-4 py-2.5 rounded-xl border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer uppercase shadow"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Workspace</span>
          </button>
        </div>

        {/* METRICS COUNT GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/15">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-left">
            <span className="text-[10px] font-mono text-slate-300 uppercase block tracking-wider">Total Active Jobs</span>
            <div className="text-2xl font-black font-mono text-[#F9D976] mt-1">{totalCount}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-left">
            <span className="text-[10px] font-mono text-slate-300 uppercase block tracking-wider text-amber-300">Pending Actions</span>
            <div className="text-2xl font-black font-mono text-amber-300 mt-1">{pendingCount}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-left">
            <span className="text-[10px] font-mono text-slate-300 uppercase block tracking-wider text-blue-300">In Progress</span>
            <div className="text-2xl font-black font-mono text-blue-300 mt-1">{inProgressCount}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-left">
            <span className="text-[10px] font-mono text-slate-300 uppercase block tracking-wider text-emerald-300">Completed Jobs</span>
            <div className="text-2xl font-black font-mono text-emerald-300 mt-1">{completedCount}</div>
          </div>
        </div>
      </div>

      {/* 2. FILTERING AND SEARCH CONTROL PANEL */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Horizontal Filters buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar select-none" id="housekeeping_filters_container">
          <div className="flex items-center gap-1 text-slate-400 mr-1.5">
            <ListFilter className="h-4 w-4" />
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono">Filters:</span>
          </div>
          {(['All', 'Food Orders', 'Room Service Requests', 'Issue Reports', 'Maintenance Requests', 'Guest Complaints', 'Housekeeping Requests', 'Pending', 'Completed'] as const).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => { playSound('tap'); setActiveFilter(filter as any); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
                  isActive 
                    ? 'bg-[#003366] text-[#F9D976] border-[#D4AF37]' 
                    : 'bg-slate-50 text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {/* Search Input bar */}
        <div className="relative md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Room, Guest name, ID..."
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:border-[#003366] focus:bg-white transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-650 text-xs"
            >
              Clear
            </button>
          )}
        </div>

      </div>

      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-20 text-center text-xs text-slate-450 shadow-sm">
          <RefreshCw className="h-8 w-8 animate-spin text-[#003366] mx-auto mb-3" />
          <p className="font-semibold font-heading uppercase text-[10px] tracking-wider text-slate-700">Consolidating active queues...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center text-xs text-slate-450 shadow-sm space-y-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <h4 className="font-black text-slate-800 text-sm font-heading uppercase tracking-wide">No Active Work orders found</h4>
          <p className="max-w-md mx-auto text-slate-500 leading-relaxed">
            There are no requests matching the filter selection in the database. New guest orders or complaints dynamically appear here.
          </p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW — wrapped in overflow-x:auto so it never bursts the card */}
          <div
            className="hidden md:block bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden"
            id="housekeeping_desktop_table_container"
          >
            {/* Scroll wrapper: overflow-x:auto keeps horizontal scroll INSIDE the card */}
            <div className="gs-table-scroll-wrapper">
              {/*
                gs-table-fixed → table-layout: fixed; width: 100%
                Column widths are declared via th colSpan width classes (gs-col-*)
              */}
              <table className="gs-table-fixed text-left">
                <colgroup>
                  <col className="gs-col-id" />
                  <col className="gs-col-room" />
                  <col className="gs-col-guest" />
                  <col className="gs-col-type" />
                  <col className="gs-col-details" />
                  <col className="gs-col-time" />
                  <col className="gs-col-priority" />
                  <col className="gs-col-status" />
                  <col className="gs-col-actions" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-900 text-[#F9D976] border-b border-[#D4AF37]/30 text-[10px] uppercase font-bold tracking-wider">
                    <th className="p-4 pl-5">ID</th>
                    <th className="p-4">Room</th>
                    <th className="p-4">Guest Name</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Details</th>
                    <th className="p-4">Submitted At</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => {
                    const formattedTime = new Date(req.dateTime).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <tr 
                        key={req.id}
                        className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors"
                      >
                        {/* ID */}
                        <td className="p-4 pl-5 font-mono font-extrabold text-[#003366] text-xs">
                          {req.id}
                        </td>

                        {/* Room */}
                        <td className="p-4 font-black text-slate-800 text-xs">
                          Rm {req.roomNumber}
                        </td>

                        {/* Guest Name */}
                        <td className="p-4 font-semibold text-slate-700 text-xs">
                          <span className="block truncate" title={req.guestName}>
                            {req.guestName}
                          </span>
                        </td>

                        {/* Type badge */}
                        <td className="p-4">
                          {renderTypeBadge(req.requestType)}
                        </td>

                        {/*
                          Details — gs-cell-details applies:
                            white-space: normal
                            word-break: break-word
                            overflow-wrap: break-word
                          This allows long text to wrap across multiple lines
                          instead of pushing the table wider.
                        */}
                        <td className="p-4 text-xs text-slate-600 gs-cell-details" title={req.requestDetails}>
                          {req.requestDetails}
                        </td>

                        {/* Submitted At */}
                        <td className="p-4 text-[10px] text-slate-450 font-mono">
                          {formattedTime}
                        </td>

                        {/* Priority */}
                        <td className="p-4">
                          {renderPriorityBadge(req.priority)}
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider border ${
                            req.status === 'Pending'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : req.status === 'In Progress'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              req.status === 'Pending' ? 'bg-amber-500' : req.status === 'In Progress' ? 'bg-blue-500' : 'bg-emerald-500'
                            }`} />
                            <span>{req.status}</span>
                          </span>
                        </td>

                        {/*
                          Actions — gs-cell-actions prevents buttons from overflowing.
                          renderActionButtons(req, compact=true) uses smaller padding.
                        */}
                        <td className="p-4 pr-5 gs-cell-actions">
                          {renderActionButtons(req, true)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE RESPONSIVE CARDS VIEW */}
          <div className="block md:hidden space-y-4" id="housekeeping_mobile_cards_container">
            {filteredRequests.map((req) => {
              const formattedTime = new Date(req.dateTime).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div 
                  key={req.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 flex flex-col justify-between transition-all ${
                    req.status === 'Pending' 
                      ? 'border-amber-250 bg-amber-50/5' 
                      : req.status === 'In Progress'
                      ? 'border-blue-200 bg-blue-50/5'
                      : 'border-slate-150 bg-slate-50/10 opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono text-[#003366] font-extrabold">{req.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider ${
                        req.status === 'Pending'
                          ? 'bg-amber-100 text-amber-800 border'
                          : req.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800 border'
                          : 'bg-emerald-100 text-emerald-800 border'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="text-left">
                      <h5 className="font-black text-slate-800 text-sm">Room {req.roomNumber}</h5>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3" />
                        <span>{req.guestName}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {renderTypeBadge(req.requestType)}
                      {renderPriorityBadge(req.priority)}
                    </div>

                    {/* Details — naturally wraps in card layout */}
                    <div className="bg-slate-50 border p-3 rounded-xl text-left text-xs text-slate-650 leading-relaxed font-mono break-words">
                      {req.requestDetails}
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Submitted: {formattedTime}</span>
                    </div>
                  </div>

                  {/* Type-specific Action buttons for mobile */}
                  <div className="pt-3 border-t">
                    {renderActionButtons(req, false)}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

    </div>
  );
}
