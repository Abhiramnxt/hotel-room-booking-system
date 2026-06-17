/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserPlus, CheckCircle2, ShieldAlert, Key, Clipboard, 
  Send, Smartphone, Mail, AlertCircle, Shield, 
  ToggleLeft, ToggleRight, Loader2, RefreshCw, Search,
  X, Printer, Check, Copy, User, HelpCircle, Phone, FileText, Landmark, Trash2
} from 'lucide-react';
import { GuestAccount, CommunicationLog, UserRole } from '../types';
import { playSound } from '../soundUtils';

interface CreateGuestAccountFormProps {
  currentRole?: UserRole;
}

export function CreateGuestAccountForm({ currentRole = 'Front Desk Staff' }: CreateGuestAccountFormProps) {
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [stayDuration, setStayDuration] = useState('2 Nights');

  const formatDateToCompact = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[monthIdx] || parts[1];
    return `${day}-${monthName}-${year}`;
  };
  
  // Account state
  const [accounts, setAccounts] = useState<GuestAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Selected Guest Registry Tracking
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Blocked' | 'Pending'>('All');
  
  // Live actions feed
  const [dispatchingChannel, setDispatchingChannel] = useState<'WhatsApp' | 'Email' | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Polling ref for background checks
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const res = await fetch('/api/auth/guest-accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        
        // Update selected account references live if open
        if (selectedAccount) {
          const matching = (data.accounts || []).find((a: any) => a.account_id === selectedAccount.account_id);
          if (matching) setSelectedAccount(matching);
        }
      }
    } catch (e) {
      console.warn("Could not retrieve guest accounts list", e);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const fetchLogs = async (guestIdStr?: string) => {
    if (!guestIdStr) return;
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/auth/communication-logs?guest_id_str=${guestIdStr}`);
      if (res.ok) {
        const data = await res.json();
        setCommunicationLogs(data.logs || []);
      }
    } catch (err) {
      console.warn("Could not query transmission receipt logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Poll for status updates if logs are in Progress, Pending, or Retrying
  const startLogsPolling = (guestIdStr: string) => {
    if (pollingInterval.current) clearInterval(pollingInterval.current);
    
    pollingInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/communication-logs?guest_id_str=${guestIdStr}`);
        if (res.ok) {
          const data = await res.json();
          const logs = data.logs || [];
          setCommunicationLogs(logs);

          // Check if any log is currently in-progress
          const hasInflight = logs.some((l: CommunicationLog) => 
            l.status_info.includes('Progress') || 
            l.status_info.includes('Pending') || 
            l.status_info.includes('Retrying')
          );

          // Update main registry accounts listing as well
          const acRes = await fetch('/api/auth/guest-accounts');
          if (acRes.ok) {
            const acData = await acRes.json();
            setAccounts(acData.accounts || []);
            if (selectedAccount) {
              const matching = (acData.accounts || []).find((a: any) => a.account_id === selectedAccount.account_id);
              if (matching) setSelectedAccount(matching);
            }
          }

          if (!hasInflight) {
            if (pollingInterval.current) {
              clearInterval(pollingInterval.current);
              pollingInterval.current = null;
            }
          }
        }
      } catch (e) {
        console.warn("Polling communication logs error", e);
      }
    }, 1500);
  };

  useEffect(() => {
    fetchAccounts();
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  useEffect(() => {
    setCommunicationLogs([]);
    if (selectedAccount) {
      fetchLogs(selectedAccount.guest_id_str);
      // If there are ongoing transmissions, start polling right away
      startLogsPolling(selectedAccount.guest_id_str);
    } else {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    }
  }, [selectedAccount?.guest_id_str]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !mobileNumber || !email) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }
    
    setIsCreating(true);
    setErrorMsg('');
    playSound('confirm');

    try {
      const res = await fetch('/api/auth/guest-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          mobile_number: mobileNumber,
          email,
          stay_duration: stayDuration
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.account) {
          playSound('success');
          setFullName('');
          setMobileNumber('');
          setEmail('');
          
          await fetchAccounts();
          setSelectedAccount(data.account); // Focus on newly created guest account!
          
          setSuccessToast("Credentials generated successfully!");
          setTimeout(() => setSuccessToast(''), 4000);
        } else {
          setErrorMsg(data.error || "Failed to generate account credentials.");
        }
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Server responded with an error.");
      }
    } catch (e: any) {
      setErrorMsg("Network error trying to contact credentials index gateway.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (account_id: number) => {
    playSound('click');
    try {
      const res = await fetch('/api/auth/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id })
      });
      if (res.ok) {
        playSound('success');
        fetchAccounts();
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDeleteAccount = async (account_id: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this guest account?")) return;
    playSound('confirm');
    try {
      const res = await fetch(`/api/auth/guest-accounts/${account_id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        playSound('success');
        await fetchAccounts();
        if (selectedAccount && selectedAccount.account_id === account_id) {
          setSelectedAccount(null);
        }
        setSuccessToast("Guest account deleted successfully.");
        setTimeout(() => setSuccessToast(''), 4000);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete guest account.");
      }
    } catch (e) {
      console.warn(e);
      alert("Network error trying to delete guest account.");
    }
  };

  const handleCopyCredentials = (acc: any) => {
    playSound('tap');
    const voucher = `SAI NIRVANA PLAZA - GUEST DIGITAL PASS\n===================================\nGuest ID: ${acc.guest_id_str}\nFull Name: ${acc.full_name}\nUsername/Login ID: ${acc.username}\nTemp Password: ${acc.password_hash}\nAccount Status: ${acc.is_activated ? 'ACTIVATED' : 'DEACTIVATED'}\n-----------------------------------\nAccess Gateway: ${window.location.origin}\nNote: Change password on your first login.\n===================================`;
    navigator.clipboard.writeText(voucher);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  const handleDispatch = async (channel: 'WhatsApp' | 'Email', acc: any) => {
    playSound('dispatch');
    setDispatchingChannel(channel);
    try {
      const res = await fetch('/api/auth/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: acc.account_id,
          channel,
          staff_member: "Reception Desk Admin"
        })
      });

      if (res.ok) {
        playSound('success');
        // Instantly reload and poll logs to show dynamic live progression!
        fetchLogs(acc.guest_id_str);
        startLogsPolling(acc.guest_id_str);
      } else {
        alert("Message delivery failed.");
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setDispatchingChannel(null);
    }
  };

  const handleRegenerate = async (acc: any) => {
    if (!window.confirm(`Are you sure you want to regenerate security credentials for ${acc.full_name}? This will assign a fresh random password hash.`)) return;
    playSound('confirm');
    try {
      const res = await fetch('/api/auth/regenerate-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: acc.account_id })
      });
      if (res.ok) {
        playSound('success');
        const data = await res.json();
        if (data.success) {
          fetchAccounts();
          setSelectedAccount(data.account);
          setSuccessToast("Credentials regenerated safely!");
          setTimeout(() => setSuccessToast(''), 4000);
        }
      }
    } catch (err) {
      console.warn("Credentials regeneration error:", err);
    }
  };

  const handlePrint = (acc: any) => {
    playSound('print');
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
        <head>
          <title>Guest Access credentials - Sai Nirvana Plaza</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 40px; color: #111; line-height: 1.6; }
            .ticket { border: 3px double #333; padding: 30px; max-width: 500px; margin: 0 auto; text-align: center; }
            .header { font-size: 18px; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; border-bottom: 2px solid #555; padding-bottom: 10px; }
            .field { text-align: left; margin: 15px 0; font-size: 14px; }
            .label { font-weight: bold; color: #555; display: inline-block; width: 150px; }
            .value { font-weight: bold; font-size: 16px; color: #000; }
            .footer { margin-top: 35px; border-top: 1px dashed #777; padding-top: 15px; font-size: 11px; color: #666; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">SAI NIRVANA PLAZA<br><span style="font-size: 12px; font-weight: normal;">Exclusive Private Entry Pass</span></div>
            <div class="field"><span class="label">GUEST NAME:</span><span class="value">${acc.full_name}</span></div>
            <div class="field"><span class="label">GUEST ID:</span><span class="value" style="color: #003366;">${acc.guest_id_str}</span></div>
            <div class="field"><span class="label">USERNAME:</span><span class="value" style="color: #003366;">${acc.username}</span></div>
            <div class="field"><span class="label">TEMP PASSWORD:</span><span class="value" style="background:#ddd; padding:2px 8px;">${acc.password_hash}</span></div>
            <div class="field"><span class="label">ACCESS PORTAL:</span><span class="value">${window.location.origin}</span></div>
            <div class="footer">
              First login requires password configuration. Under Sri Nirvana administrative protocols, this document is strictly confidential and must not be shared.
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Filter & Search accounts log
  const filteredAccounts = React.useMemo(() => {
    return accounts.filter(acc => {
      const matchesSearch = 
        acc.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.guest_id_str.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.mobile_number.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = 
        statusFilter === 'All' ||
        (statusFilter === 'Active' && acc.is_activated) ||
        (statusFilter === 'Blocked' && !acc.is_activated) ||
        (statusFilter === 'Pending' && !acc.first_login_password_changed);

      return matchesSearch && matchesFilter;
    });
  }, [accounts, searchQuery, statusFilter]);

  if (['Housekeeping Staff', 'Housekeeping Team', 'Accounts Staff'].includes(currentRole)) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-805 text-xs p-5 rounded-2xl flex items-start gap-3 shadow-sm" id="auth_restriction_note">
        <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-sm uppercase tracking-wide">Security Access Restriction</h4>
          <p className="text-slate-600 leading-normal">
            Your current assigned department role (<strong>{currentRole}</strong>) is not authorized to access or view guest login credentials and security records.
          </p>
        </div>
      </div>
    );
  }

  const canCreate = currentRole === 'Front Desk Staff';

  return (
    <div className="space-y-6" id="guest_accounts_engine_wrapper">
      
      {successToast && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50 bg-[#003366] text-white border border-[#D4AF37]/50 py-3 px-5 rounded-xl shadow-2xl flex items-center gap-2"
        >
          <CheckCircle2 className="h-5 w-5 text-[#F9D976]" />
          <span className="text-xs font-bold font-sans">{successToast}</span>
        </motion.div>
      )}

      {/* Grid Dashboard */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Create Guest Access Pass Form */}
        {canCreate && (
          <div className="xl:col-span-3 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-5" id="sec_create_acc_form">
          <div className="flex items-center gap-2.5 border-b pb-3 border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-[#003366]/5 flex items-center justify-center border border-[#003366]/10">
              <UserPlus className="h-5 w-5 text-[#003366]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 font-heading">Provision Guest Pass</h4>
              <p className="text-[10px] text-slate-500">Generate credentials for verified entrants</p>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">GUEST REGISTRATION FULL NAME *</label>
              <input 
                type="text" required
                value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Abhiram Thunikipati"
                className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:border-[#003366] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">MOBILE NUMBER *</label>
                <input 
                  type="tel" required
                  value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:border-[#003366] focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">EMAIL ADDRESS *</label>
                <input 
                  type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. abhiram@domain.com"
                  className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:border-[#003366] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">PROPOSED STAY DURATION</label>
              <select
                value={stayDuration} onChange={(e) => setStayDuration(e.target.value)}
                className="w-full text-[11px] p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:border-[#003366] cursor-pointer"
              >
                <option value="1 Night">1 Night Stay</option>
                <option value="2 Nights">2 Nights Stay</option>
                <option value="3 Nights">3 Nights Stay</option>
                <option value="5 Nights">5 Nights Retreat</option>
                <option value="7 Nights">1 Week Elite</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full bg-[#003366] hover:bg-[#001f3f] text-white text-xs font-bold py-3 rounded-xl tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-[#003366]/10"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Configuring guest security keys...</span>
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 text-[#F9D976]" />
                  <span>Generate Guest Credentials</span>
                </>
              )}
            </button>
          </form>

          <div className="bg-slate-50 border p-4 rounded-xl space-y-2 text-[10px] leading-relaxed text-slate-500">
            <span className="font-bold text-slate-600 block uppercase tracking-wider">🔒 Anti-Fraud Security Directive</span>
            <p>Ensure government photo ID matches applicant's full name, and mobile corresponds to an active SIM before issuing logins.</p>
          </div>
        </div>
        )}

        {/* Right Side: Registry Table & Slide In Details Panel */}
        <div className={canCreate ? "xl:col-span-9 space-y-5" : "xl:col-span-12 space-y-5"}>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-4" id="registries_holder">
            
            {/* Header & Control Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                  <Shield className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-heading">Guest Credential Registry</h4>
                  <p className="text-[10px] text-slate-500">Approved entrants, live activation statuses, and delivery telemetry</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <button 
                  onClick={fetchAccounts}
                  className="p-2 sm:p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors border border-slate-200 cursor-pointer"
                  title="Refresh Database Index Logs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Hub */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Guest Name, ID, Phone, Email..."
                  className="w-full text-xs pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#003366]"
                />
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {(['All', 'Active', 'Blocked', 'Pending'] as const).map((fil) => (
                  <button
                    key={fil}
                    onClick={() => { playSound('tap'); setStatusFilter(fil); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                      statusFilter === fil 
                        ? 'bg-[#003366] text-white' 
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {fil === 'Pending' ? 'Change Pending' : fil}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Accounts Table */}
            {isLoadingAccounts && accounts.length === 0 ? (
              <div className="py-6 space-y-3 animate-pulse" id="accounts_registry_skeleton">
                <div className="grid grid-cols-6 gap-3 border-b pb-2">
                  <div className="h-4 bg-slate-200 rounded col-span-1"></div>
                  <div className="h-4 bg-slate-200 rounded col-span-2"></div>
                  <div className="h-4 bg-slate-200 rounded col-span-1"></div>
                  <div className="h-4 bg-slate-200 rounded col-span-1"></div>
                  <div className="h-4 bg-slate-200 rounded col-span-1"></div>
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="grid grid-cols-6 gap-3 py-2 border-b border-slate-100">
                    <div className="h-3 bg-slate-100/80 rounded col-span-1"></div>
                    <div className="h-3 bg-slate-100/80 rounded col-span-2"></div>
                    <div className="h-3 bg-slate-100/80 rounded col-span-1"></div>
                    <div className="h-3 bg-slate-100/80 rounded col-span-1"></div>
                    <div className="h-3 bg-slate-100/80 rounded col-span-1"></div>
                  </div>
                ))}
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="py-24 text-center text-xs text-slate-400 space-y-2 border-2 border-dashed border-slate-100 rounded-xl">
                <Landmark className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="font-medium">No hotel guests found matching search queries.</p>
                <p className="text-[10px] text-slate-400">Wait for a guest, or generate a credentials register using the left panel.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-[10px] border-collapse table-fixed min-w-[720px]">
                  <colgroup>
                    <col className="w-[17%]" />
                    <col className="w-[20%]" />
                    <col className="w-[11%]" />
                    <col className="w-[14%]" />
                    <col className="w-[15%]" />
                    <col className="w-[23%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                      <th className="py-2 px-2">Entrant ID / Name</th>
                      <th className="py-2 px-2">Contact Information</th>
                      <th className="py-2 px-2 text-center">Assigned Room</th>
                      <th className="py-2 px-2">Stay Timeline</th>
                      <th className="py-2 px-2 text-center">Credential / Status</th>
                      <th className="py-2 px-2 text-right">Access Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAccounts.map((acc) => {
                      const isTargeted = selectedAccount?.account_id === acc.account_id;
                      return (
                        <tr 
                          key={acc.account_id} 
                          onClick={() => { playSound('tap'); setSelectedAccount(acc); }}
                          className={`group transition-all cursor-pointer ${
                            isTargeted 
                              ? 'bg-[#003366]/5 font-bold border-l-2 border-[#003366]' 
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2 px-2 align-middle">
                            <div className="font-mono text-[9px] text-[#003366] font-extrabold">{acc.guest_id_str}</div>
                            <div className="font-sans font-bold text-slate-900 group-hover:text-[#003366] transition-colors break-words mt-0.5">{acc.full_name}</div>
                          </td>
                          <td className="py-2 px-2 align-middle font-mono text-[10px] text-slate-600 leading-tight">
                            <div className="whitespace-nowrap">{acc.mobile_number}</div>
                            <div className="text-[9px] text-slate-400 break-all select-all mt-0.5">{acc.email}</div>
                          </td>
                          <td className="py-2 px-2 align-middle text-center font-medium text-slate-700">
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-sans font-bold custom-badge-room-no ${
                              acc.room_number !== 'Not Booked'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              {acc.room_number}
                            </span>
                          </td>
                          <td className="py-2 px-2 align-middle text-[10px] font-semibold text-slate-600 leading-tight">
                            <div className="whitespace-nowrap">IN: <span className="font-mono text-slate-900">{formatDateToCompact(acc.check_in_date)}</span></div>
                            <div className="text-[9px] text-slate-400 whitespace-nowrap mt-0.5">OUT: <span className="font-mono text-slate-500">{formatDateToCompact(acc.check_out_date)}</span></div>
                          </td>
                          <td className="py-2 px-2 align-middle text-center">
                            <div className="flex items-center justify-center">
                              {(() => {
                                let label = 'PENDING RESET';
                                let badgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
                                
                                if (acc.first_login_password_changed) {
                                  if (acc.is_activated) {
                                    label = 'ACTIVE';
                                    badgeClass = 'custom-badge-active bg-emerald-50 text-emerald-800 border-emerald-200';
                                  } else {
                                    label = 'CHANGED';
                                    badgeClass = 'custom-badge-changed bg-emerald-50 text-emerald-800 border-emerald-200';
                                  }
                                }
                                
                                return (
                                  <span className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide border rounded whitespace-nowrap ${badgeClass}`}>
                                    {label}
                                  </span>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="py-2 px-2 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 flex-nowrap">
                              {canCreate ? (
                                <>
                                  <button
                                    onClick={() => handleToggleStatus(acc.account_id)}
                                    className={`inline-flex items-center justify-center gap-0.5 h-6 px-1.5 rounded-md border transition-all cursor-pointer whitespace-nowrap text-[9px] font-bold font-sans ${
                                      acc.is_activated 
                                        ? 'custom-badge-active bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 text-emerald-700 border-emerald-200/50' 
                                        : 'bg-rose-50 hover:bg-rose-100 hover:text-rose-800 text-rose-700 border-rose-200'
                                    }`}
                                    title={acc.is_activated ? "Deactivate Account" : "Activate Account"}
                                  >
                                    {acc.is_activated ? (
                                      <>
                                        <ToggleRight className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>Active</span>
                                      </>
                                    ) : (
                                      <>
                                        <ToggleLeft className="h-3.5 w-3.5 text-rose-600" />
                                        <span>Blocked</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAccount(acc.account_id)}
                                    className="inline-flex items-center justify-center gap-0.5 h-6 px-1.5 rounded-md border border-rose-200 text-rose-700 bg-rose-50/50 cursor-pointer transition-all duration-300 hover:bg-gradient-to-r hover:from-rose-500 hover:to-rose-700 hover:text-white hover:border-transparent hover:shadow-md whitespace-nowrap text-[9px] font-bold font-sans"
                                    title="Delete Account"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Delete</span>
                                  </button>
                                </>
                              ) : (
                                <span className={`inline-flex items-center justify-center gap-0.5 h-6 px-1.5 rounded-md border select-none whitespace-nowrap text-[9px] font-bold font-sans ${
                                  acc.is_activated 
                                    ? 'custom-badge-active bg-emerald-50 text-emerald-700/80 border-emerald-200/50' 
                                    : 'bg-rose-50 text-rose-700/80 border-rose-200/50'
                                }`}>
                                  {acc.is_activated ? "Active" : "Blocked"}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Collapsible Guest Information Panel & Dispatch Control Card */}
          <AnimatePresence>
            {selectedAccount && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-gradient-to-tr from-slate-900 via-slate-850 to-indigo-950 p-6 rounded-2xl border-2 border-[#D4AF37]/35 text-white space-y-6 shadow-xl relative"
                id="guest_detailed_panel"
              >
                <button
                  onClick={() => { playSound('click'); setSelectedAccount(null); }}
                  className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/15 rounded-lg text-slate-300 transition-colors border border-white/10 cursor-pointer"
                  title="Close Detail Board"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Grid info details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-white/15">
                  
                  {/* Guest General Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/15 pb-2">
                      <User className="h-4 w-4 text-[#F9D976]" />
                      <h5 className="text-xs font-bold text-[#F9D976] uppercase tracking-wider">Guest Information</h5>
                    </div>
                    
                    <div className="space-y-2 font-mono text-[11px] text-slate-300">
                      <p className="flex justify-between"><span className="text-slate-400">Guest Name:</span> <strong className="text-white font-sans">{selectedAccount.full_name}</strong></p>
                      <p className="flex justify-between"><span className="text-slate-400">Mobile Number:</span> <strong className="text-white">{selectedAccount.mobile_number}</strong></p>
                      <p className="flex justify-between"><span className="text-slate-400">Email Address:</span> <strong className="text-white">{selectedAccount.email}</strong></p>
                      <p className="flex justify-between"><span className="text-slate-400">Stay Timeline:</span> <strong className="text-[#F9D976]">{selectedAccount.stay_duration}</strong></p>
                      <p className="flex justify-between"><span className="text-slate-400">Assigned Room:</span> <strong className="text-white font-sans">{selectedAccount.room_number}</strong></p>
                    </div>
                  </div>

                  {/* Operational Security Credentials */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/15 pb-2">
                      <Key className="h-4 w-4 text-[#F9D976]" />
                      <h5 className="text-xs font-bold text-[#F9D976] uppercase tracking-wider">Passcode Credentials</h5>
                    </div>
                    
                    <div className="space-y-2 font-mono text-[11px] text-slate-300">
                      <p className="flex justify-between"><span className="text-slate-400">Guest Access ID:</span> <strong className="text-[#F9D976]">{selectedAccount.guest_id_str}</strong></p>
                      <p className="flex justify-between"><span className="text-slate-400">Username/Login:</span> <strong className="text-[#F9D976]">{selectedAccount.username}</strong></p>
                      <p className="flex justify-between"><span className="text-slate-400">Temp Password:</span> <strong className="text-rose-300 bg-rose-500/15 border border-rose-500/25 px-1.5 py-0.5 rounded">{selectedAccount.password_hash}</strong></p>
                      <p className="flex justify-between"><span className="text-slate-400">Reset Status:</span> <strong className={selectedAccount.first_login_password_changed ? 'text-emerald-400' : 'text-amber-400'}>{selectedAccount.first_login_password_changed ? 'COMPLETED' : 'RESET REQUIRED'}</strong></p>
                      <p className="flex justify-between"><span className="text-slate-400">Active Access:</span> <strong className={selectedAccount.is_activated ? 'text-emerald-400' : 'text-rose-400'}>{selectedAccount.is_activated ? 'GRANTED' : 'BLOCKED/SUSPENDED'}</strong></p>
                    </div>
                  </div>
                </div>

                {/* DISPATCH MODULE & ACTIONS COUPLER */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Dispatch Credentials Hub</span>
                    <span className="text-[9px] text-[#F9D976] bg-amber-500/10 border border-[#D4AF37]/35 py-0.5 px-2 rounded font-mono font-bold animate-pulse">APIs Ready</span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {canCreate && (
                      <button 
                        onClick={() => handleDispatch('WhatsApp', selectedAccount)}
                        disabled={dispatchingChannel !== null}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 p-3 rounded-xl transition-all flex flex-col items-center gap-1.5 cursor-pointer text-center group"
                      >
                        <Smartphone className="h-4.5 w-4.5 text-emerald-400 group-hover:scale-115 transition-transform" />
                        <span className="text-[9px] font-extrabold uppercase">WhatsApp</span>
                      </button>
                    )}

                    {canCreate && (
                      <button 
                        onClick={() => handleDispatch('Email', selectedAccount)}
                        disabled={dispatchingChannel !== null}
                        className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/35 p-3 rounded-xl transition-all flex flex-col items-center gap-1.5 cursor-pointer text-center group"
                      >
                        <Mail className="h-4.5 w-4.5 text-sky-400 group-hover:scale-115 transition-transform" />
                        <span className="text-[9px] font-extrabold uppercase">Email Portal</span>
                      </button>
                    )}

                    <button 
                      onClick={() => handleCopyCredentials(selectedAccount)}
                      className="bg-slate-500/12 hover:bg-slate-500/20 text-slate-300 border border-slate-500/25 p-3 rounded-xl transition-all flex flex-col items-center gap-1.5 cursor-pointer text-center group"
                    >
                      {copiedText ? (
                        <>
                          <Check className="h-4.5 w-4.5 text-[#F9D976]" />
                          <span className="text-[9px] font-extrabold uppercase text-[#F9D976]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4.5 w-4.5 text-slate-400 group-hover:scale-115 transition-transform" />
                          <span className="text-[9px] font-extrabold uppercase">Copy Voucher</span>
                        </>
                      )}
                    </button>

                    <button 
                      onClick={() => handlePrint(selectedAccount)}
                      className="bg-slate-500/12 hover:bg-slate-500/20 text-slate-300 border border-slate-500/25 p-3 rounded-xl transition-all flex flex-col items-center gap-1.5 cursor-pointer text-center group"
                    >
                      <Printer className="h-4.5 w-4.5 text-slate-400 group-hover:scale-115 transition-transform" />
                      <span className="text-[9px] font-extrabold uppercase">Local Print</span>
                    </button>

                    {canCreate && (
                      <button 
                        onClick={() => handleRegenerate(selectedAccount)}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/35 p-3 rounded-xl transition-all flex flex-col items-center gap-1.5 cursor-pointer text-center group font-bold"
                      >
                        <RefreshCw className="h-4.5 w-4.5 text-rose-400 group-hover:rotate-180 transition-transform duration-500" />
                        <span className="text-[9px] font-extrabold uppercase">Reset Keys</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* LIVE COMMUNICATION TRANSACTION LOGS TABLE */}
                <div className="space-y-3 bg-black/35 p-4 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      <h6 className="text-[10px] font-bold uppercase tracking-wider text-[#F9D976]">Live Communication History Delivery Logs</h6>
                    </div>
                    
                    <button
                      onClick={() => { playSound('tap'); fetchLogs(selectedAccount.guest_id_str); }}
                      className="text-[9px] font-extrabold uppercase flex items-center gap-1 bg-white/5 hover:bg-white/15 px-2 py-1 rounded transition-all text-slate-300 border border-white/10 select-none cursor-pointer"
                    >
                      <RefreshCw className={`h-2.5 w-2.5 ${logsLoading ? 'animate-spin' : ''}`} />
                      <span>Refresh Telemetry</span>
                    </button>
                  </div>

                  {logsLoading && communicationLogs.length === 0 ? (
                    <div className="py-4 space-y-2 animate-pulse" id="telemetry_logs_skeleton">
                      <div className="grid grid-cols-6 gap-2">
                        <div className="h-3 bg-white/10 rounded col-span-1"></div>
                        <div className="h-3 bg-white/10 rounded col-span-1"></div>
                        <div className="h-3 bg-white/10 rounded col-span-2"></div>
                        <div className="h-3 bg-white/10 rounded col-span-1"></div>
                        <div className="h-3 bg-white/10 rounded col-span-1"></div>
                      </div>
                      <div className="h-[1px] bg-white/5 my-1"></div>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="grid grid-cols-6 gap-2 pt-1">
                          <div className="h-3 bg-white/5 rounded col-span-1"></div>
                          <div className="h-3 bg-white/5 rounded col-span-1"></div>
                          <div className="h-3 bg-white/5 rounded col-span-2"></div>
                          <div className="h-3 bg-white/5 rounded col-span-1"></div>
                          <div className="h-3 bg-white/5 rounded col-span-1"></div>
                        </div>
                      ))}
                    </div>
                  ) : communicationLogs.length === 0 ? (
                    <div className="py-8 text-center text-[10px] text-slate-500">
                      No communications issued for this guest account yet. Click WhatsApp or Email above to dispatch digital credentials live.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-[9px] text-[#A5C3E6]">
                        <thead>
                          <tr className="border-b border-white/5 text-slate-400 font-bold uppercase text-[8px] tracking-wider">
                            <th className="py-1.5 px-2">Channel</th>
                            <th className="py-1.5 px-2">Sender Agent</th>
                            <th className="py-1.5 px-2">Delivery Status</th>
                            <th className="py-1.5 px-2">Timestamp</th>
                            <th className="py-1.5 px-2">Attempts</th>
                            <th className="py-1.5 px-2 text-right">Reason/Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {communicationLogs.map((log) => {
                            // Style status line appropriately
                            let status_indicator = "🟡";
                            let style_class = "text-amber-400";
                            if (log.status_info.includes("Successfully")) {
                              status_indicator = "🟢";
                              style_class = "text-emerald-400 font-bold";
                            } else if (log.status_info.includes("Failed")) {
                              status_indicator = "🔴";
                              style_class = "text-rose-400 font-bold";
                            } else if (log.status_info.includes("Progress")) {
                              status_indicator = "🔵";
                              style_class = "text-cyan-400 animate-pulse font-semibold";
                            } else if (log.status_info.includes("Retrying")) {
                              status_indicator = "🟠";
                              style_class = "text-amber-500 animate-pulse font-semibold";
                            }

                            return (
                              <tr key={log.log_id} className="hover:bg-white/5 font-mono text-slate-300">
                                <td className="py-1.5 px-2 text-white font-sans font-bold">{log.channel}</td>
                                <td className="py-1.5 px-2 font-sans">{log.staff_member}</td>
                                <td className="py-1.5 px-2">
                                  <span className={style_class}>{status_indicator} {log.status_info}</span>
                                </td>
                                <td className="py-1.5 px-2 text-slate-400">{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</td>
                                <td className="py-1.5 px-2 font-bold text-center text-white">{log.delivery_attempts}</td>
                                <td className="py-1.5 px-2 text-right text-[8px] text-rose-300 max-w-[150px] truncate" title={log.failure_reason}>
                                  {log.failure_reason || <span className="text-slate-500">-</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-[8px] text-slate-500 mt-1 leading-normal">
                    * Cellular carrier status updates may take up to 2 seconds to complete the loop routing back to our MySQL logging system. Direct Retries will queue Alternate Gateways automatically.
                  </p>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

    </div>
  );
}
