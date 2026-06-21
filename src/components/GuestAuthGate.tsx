/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Lock, User, ShieldAlert, KeyRound, CheckCircle, 
  HelpCircle, Eye, EyeOff, Loader2, Landmark, Phone, Mail, Award, Key, LogOut
} from 'lucide-react';
import { playSound } from '../soundUtils';
import { GuestAccount } from '../types';

interface GuestAuthGateProps {
  loggedInGuest: GuestAccount | null;
  onLogin: (guest: GuestAccount) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export function GuestAuthGate({ loggedInGuest, onLogin, onLogout, children }: GuestAuthGateProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  // Registration Form States
  const [regFullName, setRegFullName] = useState('');
  const [regMobileNumber, setRegMobileNumber] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regGender, setRegGender] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regPreferredRoomType, setRegPreferredRoomType] = useState('Standard');
  const [regErrorMsg, setRegErrorMsg] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Password change states (for first-time login)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [changeError, setChangeError] = useState('');

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regMobileNumber || !regEmail || !regPassword || !regConfirmPassword) {
      setRegErrorMsg("All fields are required.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegErrorMsg("Passwords do not match.");
      return;
    }
    if (regPassword.length < 5) {
      setRegErrorMsg("Password must be at least 5 characters long.");
      return;
    }

    setIsLoading(true);
    setRegErrorMsg('');
    setRegSuccessMsg('');
    playSound('click');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: regFullName,
          mobile_number: regMobileNumber,
          email: regEmail,
          password: regPassword,
          confirm_password: regConfirmPassword,
          gender: regGender,
          city: regCity,
          preferred_room_type: regPreferredRoomType
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.success && data.account) {
          playSound('success');
          setRegSuccessMsg("Account created successfully. Welcome to Sai Nirvana Plaza.");
          setTimeout(() => {
            onLogin(data.account);
          }, 1500);
        } else {
          setRegErrorMsg(data.error || "Registration failed.");
        }
      } else {
        setRegErrorMsg(data.error || "Registration failed.");
      }
    } catch (err) {
      setRegErrorMsg("Connection failure while registering your guest account.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg("Please fill in both Guest ID / Username / Email / Mobile Number and Password.");
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    playSound('click');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.account) {
          playSound('success');
          onLogin(data.account);
        } else {
          setErrorMsg(data.error || "Authentication failed.");
        }
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Invalid login credentials.");
      }
    } catch (err) {
      setErrorMsg("Connection failure while contacting Sri Nirvana central billing index.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setChangeError("Both fields are required.");
      return;
    }
    if (newPassword.length < 5) {
      setChangeError("For premium security compliance, new password must be at least 5 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError("Passwords do not match.");
      return;
    }

    setIsChangingPass(true);
    setChangeError('');
    playSound('click');

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loggedInGuest?.username || loggedInGuest?.guest_id_str,
          new_password: newPassword
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.account) {
          playSound('success');
          // Update the guest account with changed status
          onLogin(data.account);
          alert("Sai Nirvana Plaza: Secure login password configured with 256-bit hash. Your private session is now fully activated.");
        } else {
          setChangeError(data.error || "Failed to update security credentials.");
        }
      } else {
        const data = await res.json();
        setChangeError(data.error || "Failed to submit password change.");
      }
    } catch (err) {
      setChangeError("Error updating secure relational tables.");
    } finally {
      setIsChangingPass(false);
    }
  };

  // 1. Not Logged In -> Show Beautiful Gatekeep Login
  if (!loggedInGuest) {
    return (
      <div className="max-w-5xl mx-auto py-12" id="private_access_login_container">
        
        {/* Prominent Access Restricted Warning Header */}
        <div className="mb-8 bg-[#003366]/5 border border-[#003366]/10 rounded-2xl p-5 shadow-sm text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-[#003366] bg-[#003366]/10 uppercase tracking-widest">
            <Landmark className="h-3.5 w-3.5 text-[#003366]" />
            <span>Sai Nirvana Plaza Guest Portal</span>
          </div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Self-Service Guest Registration & Elite Portal Access
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Create an account instantly to explore luxury room rates, submit reservations, place dining orders, and view billing details.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Main Form Box: Takes 7 cols */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-lg flex flex-col justify-between" id="card_guest_login_form">
            <div>
              {/* Tab Selector */}
              <div className="flex border-b border-slate-100 mb-6">
                <button
                  type="button"
                  onClick={() => { playSound('tap'); setActiveTab('login'); setErrorMsg(''); setRegErrorMsg(''); }}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 text-center ${
                    activeTab === 'login'
                      ? 'border-[#003366] text-[#003366]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { playSound('tap'); setActiveTab('register'); setErrorMsg(''); setRegErrorMsg(''); }}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 text-center ${
                    activeTab === 'register'
                      ? 'border-[#003366] text-[#003366]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {activeTab === 'login' ? (
                /* SIGN IN FORM */
                <div className="space-y-4">
                  {errorMsg && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-rose-600" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">Guest ID / Username / Email / Mobile Number</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <User className="h-4 w-4" />
                        </span>
                        <input 
                          type="text" required
                          value={username} onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g. guest_snp001, email, or mobile number"
                          className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366] focus:bg-white"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        You can sign in using your Guest ID, Username, Email Address, or Mobile Number.
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">Login Password</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <KeyRound className="h-4 w-4" />
                        </span>
                        <input 
                          type={showPassword ? "text" : "password"} required
                          value={password} onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter Password"
                          className="w-full text-xs pl-10 pr-10 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366] focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                        <input type="checkbox" id="chk_remember_me" className="rounded text-[#003366]" />
                        <label htmlFor="chk_remember_me" className="cursor-pointer">Remember my Guest ID</label>
                      </div>
                      <button
                        type="button"
                        onClick={() => { playSound('tap'); setShowForgot(true); }}
                        className="text-[10px] font-bold text-[#003366] hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#003366] hover:bg-[#001f3f] text-[#F9D976] font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-[#F9D976]" />
                          <span>Verifying credential integrity...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5 text-[#F9D976]" />
                          <span>Authenticate Access</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                /* CREATE ACCOUNT FORM */
                <div className="space-y-4">
                  {regErrorMsg && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-rose-600" />
                      <span>{regErrorMsg}</span>
                    </div>
                  )}

                  {regSuccessMsg && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span>{regSuccessMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">Full Name *</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <User className="h-4 w-4" />
                          </span>
                          <input 
                            type="text" required
                            value={regFullName} onChange={(e) => setRegFullName(e.target.value)}
                            placeholder="e.g. Rahul Sharma"
                            className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366] focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">Mobile Number *</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <Phone className="h-4 w-4" />
                          </span>
                          <input 
                            type="tel" required
                            value={regMobileNumber} onChange={(e) => setRegMobileNumber(e.target.value)}
                            placeholder="e.g. +91 9876543210"
                            className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366] focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">Email Address *</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Mail className="h-4 w-4" />
                        </span>
                        <input 
                          type="email" required
                          value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="e.g. rahul.sharma@domain.com"
                          className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366] focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">Password *</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <KeyRound className="h-4 w-4" />
                          </span>
                          <input 
                            type={showRegPassword ? "text" : "password"} required
                            value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Min 5 characters"
                            className="w-full text-xs pl-10 pr-10 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366] focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700"
                          >
                            {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">Confirm Password *</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <KeyRound className="h-4 w-4" />
                          </span>
                          <input 
                            type={showRegConfirmPassword ? "text" : "password"} required
                            value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            className="w-full text-xs pl-10 pr-10 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366] focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700"
                          >
                            {showRegConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Optional Profile Preferences</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">Gender</label>
                          <select
                            value={regGender} onChange={(e) => setRegGender(e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366] focus:bg-white"
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                            <option value="Prefer Not To Say">Prefer Not To Say</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">City</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                              <Landmark className="h-3.5 w-3.5" />
                            </span>
                            <input 
                              type="text"
                              value={regCity} onChange={(e) => setRegCity(e.target.value)}
                              placeholder="e.g. New Delhi"
                              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366] focus:bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">Room Preference</label>
                          <select
                            value={regPreferredRoomType} onChange={(e) => setRegPreferredRoomType(e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366] focus:bg-white"
                          >
                            <option value="Standard">Standard Room</option>
                            <option value="Deluxe">Deluxe Room</option>
                            <option value="Executive Suite">Executive Suite</option>
                            <option value="Presidential Suite">Presidential Suite</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#003366] hover:bg-[#001f3f] text-[#F9D976] font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-[#F9D976]" />
                          <span>Registering your profile...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 text-[#F9D976]" />
                          <span>Create Account & Register</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Simulated password list helper for easy testing */}
            <div className="mt-8 border-t pt-4 text-[10px] text-slate-400 space-y-1 bg-slate-50 -mx-6 -mb-6 p-4 rounded-b-2xl">
              <span className="font-bold block text-slate-500 uppercase tracking-wider mb-1">🔑 Demo & Testing Access Pass:</span>
              <p>Username: <strong className="text-[#003366] font-mono select-all">guest_snp001</strong> | Password: <strong className="text-emerald-700 font-mono select-all">Temp@123</strong> (Active Guest)</p>
              <p className="text-[9px] text-slate-400 leading-normal italic font-medium">Tip: You can register a brand new account and it will automatically log you in securely!</p>
            </div>
          </div>

          {/* Secure Request Informational Banner: Takes 5 cols */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#001f3f] to-[#012d59] text-slate-300 rounded-2xl p-6 border border-[#D4AF37]/20 flex flex-col justify-between" id="card_how_to_acquire">
            <div className="space-y-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold text-[#F9D976] bg-amber-500/10 uppercase tracking-widest border border-[#D4AF37]/35 mb-3">
                  <Award className="h-3 w-3 text-[#F9D976]" />
                  Five-Star Luxury Standard
                </span>
                <h3 className="text-sm font-extrabold text-[#F9D976] font-heading uppercase tracking-wide">
                  Unlock Elite Guest Privileges
                </h3>
              </div>
              
              {/* Feature list */}
              <div className="space-y-4 text-xs">
                <div className="flex gap-2.5 items-start">
                  <div className="w-5 h-5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/45 flex items-center justify-center text-[10px] font-bold text-[#F9D976] mt-0.5">✓</div>
                  <div>
                    <h4 className="font-bold text-white text-[11px] uppercase tracking-wide">Instant Reservation Requests</h4>
                    <p className="text-slate-300 mt-0.5">Browse room availability in real-time and submit your booking approvals instantly.</p>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="w-5 h-5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/45 flex items-center justify-center text-[10px] font-bold text-[#F9D976] mt-0.5">✓</div>
                  <div>
                    <h4 className="font-bold text-white text-[11px] uppercase tracking-wide">Gourmet In-Room Dining</h4>
                    <p className="text-slate-300 mt-0.5">Browse our premium kitchen menu, add to cart, and order direct from your lounge chair.</p>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="w-5 h-5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/45 flex items-center justify-center text-[10px] font-bold text-[#F9D976] mt-0.5">✓</div>
                  <div>
                    <h4 className="font-bold text-white text-[11px] uppercase tracking-wide">Invoicing & Helpdesk</h4>
                    <p className="text-slate-300 mt-0.5">Download signature-verified tax PDFs and lodge service tickets using state-of-the-art AI priority.</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">Direct Help Desk Verification</p>
                <p className="text-[11px] font-semibold text-slate-200 flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-[#F9D976]" /> +91 11-4560-6000 ext 201</p>
                <p className="text-[11px] font-semibold text-slate-200 flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-[#F9D976]" /> desk@sri-nirvana-plaza.com</p>
              </div>
            </div>

            <div className="text-[9px] text-slate-400 mt-6 pt-3 border-t border-white/5 leading-normal">
              * By registering, your credentials are dynamically verified and stored using secure 256-bit hash encryption logic. Support for legacy check-in voucher credentials remains fully active.
            </div>
          </div>

        </div>

        {/* Forgot password informational popup */}
        {showForgot && (
          <div className="fixed inset-0 bg-slate-950/75 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-center shadow-2xl">
              <ShieldAlert className="h-10 h-10 text-amber-500 mx-auto" />
              <h4 className="text-base font-bold text-slate-900 font-heading">Secure Account Verification Desk</h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Forgot password or need to reset access keys? For premium user safety compliance, credential resets must be processed directly by authorized front desk agents at Sai Nirvana Plaza.
              </p>
              <div className="bg-slate-50 p-3 rounded-lg text-xs leading-relaxed space-y-1 border">
                <p>📞 Phone Reservation Desk: <strong>+91 11-4560-6000 (EXT 201)</strong></p>
                <p>📧 Support Email: <strong>reservations@sri-nirvana-plaza.com</strong></p>
              </div>
              <button
                onClick={() => { playSound('click'); setShowForgot(false); }}
                className="w-full bg-[#003366] text-[#F9D976] font-bold py-2 rounded-lg text-xs uppercase"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // 2. Logged In, but First Login Password Change is Pending
  if (!loggedInGuest.first_login_password_changed) {
    return (
      <div className="max-w-md mx-auto py-12" id="first_login_password_enforcer_box">
        <div className="bg-white rounded-2xl border-2 border-[#D4AF37]/50 p-6 shadow-2xl space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
              <Key className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight font-heading">
              Configure Relational Password
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Welcome, <strong>{loggedInGuest.full_name}</strong>! As this is your first logging under private guest system, you must update your password to complete account activation.
            </p>
          </div>

          {changeError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              <span>{changeError}</span>
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">New Password</label>
              <input 
                type="password" required
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Choose custom password"
                className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">Confirm New Password</label>
              <input 
                type="password" required
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366]"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPass}
              className="w-full bg-[#003366] hover:bg-[#001f3f] text-[#F9D976] font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              {isChangingPass ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#F9D976]" />
                  <span>Configuring custom security keys...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Update & Activate Account</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Authenticated & Activated -> Output the kids! Include beautiful profile header bar for Guest
  return (
    <div className="space-y-8" id="authenticated_guest_flow">
      
      {/* Mini Profile Info Header Bar */}
      <div className="bg-[#003366] p-4 rounded-xl border border-[#D4AF37]/35 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F9D976] text-[#003366] font-extrabold flex items-center justify-center">
            {loggedInGuest.full_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold font-sans text-white">{loggedInGuest.full_name}</span>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                loggedInGuest.is_activated 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-slate-500 text-white'
              }`}>
                {loggedInGuest.is_activated ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <p className="text-[10px] text-[#F9D976] font-mono leading-none mt-0.5">
              Guest ID: <strong>{loggedInGuest.guest_id_str}</strong> • Stay: {loggedInGuest.stay_duration}
            </p>
          </div>
        </div>

        <button
          onClick={() => { playSound('click'); onLogout(); }}
          className="bg-white/10 hover:bg-white/20 text-[#F9D976] text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all border border-white/10 flex items-center gap-1 cursor-pointer uppercase self-end sm:self-auto"
        >
          <LogOut className="h-3 w-3" />
          <span>Logout session</span>
        </button>
      </div>

      {children}
    </div>
  );
}
