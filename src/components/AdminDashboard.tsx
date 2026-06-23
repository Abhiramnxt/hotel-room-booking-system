/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, IndianRupee, Landmark, Compass, MessageCircle, AlertTriangle, 
  ShieldCheck, RefreshCw, Star, PlaySquare, ListFilter,
  CheckCircle, CheckCircle2, ChevronRight, Ban 
} from 'lucide-react';
import { CorporateBooking, Feedback, UserRole } from '../types';
import { playSound } from '../soundUtils';
import { CreateGuestAccountForm } from './CreateGuestAccountForm';

interface AdminDashboardProps {
  currentRole?: UserRole;
}

const BaseComponent = React.Component as any;

class ErrorBoundary extends BaseComponent {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("DIAGNOSTIC_CRASH_ERROR:", error);
    console.error("DIAGNOSTIC_CRASH_INFO:", errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-rose-50 text-rose-950 border border-rose-200 rounded-xl space-y-2">
          <h2 className="font-bold text-lg">AdminDashboard Render Crash Detected</h2>
          <p className="text-xs font-mono text-rose-800">
            Error: {this.state.error ? this.state.error.message : String(this.state.error)}
          </p>
          <pre className="text-[10px] font-mono p-3 bg-rose-100/50 rounded overflow-x-auto">
            {this.state.error ? this.state.error.stack : ""}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AdminDashboard(props: AdminDashboardProps) {
  return (
    <ErrorBoundary>
      <InnerAdminDashboard {...props} />
    </ErrorBoundary>
  );
}

function InnerAdminDashboard({ currentRole = 'Hotel Manager' }: AdminDashboardProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [popularRooms, setPopularRooms] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [corporate, setCorporate] = useState<CorporateBooking[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const [res, corpRes, fbRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/corporate'),
        fetch('/api/feedback')
      ]);

      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setPopularRooms(data.popularRooms);
        setMonthlyTrend(data.monthlyTrend);
      }

      if (corpRes.ok) {
        const cData = await corpRes.json();
        setCorporate(cData.corporate);
      }

      if (fbRes.ok) {
        const fbData = await fbRes.json();
        setFeedback(fbData.feedback);
      }

    } catch (e) {
      console.warn("Could not retrieve statistics:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // ── Auto-refresh every 30 seconds so occupancy stays current ──
    const pollInterval = setInterval(() => {
      fetchStats();
    }, 30000);

    // ── Instant sync when FrontDesk triggers a check-in / check-out ──
    // FrontDeskDashboard writes 'snp_booking_status_change' to localStorage
    // and dispatches the same key as a custom DOM event (same-tab).
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'snp_booking_status_change' || e.key === 'snp_service_status_change') {
        fetchStats();
      }
    };
    const handleSameTabSync = () => fetchStats();

    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('snp_booking_status_change', handleSameTabSync);
    window.addEventListener('snp_service_status_change', handleSameTabSync);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('snp_booking_status_change', handleSameTabSync);
      window.removeEventListener('snp_service_status_change', handleSameTabSync);
    };
  }, []);

  const handleUpdateCorporate = async (corpId: number, nextStatus: 'Approved' | 'Rejected') => {
    playSound('click');
    try {
      const res = await fetch(`/api/corporate/${corpId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        playSound('success');
        fetchStats();
      }
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="space-y-8" id="admin_dashboard">
      
      {/* Search Header panel */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow">
        <div>
          <span className="text-[10px] text-amber-600 font-mono font-bold uppercase block tracking-wider">Operational Overview</span>
          <h4 className="text-base font-bold text-slate-900 font-heading">
            Corporate Financial Analytics
          </h4>
        </div>

        <button
          onClick={fetchStats}
          className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {metrics && (
        <>
          {/* STATS COUNT GRID CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 1. Total Revenue Card */}
            <div className="bg-gradient-to-br from-[#001f3f] to-[#003366] text-white rounded-2xl p-5 shadow-lg space-y-3 border border-[#D4AF37]/35 transform hover:-translate-y-1 transition-transform">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">Total Revenue Booking</span>
                <Landmark className="h-5 w-5 text-[#F9D976]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold font-mono text-[#F9D976]">₹{(Number(metrics.totalRevenue) || 0).toLocaleString('en-IN')}</h3>
                <p className="text-[10px] text-slate-300 font-medium">GST Taxes (12-18%): ₹{(Number(metrics.gstCollected) || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* 2. Occupancy rate Card */}
            <div className="bg-white text-slate-900 rounded-2xl p-5 border border-[#D4AF37]/20 border-l-4 border-l-[#003366] shadow-sm space-y-3 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live Occupancy Rate</span>
                <TrendingUp className="h-5 w-5 text-[#003366]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold font-mono text-[#003366]">{Number(metrics.occupancyRate) || 0}%</h3>
                  <span className="text-xs text-slate-500 font-medium">
                    ({Number(metrics.occupiedRooms) || 0} / {Number(metrics.availableRooms) + Number(metrics.occupiedRooms) + Number(metrics.dirtyRooms) + Number(metrics.maintenanceRooms) || 0} Rooms occupied)
                  </span>
                </div>
                {/* Visual Progress rate */}
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${Number(metrics.occupancyRate) || 0}%` }} />
                </div>
              </div>
            </div>

            {/* 3. Bookings counter Card */}
            <div className="bg-white text-slate-900 rounded-2xl p-5 border border-[#D4AF37]/20 border-l-4 border-l-[#003366] shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Bookings Managed</span>
                <Landmark className="h-5 w-5 text-[#003366]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold font-mono text-[#003366]">{Number(metrics.totalBookings) || 0} Registered</h3>
                <p className="text-[10px] text-slate-400 font-mono">Simulating walked-ins & website source bookings</p>
              </div>
            </div>

            {/* 4. Support rate resolutions */}
            <div className="bg-white text-slate-900 rounded-2xl p-5 border border-[#D4AF37]/20 border-l-4 border-l-[#003366] shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Complaints Resolved</span>
                <Star className="text-[#D4AF37] h-5 w-5 fill-[#F9D976]/30" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold font-mono text-[#003366]">{Number(metrics.complaintResolutionRate) || 0}%</h3>
                <p className="text-[10px] text-slate-400">({Number(metrics.averageRating) || 0} Stars average ratings from reviews)</p>
              </div>
            </div>

          </div>

          {/* VISUAL REVENUE GRAPH TREND AND POPULAR ROOMS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Visual native SVG Revenue trend Plot */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-4">
              <h4 className="text-sm font-bold text-[#003366] uppercase tracking-wider">Gross revenue monthly trend (₹)</h4>
              <div className="h-64 flex items-end justify-between gap-3 pt-6 border-b border-l border-slate-100 px-4 pb-2" id="svg_report_trend">
                {(monthlyTrend || []).map((t, idx) => {
                  if (!t) return null;
                  const validRevenues = (monthlyTrend || []).map(m => m ? (Number(m.revenue) || 0) : 0);
                  const maxRevenue = validRevenues.length > 0 ? Math.max(...validRevenues) : 0;
                  const rev = Number(t.revenue) || 0;
                  
                  // Ensure a minimum height of 2% so the ₹0 bar remains hoverable and visible
                  const percentage = maxRevenue > 0 ? Math.max(2, (rev / maxRevenue) * 90) : 2;

                  return (
                    <div key={idx} className="flex-1 h-full flex flex-col justify-end items-center gap-2 group relative">
                      {/* Hover Tooltip */}
                      <span className="absolute -top-8 bg-slate-950 text-white font-mono text-[9px] p-1 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 font-bold whitespace-nowrap shadow-lg">
                        {t.name}: ₹{rev.toLocaleString('en-IN')}
                      </span>

                      {/* Animated SVG bar with Data Point */}
                      <div 
                        className="w-full bg-gradient-to-t from-[#001f3f] to-[#003366] hover:from-[#D4AF37] hover:to-[#F9D976] rounded-t-md transition-all duration-700 relative flex justify-center"
                        style={{ height: `${percentage}%` }}
                      >
                        {/* Interactive Data Point Dot */}
                        <div className="absolute -top-1 w-2.5 h-2.5 rounded-full bg-[#F9D976] border border-[#001f3f] group-hover:scale-150 transition-transform shadow-md" />
                      </div>
                      
                      {/* Compact Abbreviated Label */}
                      <span className="text-[10px] text-slate-500 font-bold font-mono uppercase" title={t.name}>
                        {t.name ? t.name.substring(0, 3) : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Popular Rooms Share distribution */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-4 flex flex-col justify-between">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Room Type Popularity share</h4>
              
              <div className="space-y-4">
                {(popularRooms || []).map((r, i) => {
                  if (!r) return null;
                  const rName = r.name || 'Room';
                  const rOccupancy = Number(r.occupancy) || 0;
                  const rRevenue = Number(r.revenue) || 0;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">{rName}</span>
                        <span className="font-mono text-slate-500">{rOccupancy}% Occupancy</span>
                      </div>
                      {/* Native visual gauge bar */}
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            i === 0 ? 'bg-indigo-600' : i === 1 ? 'bg-amber-500' : 'bg-slate-400'
                          }`} 
                          style={{ width: `${rOccupancy}%` }} 
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">Gross generated revenue: ₹{rRevenue.toLocaleString('en-IN')}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </>
      )}

      {/* CORPORATE BULK ENQUIRIES SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
        <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-950 uppercase tracking-widest flex items-center gap-1.5">
            <Compass className="h-4 w-4 text-blue-900" />
            <span>Corporate Bulk Reservation Requests</span>
          </h4>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold font-mono">
            {(corporate || []).length} Pending enquiries
          </span>
        </div>

        {(corporate || []).length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No corporate inquiries registered. Simulated leads appear here when corporate entities submit enquiries.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs font-sans">
              <thead>
                <tr className="bg-slate-100/50 text-slate-600 font-bold border-b">
                  <th className="p-4">Corporate Client</th>
                  <th className="p-4">Contact Representative</th>
                  <th className="p-4">Contact Phone</th>
                  <th className="p-4">Bulk Rooms Requested</th>
                  <th className="p-4">Enquiry Dates</th>
                  <th className="p-4">Enquiry Status</th>
                  <th className="p-4 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(corporate || []).map((c) => {
                  if (!c) return null;
                  return (
                    <tr key={c.corporate_booking_id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">{c.company_name || 'N/A'}</td>
                      <td className="p-4">{c.contact_person || 'N/A'}</td>
                      <td className="p-4 text-slate-500 font-mono">{c.contact_phone || 'N/A'}</td>
                      <td className="p-4 font-mono font-bold text-slate-700">{(Number(c.number_of_rooms) || 0)} Rooms</td>
                      <td className="p-4 text-slate-500">{c.booking_dates || 'N/A'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                          c.booking_status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {c.booking_status || 'Pending'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1">
                        {c.booking_status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateCorporate(c.corporate_booking_id, 'Approved')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-1 px-2.5 rounded text-[10px] uppercase transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateCorporate(c.corporate_booking_id, 'Rejected')}
                              className="bg-rose-150 hover:bg-rose-220 text-rose-800 font-bold p-1 px-2.5 rounded text-[10px] uppercase transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GUEST FEEDBACK & REVIEWS SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden" id="admin_feedback_section">
        <div className="p-5 border-b bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
              <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-200" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-950 uppercase tracking-widest">Guest Feedback & Reviews</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">All guest-submitted satisfaction ratings and comments — sorted by newest</p>
            </div>
          </div>
          <span className="text-[10px] bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold font-mono border border-amber-200">
            {(feedback || []).length} Review{(feedback || []).length !== 1 ? 's' : ''} Received
          </span>
        </div>

        {/* Summary Stat Cards */}
        {(feedback || []).length > 0 && (() => {
          const total = feedback.length;
          const avgRating = total > 0 ? (feedback.reduce((s, f) => s + Number(f.rating || 0), 0) / total).toFixed(1) : '0.0';
          const positive = feedback.filter(f => Number(f.rating) >= 4).length;
          const negative = feedback.filter(f => Number(f.rating) <= 2).length;
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-amber-50/30">
              <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-1 shadow-sm text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Feedback</p>
                <p className="text-2xl font-bold font-mono text-[#003366]">{total}</p>
                <p className="text-[9px] text-slate-400">submissions</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-amber-200 space-y-1 shadow-sm text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Average Rating</p>
                <p className="text-2xl font-bold font-mono text-amber-600">★ {avgRating}</p>
                <p className="text-[9px] text-slate-400">out of 5 stars</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-emerald-200 space-y-1 shadow-sm text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Positive Reviews</p>
                <p className="text-2xl font-bold font-mono text-emerald-600">{positive}</p>
                <p className="text-[9px] text-slate-400">rated 4–5 stars</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-rose-200 space-y-1 shadow-sm text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Negative Reviews</p>
                <p className="text-2xl font-bold font-mono text-rose-600">{negative}</p>
                <p className="text-[9px] text-slate-400">rated 1–2 stars</p>
              </div>
            </div>
          );
        })()}

        {/* Feedback Table */}
        {(feedback || []).length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs space-y-2">
            <Star className="h-9 w-9 mx-auto text-slate-200 stroke-1" />
            <p className="font-medium">No guest feedback submitted yet.</p>
            <p className="text-[10px] text-slate-400">Guest reviews will appear here once guests submit feedback from their dashboard.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs font-sans">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">Guest Name</th>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Feedback Comment</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...(feedback || [])].sort((a, b) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime()).map((f) => {
                  const stars = Number(f.rating) || 0;
                  const ratingColor = stars >= 4 ? 'text-emerald-600' : stars <= 2 ? 'text-rose-500' : 'text-amber-500';
                  const starLabel = stars >= 4 ? '🟢' : stars <= 2 ? '🔴' : '🟡';
                  return (
                    <tr key={f.feedback_id} className="hover:bg-amber-50/30 transition-colors group">
                      <td className="py-3 px-4 font-bold text-slate-800">{f.guest_name || 'Guest'}</td>
                      <td className="py-3 px-4">
                        {f.room_number ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            Room {f.room_number}
                          </span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                        {f.booking_id ? `BK-${f.booking_id}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <span className={`font-extrabold text-sm ${ratingColor}`}>
                            {'★'.repeat(stars)}{'☆'.repeat(Math.max(0, 5 - stars))}
                          </span>
                          <span className={`text-[10px] font-bold ${ratingColor}`}>{stars}/5</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-[220px]">
                        <span className="line-clamp-2 leading-relaxed" title={f.comments}>
                          {f.comments || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                        {f.check_in_date || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                        {f.check_out_date || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                        {f.submitted_at ? new Date(f.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          stars >= 4 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          stars <= 2 ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {starLabel} {stars >= 4 ? 'Positive' : stars <= 2 ? 'Negative' : 'Neutral'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PRIVATE GUEST CREDENTIALS MANAGER MODULE */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-4">
        <div>
          <span className="text-[10px] text-[#003366] font-mono font-bold uppercase block tracking-wider">Access Control Gateway</span>
          <h3 className="text-base font-bold text-slate-900 font-heading">Sai Nirvana Plaza Guest Security Registry</h3>
          <p className="text-xs text-slate-500">Formulate temporary credentials, register new guest names, and toggle live portal activation.</p>
        </div>
        <CreateGuestAccountForm currentRole={currentRole} />
      </div>

    </div>
  );
}
