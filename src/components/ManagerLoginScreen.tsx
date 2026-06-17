/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, User, ShieldAlert, KeyRound, CheckSquare, 
  Eye, EyeOff, Loader2, ArrowLeft, ShieldCheck, Terminal,
  ClipboardList, Landmark, ChevronDown
} from 'lucide-react';
import { playSound } from '../soundUtils';
import { UserRole } from '../types';

interface ManagerLoginScreenProps {
  onSuccess: (selectedRole?: UserRole) => void;
  onBack: () => void;
}

export function ManagerLoginScreen({ onSuccess, onBack }: ManagerLoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Local active role chosen to authenticate into (compact dropdown)
  const [targetRole, setTargetRole] = useState<UserRole>('Hotel Manager');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const rolesList: { value: UserRole; label: string; icon: React.ComponentType<any>; color: string }[] = [
    { value: 'Front Desk Staff', label: 'Front Desk', icon: ClipboardList, color: 'text-[#0F172A]' },
    { value: 'Hotel Manager', label: 'Manager', icon: ShieldCheck, color: 'text-[#0F172A]' },
    { value: 'Housekeeping Team', label: 'Guest Services', icon: CheckSquare, color: 'text-[#0F172A]' },
    { value: 'Accounts Staff', label: 'Accounts', icon: Landmark, color: 'text-[#0F172A]' }
  ];

  const activeRoleObj = rolesList.find(r => r.value === targetRole) || rolesList[1];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg("Please fill in both Manager Username and Password.");
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    playSound('click');

    // Simulate database lookup network latency for operational feel
    setTimeout(() => {
      if (username === 'SAINIRVANAPLAZA0533' && password === 'plaza123456') {
        playSound('success');
        onSuccess(targetRole);
      } else {
        playSound('click');
        setErrorMsg("Access Denied: The Sri Nirvana security database did not recognize this manager signature.");
        setIsLoading(false);
      }
    }, 1100);
  };

  return (
    <div className="max-w-md mx-auto py-10" id="manager_private_auth_container">
      
      {/* Return Navigation Anchor */}
      <div className="mb-6 flex justify-start">
        <button
          onClick={() => { playSound('tap'); onBack(); }}
          className="text-xs font-bold text-[#0F172A] hover:text-[#0F172A]/80 bg-white hover:bg-slate-50 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 border border-slate-200 cursor-pointer shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Homepage</span>
        </button>
      </div>

      <motion.div 
         initial={{ opacity: 0, y: 15 }}
         animate={{ opacity: 1, y: 0 }}
         className="bg-white text-[#0F172A] rounded-3xl border-t-4 border-t-[#D4AF37] border border-slate-200 p-8 shadow-2xl space-y-6"
         id="card_manager_login_form"
      >
        <div className="space-y-3 pb-4 border-b border-slate-100 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="h-5 w-5 text-[#D4AF37]" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#D4AF37]">Administrative Division</span>
            <h3 className="text-xl font-extrabold font-heading text-[#0F172A] mt-1">Manager Secure Login</h3>
          </div>
          <p className="text-[11px] text-slate-500">
            Use your assigned physical security credentials below to authorize operations.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
            <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <span className="leading-snug font-medium">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-5">
          
          {/* COMPACT ROLE DROPDOWN SELECTOR (NEW DESIGN) */}
          <div className="space-y-1.5" ref={dropdownRef}>
            <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Select Operating Position</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => { playSound('tap'); setDropdownOpen(!dropdownOpen); }}
                className="w-[190px] h-[44px] bg-[#F8FAFC] hover:bg-[#D4AF37]/10 border border-slate-200 hover:border-[#D4AF37] hover:scale-[1.02] text-[#0F172A] rounded-xl shadow-sm text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-between px-3.5 transition-all duration-300"
                id="manager_login_role_dropdown"
              >
                <div className="flex items-center gap-2 text-left truncate">
                  <activeRoleObj.icon className="h-4 w-4 text-[#D4AF37] flex-shrink-0" />
                  <span className="truncate">{activeRoleObj.label}</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-0 mt-1.5 w-[190px] bg-white border border-slate-200/90 rounded-xl shadow-xl overflow-hidden py-1 z-50 divide-y divide-slate-100"
                    id="manager_login_role_menu"
                  >
                    <div className="py-1">
                      {rolesList.map((role) => {
                        const isSelected = targetRole === role.value;
                        const Icon = role.icon;
                        return (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() => {
                              playSound('success');
                              setTargetRole(role.value);
                              setDropdownOpen(false);
                            }}
                            className={`group w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-all duration-300 cursor-pointer border-l-4 border-l-transparent hover:border-l-[#D4AF37] hover:bg-[#D4AF37]/10 ${
                              isSelected 
                                ? 'bg-[#0F172A] text-[#D4AF37] hover:bg-[#0F172A]/90' 
                                : 'text-slate-800 hover:text-[#0F172A]'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
                              
                              {/* Normal: Manager, Hover: ► Manager */}
                              <span className="text-[11.5px] font-bold uppercase tracking-wide transition-all duration-300 flex items-center gap-1.5 truncate">
                                <span className="opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-300 text-[#D4AF37] text-[10px] font-mono">►</span>
                                <span className="group-hover:translate-x-0.5 transition-transform duration-300">{role.label}</span>
                              </span>
                            </div>

                            {/* Gold dots checklist selection indicator */}
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] flex-shrink-0 ml-1.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Manager Username *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <User className="h-4 w-4" />
              </span>
              <input 
                type="text" 
                required
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. SAINIRVANAPLAZA0533"
                className="w-full text-xs pl-11 pr-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 text-[#0F172A] placeholder-slate-400 font-mono"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Security Password *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <KeyRound className="h-4 w-4" />
              </span>
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full text-xs pl-11 pr-11 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 text-[#0F172A] placeholder-slate-400 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#0F172A] hover:bg-[#1e293b] text-[#D4AF37] hover:text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.01]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
                <span>Verifying Signatures...</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>Authenticate Manager Access</span>
              </>
            )}
          </button>
        </form>

        {/* Informative Security Policy Note */}
        <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-200 space-y-1.5 text-slate-500">
          <h5 className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#0F172A] flex items-center gap-1">
            <Terminal className="h-3 w-3 text-[#D4AF37]" />
            <span>Secure Terminal Directives</span>
          </h5>
          <p className="text-[10px] leading-normal text-slate-500">
            Unauthorized login attempts are audited automatically with timestamps. Account locks occur after 3 consecutive invalid authentication queries.
          </p>
        </div>

      </motion.div>
    </div>
  );
}
