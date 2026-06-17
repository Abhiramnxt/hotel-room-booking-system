/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, Volume2, VolumeX, Shield, User, ClipboardList, 
  Trash2, HelpCircle, LogOut, ChevronDown, 
  ShieldCheck, CheckSquare, Landmark, Users, Sparkles,
  Sun, Moon, Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole } from '../types';
import { playSound, getAudioEnabled, setAudioEnabled, getVolumeLevel, setVolumeLevel } from '../soundUtils';
import { ThreeDText } from './ThreeDText';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  soundEnabled: boolean;
  onToggleSound: (val: boolean) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onBackToHome: () => void;
}

export function Header({ currentRole, onRoleChange, soundEnabled, onToggleSound, theme, onToggleTheme, onBackToHome }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [soundPopoverOpen, setSoundPopoverOpen] = useState(false);
  const soundRef = useRef<HTMLDivElement>(null);
  const [currentVolume, setCurrentVolume] = useState<'low' | 'medium' | 'high'>(getVolumeLevel());

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (soundPopoverOpen && soundRef.current && !soundRef.current.contains(event.target as Node)) {
        setSoundPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen, soundPopoverOpen]);

  const dropdownRoles: { value: UserRole; label: string; icon: React.ComponentType<any>; color: string; description: string }[] = [
    { 
      value: 'Front Desk Staff', 
      label: 'Front Desk', 
      icon: ClipboardList, 
      color: 'text-sky-650',
      description: 'Bookings & Check Ins'
    },
    { 
      value: 'Hotel Manager', 
      label: 'Manager', 
      icon: ShieldCheck, 
      color: 'text-amber-650',
      description: 'Operations Analytics'
    },
    { 
      value: 'Housekeeping Team', 
      label: 'Guest Services', 
      icon: CheckSquare, 
      color: 'text-emerald-650',
      description: 'Room Cleaning'
    },
    { 
      value: 'Accounts Staff', 
      label: 'Accounts', 
      icon: Landmark, 
      color: 'text-purple-650',
      description: 'GST & Payments'
    }
  ];

  const handleRoleSelect = (role: UserRole) => {
    playSound('container');
    onRoleChange(role);
    setDropdownOpen(false);
  };

  const currentRoleObj = dropdownRoles.find(r => r.value === currentRole || (r.value === 'Housekeeping Team' && currentRole === 'Housekeeping Staff')) || {
    value: currentRole,
    label: currentRole === 'Housekeeping Staff' ? 'Guest Services' : currentRole,
    icon: ShieldCheck,
    color: 'text-slate-850',
    description: 'Operating Access'
  };



  return (
    <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-[#001f3f] to-[#003366] border-b border-[#D4AF37]/35 shadow-lg" id="navbar_header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand/Logo */}
          <div className="flex items-center gap-3">
            <motion.div 
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.0, ease: "easeOut" }}
              className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#F9D976] rounded-lg flex items-center justify-center shadow-[0_4px_16px_rgba(212,175,55,0.22)]"
            >
              <span className="text-[#001f3f] font-extrabold text-xl font-sans tracking-tight">SN</span>
            </motion.div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none uppercase text-lg animate-fade-in">
                <ThreeDText text="Sai Nirvana Plaza" hoverColor="#F9D976" gradient={true} />
              </h1>
              <p className="text-[#F9D976] text-[10px] uppercase tracking-widest font-semibold mt-1">
                Great Hospitality, Easy Booking
              </p>
            </div>
          </div>

          {/* Controls Suite */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Theme Toggle Button */}
            <button
              onClick={() => {
                playSound('click');
                onToggleTheme();
              }}
              className="p-2 px-3.5 rounded-xl border transition-all duration-300 flex items-center gap-2 text-xs font-semibold cursor-pointer bg-white/10 text-[#F9D976] border-[#D4AF37]/40 hover:bg-white/20 select-none shadow-[0_4px_12px_rgba(212,175,55,0.12)] hover:shadow-[0_4px_16px_rgba(212,175,55,0.25)]"
              id="btn_theme_toggle_pill"
              title="Toggle theme (Light / Dark)"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 text-yellow-300" />
                  <span className="hidden sm:inline text-yellow-300 font-bold uppercase tracking-wider text-[10px]">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-[#F9D976]" />
                  <span className="hidden sm:inline text-[#F9D976] font-bold uppercase tracking-wider text-[10px]">Dark Mode</span>
                </>
              )}
            </button>

            {/* Permanent Role Dropdown for all dashboards */}
            {currentRole !== 'Guest' && (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Manager Authorized Badge */}
                <div className="flex flex-col text-right hidden lg:flex">
                  <span className="text-[9px] text-[#F9D976] uppercase tracking-widest font-mono font-bold">Current User</span>
                  <span className="text-[11px] text-white font-bold opacity-90 flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {currentRoleObj.label}
                  </span>
                </div>

                {/* Highly Crafted Compact Selector Dropdown */}
                <div className="relative" ref={dropdownRef} id="dynamic_role_dropdown_container">
                  <button
                    onClick={() => { playSound('tap'); setDropdownOpen(!dropdownOpen); }}
                    className="w-[190px] h-[44px] bg-white hover:bg-[#D4AF37]/10 border border-slate-200 hover:border-[#D4AF37] hover:scale-[1.02] text-[#0f172a] rounded-xl shadow-md font-sans text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-between px-3 transition-all duration-300"
                    id="btn_role_dropdown_selector"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <currentRoleObj.icon className={`h-4 w-4 ${currentRoleObj.color}`} />
                      <span className="truncate">{currentRoleObj.label}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Frame with Motion Animation */}
                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute right-0 mt-2 w-[190px] bg-white border border-slate-200/90 rounded-xl shadow-xl overflow-hidden py-1.5 z-50 divide-y divide-slate-100"
                        id="role_dropdown_menu_panel"
                      >
                        <div className="py-1">
                          {dropdownRoles.map((role) => {
                            const isSelected = currentRole === role.value || (role.value === 'Housekeeping Team' && currentRole === 'Housekeeping Staff');
                            const Icon = role.icon;
                            return (
                              <button
                                key={role.value}
                                onClick={() => handleRoleSelect(role.value)}
                                className={`group w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-all duration-300 cursor-pointer border-l-4 border-l-transparent hover:border-l-[#D4AF37] hover:bg-[#D4AF37]/10 ${
                                  isSelected 
                                    ? 'bg-[#0f172a] text-[#D4AF37] hover:bg-[#0f172a]/95' 
                                    : 'text-slate-800 hover:text-[#0f172a]'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? 'text-[#D4AF37]' : role.color}`} />
                                  
                                  {/* Normal: RoleName, Hover: ► RoleName */}
                                  <span className="text-[11.5px] font-bold uppercase tracking-wide transition-all duration-300 flex items-center gap-1.5 truncate">
                                    <span className="opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-300 text-[#D4AF37] text-[10px] font-mono">►</span>
                                    <span className="group-hover:translate-x-0.5 transition-transform duration-300">{role.label}</span>
                                  </span>
                                </div>

                                {/* Active Selection Indicator */}
                                {isSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] flex-shrink-0 ml-1.5 shadow-inner" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Sign Out Trigger at bottom */}
                        <div className="p-1 bg-slate-50">
                          <button
                            onClick={() => handleRoleSelect('Guest')}
                            className="w-full text-center py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200/60"
                          >
                            <LogOut className="h-3 w-3 text-rose-600" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </header>
  );
}
