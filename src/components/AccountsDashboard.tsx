/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, Landmark, ShieldCheck, RefreshCw, FileText, 
  TrendingUp, CircleDollarSign, CheckCircle2, AlertTriangle, 
  Search, PlaySquare, ListFilter, RotateCcw
} from 'lucide-react';
import { playSound } from '../soundUtils';

interface PaymentExtended {
  payment_id: number;
  booking_id: number;
  amount: number;
  gst_amount: number;
  payment_method: 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Cash';
  payment_status: 'Pending' | 'Paid' | 'Refunded';
  transaction_reference: string;
  payment_date: string;
}

export function AccountsDashboard() {
  const [payments, setPayments] = useState<PaymentExtended[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending' | 'Refunded'>('All');
  
  // Local Audit Logs for action history
  const [auditLogs, setAuditLogs] = useState<any[]>([
    { id: 1, action: "GST Report generated", user: "Accounts Officer", date: new Date().toISOString() },
    { id: 2, action: "Invoice #104 status reconciled", user: "Accounts Officer", date: new Date().toISOString() }
  ]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/payments');
      if (res.ok) {
        const data = await res.json();
        const formatted = (data.payments || []).map((p: any) => ({
          ...p,
          amount: Number(p.amount) || 0,
          gst_amount: Number(p.gst_amount) || 0
        }));
        setPayments(formatted);
      }
    } catch (e) {
      console.warn("Could not retrieve payment matrices:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleUpdatePaymentStatus = async (paymentId: number, nextStatus: 'Paid' | 'Refunded' | 'Pending') => {
    playSound('click');
    try {
      const res = await fetch(`/api/payments/${paymentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        playSound('success');
        
        // Log transaction action
        const newLog = {
          id: auditLogs.length + 1,
          action: `Payment ID #${paymentId} marked as ${nextStatus}`,
          user: "Accounts Officer",
          date: new Date().toISOString()
        };
        setAuditLogs(prev => [newLog, ...prev]);
        fetchPayments();
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Filtered Payments
  const filteredPayments = React.useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = p.transaction_reference.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            String(p.booking_id).includes(searchQuery) ||
                            p.payment_method.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' ? true : p.payment_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [payments, searchQuery, statusFilter]);

  // Calculate aggregates
  const { totalReceived, totalGST, totalPending } = React.useMemo(() => {
    const paidPayments = payments.filter(p => p.payment_status === 'Paid');
    const totalReceived = paidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalGST = paidPayments.reduce((sum, p) => sum + Number(p.gst_amount || 0), 0);
    const totalPending = payments
      .filter(p => p.payment_status === 'Pending')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return { totalReceived, totalGST, totalPending };
  }, [payments]);

  return (
    <div className="space-y-6 animate-fade-in" id="accounts_staff_dashboard">
      
      {/* Search Header panel */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow">
        <div>
          <span className="text-[10px] text-amber-600 font-mono font-bold uppercase block tracking-wider">Accounting Division</span>
          <h4 className="text-base font-bold text-slate-900 font-heading">
            Taxes, Audit and Payments Registry
          </h4>
          <p className="text-xs text-slate-500 mt-1">Review active invoices, file GST Slab reports, or process payment refunds.</p>
        </div>

        <button
          onClick={() => { playSound('tap'); fetchPayments(); }}
          className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 animate-pulse-subtle"
          id="btn_refresh_payments_desk"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Sync Ledger Records</span>
        </button>
      </div>

      {/* METRICS COUNT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col justify-between bg-gradient-to-br from-[#001f3f] to-[#003366] text-white rounded-2xl p-5 shadow-lg border border-[#D4AF37]/35 min-h-[140px] w-full overflow-hidden">
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider truncate">Total Received (Gross)</span>
              <CircleDollarSign className="h-5 w-5 text-[#F9D976] shrink-0" />
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black font-mono text-[#F9D976] truncate" title={`₹${totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
              ₹{totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-[10px] text-emerald-450 font-mono mt-4 truncate">🟢 Verified bank-node transaction references</p>
        </div>

        <div className="flex flex-col justify-between bg-white text-slate-900 rounded-2xl p-5 border border-[#D4AF37]/20 border-l-4 border-l-[#003366] shadow-sm min-h-[140px] w-full overflow-hidden">
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">Taxes Collected (GST)</span>
              <Landmark className="h-5 w-5 text-[#003366] shrink-0" />
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black font-mono text-[#003366] truncate" title={`₹${totalGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
              ₹{totalGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-[10px] text-slate-500 mt-4 truncate">18% Standard Lodging & 12% Room Services</p>
        </div>

        <div className="flex flex-col justify-between bg-white text-slate-900 rounded-2xl p-5 border border-[#D4AF37]/20 border-l-4 border-l-slate-400 shadow-sm min-h-[140px] w-full overflow-hidden">
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">Pending Reconciliations</span>
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black font-mono text-slate-800 truncate" title={`₹${totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
              ₹{totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-[10px] text-amber-600 mt-4 truncate">UPI/Card holds pending clearance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Ledger & Payments List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <h4 className="text-sm font-bold text-slate-950 uppercase tracking-widest truncate">
              Physical Invoices & Transaction Log
            </h4>
            
            {/* Filter Controllers */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Txn ID, Booking ID, Mode"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#003366] text-slate-800"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="py-1.5 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none"
              >
                <option value="All">All Invoices</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Syncing transaction registry...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching accounts records in database schema.
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[700px] text-left text-xs table-layout-fixed">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b">
                    <th className="p-3 w-24">Payment ID</th>
                    <th className="p-3 w-32">Booking ID</th>
                    <th className="p-3 w-28">Method</th>
                    <th className="p-3 w-36">Base Unit</th>
                    <th className="p-3 w-36">GST (12%/18%)</th>
                    <th className="p-3 w-40">Gross Total</th>
                    <th className="p-3 w-36">Cleared Status</th>
                    <th className="p-3 text-right w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredPayments.map(p => (
                    <tr key={p.payment_id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-[#003366]">#{p.payment_id}</td>
                      <td className="p-3 font-mono text-slate-500">Booking #{p.booking_id}</td>
                      <td className="p-3 font-semibold text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{p.payment_method}</span>
                      </td>
                      <td className="p-3 font-mono">₹{Number(p.amount - p.gst_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3 font-mono text-slate-400">₹{Number(p.gst_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.payment_status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : p.payment_status === 'Pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            p.payment_status === 'Paid' ? 'bg-emerald-500' : p.payment_status === 'Pending' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          {p.payment_status}
                        </span>
                      </td>
                      <td className="p-3 text-right gap-1.5 flex justify-end">
                        {p.payment_status !== 'Paid' && (
                          <button
                            onClick={() => handleUpdatePaymentStatus(p.payment_id, 'Paid')}
                            className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-1 px-2 rounded cursor-pointer"
                          >
                            Mark Paid
                          </button>
                        )}
                        {p.payment_status === 'Paid' && (
                          <button
                            onClick={() => handleUpdatePaymentStatus(p.payment_id, 'Refunded')}
                            className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold p-1 px-2 rounded cursor-pointer border border-amber-200"
                          >
                            Refund txn
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* GST Slab Diagnostics & Action History */}
        <div className="space-y-6">
          
          {/* GST Ledger standard slabs */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-4">
            <h4 className="text-sm font-bold text-[#003366] uppercase tracking-widest flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>GST Slab Audit Compliance</span>
            </h4>
            <div className="space-y-3 text-xs leading-normal">
              <div className="border border-slate-100 rounded-xl p-3 bg-slate-50 space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Luxury Lodging Standard</span>
                  <span className="text-[#003366]">18% GST</span>
                </div>
                <p className="text-[11px] text-slate-500">Applies to clean room bookings with tariffs greater than ₹2,000 per night.</p>
              </div>

              <div className="border border-slate-100 rounded-xl p-3 bg-slate-50 space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Room Services & Amenities</span>
                  <span className="text-[#003366]">12% GST</span>
                </div>
                <p className="text-[11px] text-slate-500">Applies to food items ordered, laundry services, and high-speed internet requests.</p>
              </div>
            </div>
          </div>

          {/* Action History Log */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-950 uppercase tracking-widest">
              Accounting Action History
            </h4>
            <div className="space-y-3">
              {auditLogs.map(log => (
                <div key={log.id} className="border-l-2 border-[#003366] pl-3 py-0.5 text-xs">
                  <p className="font-semibold text-slate-800">{log.action}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 font-mono">
                    <span>Officer: {log.user}</span>
                    <span>•</span>
                    <span>{new Date(log.date).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
