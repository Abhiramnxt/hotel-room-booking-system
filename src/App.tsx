/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Search, Calendar, Users, Star, ArrowRight, ShieldCheck, 
  MapPin, Phone, Mail, Award, CheckCircle2, ChevronRight,
  ClipboardList, AlertCircle, Building, Gift, Coffee 
} from 'lucide-react';

import { Header } from './components/Header';
import { BookingModal } from './components/BookingModal';
import { GuestDashboard } from './components/GuestDashboard';
import { FrontDeskDashboard } from './components/FrontDeskDashboard';
import { HousekeepingDashboard } from './components/HousekeepingDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AccountsDashboard } from './components/AccountsDashboard';
import { ThreeDText } from './components/ThreeDText';
import { GuestAuthGate } from './components/GuestAuthGate';
import { MessagingReportingDashboard } from './components/MessagingReportingDashboard';
import { ManagerLoginScreen } from './components/ManagerLoginScreen';
import { RoomDetailsPage } from './components/RoomDetailsPage';
import { RoomImage } from './components/RoomImage';

import { Room, UserRole, GuestAccount } from './types';
import { playSound } from './soundUtils';

const ChatbotWidget = React.lazy(() => import('./components/ChatbotWidget'));

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  const [currentRole, setCurrentRole] = useState<UserRole>('Guest');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loggedInGuest, setLoggedInGuest] = useState<GuestAccount | null>(null);
  
  // State for inspecting beautiful room details page
  const [detailedRoom, setDetailedRoom] = useState<Room | null>(null);
  
  // Navigation for dynamic home navigation triggers
  const [landingPage, setLandingPage] = useState<'home' | 'guest' | 'manager'>('home');
  
  // Tab controller for Admin, Manager and Front Desk
  const [dashboardTab, setDashboardTab] = useState<'operations' | 'messaging'>('operations');

  // Stays checking search filters
  const [checkInDate, setCheckInDate] = useState('2026-06-10');
  const [checkOutDate, setCheckOutDate] = useState('2026-06-12');
  const [guestsCount, setGuestsCount] = useState<number>(2);
  const [searchType, setSearchType] = useState<string>('All');

  // Rooms and active booking modal state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [selectedRoomToBook, setSelectedRoomToBook] = useState<Room | null>(null);

  // Corporate Booking leads
  const [corpCompany, setCorpCompany] = useState('');
  const [corpPerson, setCorpPerson] = useState('');
  const [corpEmail, setCorpEmail] = useState('');
  const [corpPhone, setCorpPhone] = useState('');
  const [corpRooms, setCorpRooms] = useState(5);
  const [isSubmittingCorp, setIsSubmittingCorp] = useState(false);
  const [corpSuccess, setCorpSuccess] = useState(false);

  const fetchRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms);
      }
    } catch (e) {
      console.warn("Could not query available chambers:", e);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [currentRole]);



  const handleBookingTrigger = (room: Room) => {
    playSound('click');
    setSelectedRoomToBook(room);
  };

  const handleBookNowFromDetails = (room: Room, checkInVal: string, checkOutVal: string) => {
    setCheckInDate(checkInVal);
    setCheckOutDate(checkOutVal);
    setSelectedRoomToBook(room);
    setDetailedRoom(null); // Close the details page modal first
  };

  const handleBookingComplete = () => {
    setSelectedRoomToBook(null);
    fetchRooms(); // refresh available statuses
    alert("Sai Nirvana Plaza: Your transactional booking and UPI calculations completed successfully!");
  };

  const handleCorpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCorp(true);
    setCorpSuccess(false);
    playSound('click');

    try {
      const res = await fetch('/api/corporate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: corpCompany,
          contact_person: corpPerson,
          contact_email: corpEmail,
          contact_phone: corpPhone,
          number_of_rooms: corpRooms,
          booking_dates: `${checkInDate} to ${checkOutDate}`
        })
      });

      if (res.ok) {
        playSound('success');
        setCorpSuccess(true);
        setCorpCompany('');
        setCorpPerson('');
        setCorpEmail('');
        setCorpPhone('');
        setTimeout(() => setCorpSuccess(false), 8000);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setIsSubmittingCorp(false);
    }
  };

  // Filter room cards on landing page based on guest count and type selection
  const filteredRooms = React.useMemo(() => {
    return rooms.filter(room => {
      if (searchType !== 'All' && room.room_type !== searchType) return false;
      return room.capacity >= guestsCount;
    });
  }, [rooms, searchType, guestsCount]);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#030815] text-[#f1f5f9]' : 'bg-slate-50 text-slate-800'} flex flex-col justify-between transition-colors duration-300`} id="app_root_layout">
      
      {/* Top sticky brand header and options bar */}
      <Header 
        currentRole={currentRole} 
        onRoleChange={(role) => {
          setCurrentRole(role);
          setDashboardTab('operations');
          if (role === 'Guest') {
            setLandingPage('home');
          }
        }}
        soundEnabled={soundEnabled}
        onToggleSound={setSoundEnabled}
        theme={theme}
        onToggleTheme={() => {
          setTheme(prev => prev === 'dark' ? 'light' : 'dark');
        }}
        onBackToHome={() => {
          setCurrentRole('Guest');
          setLandingPage('home');
          setLoggedInGuest(null);
          setDetailedRoom(null);
        }}
      />

      {/* Main Core Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="main_viewport_content">
        
        {/* Dynamic page switches based on active roles selected */}
        {currentRole === 'Guest' && (
          <>
            {!loggedInGuest && landingPage === 'home' && (
              <div className="max-w-4xl mx-auto py-12 space-y-8 animate-fade-in" id="luxury_homepage_container">
                {/* HERO BANNER SECTION */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#001f3f] to-[#003366] text-white border border-[#D4AF37]/30 shadow-2xl p-8 md:p-12 text-center space-y-4">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />
                  <span className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#F9D976] bg-[#D4AF37]/10 border border-[#D4AF37]/40 uppercase tracking-widest">
                    <Award className="h-3.5 w-3.5" />
                    Premium Five-Star Lodging
                  </span>
                  <h2 className="relative z-10 text-3xl md:text-5xl font-black font-heading tracking-tight text-white uppercase sm:leading-tight">
                    <ThreeDText text="Sai Nirvana Plaza" hoverColor="#F9D976" gradient={true} />
                  </h2>
                  <p className="relative z-10 text-slate-200 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                    Dwarka S-22 New Delhi. Experience luxurious rooms, integrated UPI instant checkout systems, structured 12% GST tax audit ledger compliance, and state-of-the-art hospitality services.
                  </p>
                </div>

                {/* DUAL LOGIN OPTIONS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                  {/* GUEST ACCESS CARD */}
                  <div className="bg-white rounded-3xl border border-slate-200 hover:border-[#D4AF37]/50 p-8 shadow-lg flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-1">
                    <div className="space-y-4 bg-white">
                      <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                        <Users className="h-6 w-6 text-[#003366]" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 uppercase font-heading tracking-wide">Verified Guest Entrance</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Sign in using your private guest account to search deluxe suites availability, review personalized rates, file reservation bookings, and check live services ledger.
                      </p>
                    </div>
                    <button
                      onClick={() => { playSound('click'); setLandingPage('guest'); }}
                      className="mt-6 w-full bg-gradient-to-r from-[#D4AF37] to-[#F9D976] hover:brightness-110 text-[#001f3f] font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Guest Login</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* MANAGER ADMIN CARD */}
                  <div className="bg-white rounded-3xl border border-slate-200 hover:border-[#003366]/40 p-8 shadow-lg flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-1">
                    <div className="space-y-4 bg-white">
                      <div className="w-12 h-12 rounded-2xl bg-[#003366]/10 border border-[#003366]/20 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-[#003366]" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 uppercase font-heading tracking-wide">Manager Operations Suite</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Authorized executive portal for Hotel Managers, Front Desk Agents & Administrators to review GST audit tables, coordinate guest services, and resolve complaints.
                      </p>
                    </div>
                    <button
                      onClick={() => { playSound('click'); setLandingPage('manager'); }}
                      className="mt-6 w-full bg-[#003366] hover:bg-[#001f3f] text-[#F9D976] font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Manager Login</span>
                      <ArrowRight className="h-4 w-4 text-[#F9D976]" />
                    </button>
                  </div>
                </div>

                {/* PROPERTY HIGHLIGHTS METRICS */}
                <div className="bg-slate-100/60 rounded-2xl border p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#003366] font-mono font-bold uppercase tracking-wider block">Security & Transparency</span>
                    <h4 className="text-xs font-bold text-slate-800">Private Property Rules and Carrier Compliance</h4>
                  </div>
                  <div className="flex flex-wrap justify-center gap-6 text-[11px] text-slate-500 font-medium font-sans">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 18% Standard GST Lodging Slab</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> WhatsApp Cloud Dispatch Approved</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 256-bit Relational DB Encryption</span>
                  </div>
                </div>
              </div>
            )}

            {!loggedInGuest && landingPage === 'manager' && (
              <ManagerLoginScreen
                onSuccess={(selectedRole) => {
                  setCurrentRole(selectedRole || 'Hotel Manager');
                  setLandingPage('home');
                }}
                onBack={() => setLandingPage('home')}
              />
            )}

            {(loggedInGuest || landingPage === 'guest') && (
              <>
                {!loggedInGuest && (
                  <div className="max-w-4xl mx-auto mb-4 flex justify-start">
                    <button
                      onClick={() => { playSound('tap'); setLandingPage('home'); }}
                      className="text-xs font-bold text-[#003366] hover:text-[#001f3f] bg-white px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 border border-slate-200 cursor-pointer shadow-sm hover:bg-slate-50"
                    >
                      ← Back to Homepage Selector
                    </button>
                  </div>
                )}

                <GuestAuthGate
                  loggedInGuest={loggedInGuest}
                  onLogin={(guest) => {
                    setLoggedInGuest(guest);
                  }}
                  onLogout={() => {
                    setLoggedInGuest(null);
                    setLandingPage('home');
                  }}
                >
                  <div className="space-y-16 animate-fade-in" id="guest_view_portal">
            
            {/* HERO INTRODUCTION PANEL */}
            <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#001f3f] to-[#003366] text-white border border-[#D4AF37]/30 shadow-2xl" id="guest_hero_section">
              {/* Absolutes decorative grid lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />
              <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#F9D976]/5 blur-3xl" />
              <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

              <div className="relative max-w-4xl px-6 py-12 md:py-20 lg:px-12 space-y-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#F9D976] bg-[#D4AF37]/10 border border-[#D4AF37]/40 uppercase tracking-widest">
                  <Award className="h-3.5 w-3.5" />
                  Premium Indian Hospitality
                </span>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight font-heading">
                  Experience Elegance At <br className="hidden sm:inline" />
                  <ThreeDText text="Sai Nirvana Plaza" hoverColor="#F9D976" gradient={true} />
                </h1>

                <p className="text-slate-200 text-sm sm:text-base max-w-2xl leading-relaxed">
                  Comfortable Rooms, Easy Booking, Great Hospitality. Secure luxurious spaces tailored with instant UPI billing calculations, automated GST invoices, and rule-based AI recommendations.
                </p>

                {/* USP list widgets */}
                <div className="flex flex-wrap gap-4 pt-4 text-xs font-semibold text-slate-300">
                  <div className="flex items-center gap-1.5 bg-[#001f3f]/40 p-2 px-3 rounded-lg border border-[#D4AF37]/20">
                    <CheckCircle2 className="h-4 w-4 text-[#F9D976]" />
                    <span>Instant Verified Bookings</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#001f3f]/40 p-2 px-3 rounded-lg border border-[#D4AF37]/20">
                    <CheckCircle2 className="h-4 w-4 text-[#F9D976]" />
                    <span>Complimentary Welcome Drinks</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#001f3f]/40 p-2 px-3 rounded-lg border border-[#D4AF37]/20">
                    <CheckCircle2 className="h-4 w-4 text-[#F9D976]" />
                    <span>24/7 Digital Desk Support</span>
                  </div>
                </div>
              </div>
            </section>

            {/* LIVE STAY SEARCH COMPACT WIDGET */}
            <section className="bg-white rounded-2xl border-l-4 border-l-[#003366] border border-[#d4af37]/20 shadow-lg p-6 -mt-12 relative z-10 max-w-5xl mx-auto" id="availability_search_section">
              <span className="text-[10px] uppercase font-bold text-[#003366] block tracking-wider mb-3 font-mono">
                Real-Time Availability Checker
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* Check-in */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-[#003366]" />
                    <span>Check-In Date</span>
                  </label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => { playSound('tap'); setCheckInDate(e.target.value); }}
                    className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366] focus:bg-white"
                  />
                </div>

                {/* Check-out */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-[#003366]" />
                    <span>Check-Out Date</span>
                  </label>
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => { playSound('tap'); setCheckOutDate(e.target.value); }}
                    className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366] focus:bg-white"
                  />
                </div>

                {/* Guests Capacity */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-[#003366]" />
                    <span>Stay Capacity</span>
                  </label>
                  <select
                    value={guestsCount}
                    onChange={(e) => { playSound('tap'); setGuestsCount(Number(e.target.value)); }}
                    className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366] focus:bg-white"
                  >
                    <option value={1}>1 Guest</option>
                    <option value={2}>2 Guests</option>
                    <option value={3}>3 Guests</option>
                    <option value={4}>4 Guests</option>
                    <option value={6}>6 Guests (Suite limit)</option>
                  </select>
                </div>

                {/* Filter Selector Type */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                    <Building className="h-3.5 w-3.5 text-[#003366]" />
                    <span>Select Suite Tier</span>
                  </label>
                  <select
                    value={searchType}
                    onChange={(e) => { playSound('tap'); setSearchType(e.target.value); }}
                    className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366]"
                  >
                    <option value="All">All Room Tiers</option>
                    <option value="Standard">Standard Cabin</option>
                    <option value="Deluxe">Premium Deluxe</option>
                    <option value="Executive Suite">Executive Suite</option>
                    <option value="Presidential Suite">Presidential Suite</option>
                  </select>
                </div>
              </div>
            </section>

            {/* FEATURED AVAILABLE CHAMBERS LISTING */}
            <section className="space-y-6" id="available_rooms_listing">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
                  Our Exquisite Suites & Cabins
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Showing matches fitting {guestsCount} guests stay under Sai Nirvana Plaza index.
                </p>
              </div>

              {isLoadingRooms ? (
                <div className="py-20 text-center text-xs text-slate-400">Loading catalog indexes...</div>
              ) : filteredRooms.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border text-center text-xs text-slate-400">
                  <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No Chambers Match Selection</p>
                  <p className="mt-1">Adjust stay capacity or suite filters on the search widget above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredRooms.map((room) => {
                    const isAvailable = room.room_status === 'Available';
                    const ratingAvg = room.reviews && room.reviews.length > 0
                      ? (room.reviews.reduce((acc, r) => acc + r.rating, 0) / room.reviews.length).toFixed(1)
                      : "4.8";

                    const getCategoryLabel = (type: string) => {
                      switch(type) {
                        case 'Standard': return 'Standard Cabin';
                        case 'Deluxe': return 'Premium Deluxe';
                        case 'Executive Suite': return 'Executive Suite';
                        case 'Presidential Suite': return 'Presidential Suite';
                        default: return type;
                      }
                    };

                    return (
                      <motion.div
                        key={room.room_id}
                        whileHover={{ y: -8, scale: 1.02 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        onClick={() => { playSound('room'); setDetailedRoom(room); }}
                        className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-[#D4AF37] hover:shadow-[0_20px_50px_rgba(212,175,55,0.18)] hover:ring-1 hover:ring-[#D4AF37]/35 flex flex-col justify-between cursor-pointer group transition-all duration-300 ease-out"
                        id={`room_card_${room.room_id}`}
                      >
                        {/* Image banner preview - Load immediately, no delay */}
                        <div className="relative h-56 overflow-hidden bg-slate-900 w-full" id={`room_image_container_${room.room_id}`}>
                          <RoomImage 
                            src={room.image_url} 
                            alt={room.room_name || room.room_type} 
                            category={room.room_type}
                            width={800}
                            quality={80}
                            loading="eager"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            id={`room_cover_img_${room.room_id}`}
                          />
                          {/* Hover details inspect overlay */}
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <span className="bg-[#002244]/90 text-[#F9D976] border border-[#D4AF37]/45 text-[10px] font-bold font-sans tracking-widest uppercase px-3.5 py-2 rounded-xl backdrop-blur-sm shadow-md">
                              Inspect Gallery & Layout
                            </span>
                          </div>

                          {/* Room Number Badge */}
                          <div className="absolute top-4 left-4 bg-[#001f3f]/90 backdrop-blur-sm p-1.5 px-3 rounded-lg text-white font-mono text-xs font-bold border border-[#D4AF37]/35">
                            Room {room.room_number}
                          </div>

                          {/* Room Tier badge overlay */}
                          <div className="absolute bottom-4 left-4 bg-[#003366]/90 backdrop-blur-sm text-[#F9D976] text-[10px] font-extrabold font-sans tracking-wider uppercase p-1 px-2.5 rounded-md border border-[#D4AF37]/40">
                            {getCategoryLabel(room.room_type)}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="text-base font-bold text-slate-900 font-heading group-hover:text-[#003366] transition-colors duration-150">
                                {room.room_name || `${room.room_type} Room ${room.room_number}`}
                              </h4>
                              
                              <span className={`px-2.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider shrink-0 border ${
                                isAvailable 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                                  : room.room_status === 'Dirty'
                                  ? 'bg-[#F9D976]/25 text-[#856404] border-[#D4AF37]/40'
                                  : room.room_status === 'Occupied'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}>
                                {room.room_status}
                              </span>
                            </div>

                            {/* Ratings & Reviews Section */}
                            <div className="flex items-center gap-2">
                              <span className="room-rating-badge flex items-center text-amber-500 font-bold text-sm bg-amber-50 px-2 py-0.5 rounded border border-amber-200/40">
                                <Star className="room-rating-star h-3.5 w-3.5 fill-current mr-1 shrink-0" />
                                {ratingAvg}
                              </span>
                              <span className="room-review-count text-[11px] text-slate-500 font-medium">({room.reviews?.length || 2} Verified Reviews)</span>
                            </div>

                            {/* Features list */}
                            <div className="flex flex-wrap gap-1 pt-1">
                              {room.amenities.slice(0, 3).map((item, i) => (
                                <span key={i} className="text-[10px] bg-slate-550/5 text-slate-650 px-2 py-0.5 rounded border border-slate-200/50">
                                  {item}
                                </span>
                              ))}
                              {room.amenities.length > 3 && (
                                <span className="text-[9px] text-[#003366] font-bold px-1 py-0.5">+{room.amenities.length - 3} more</span>
                              )}
                            </div>
                          </div>

                          {/* Pricing and Double Reservation Buttons CTA */}
                          <div className="pt-4 border-t space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400 font-mono">Capacity: {room.capacity} Guests</span>
                              <div className="text-right">
                                <span className="text-xs text-slate-500 font-medium font-sans">Fare </span>
                                <span className="text-base font-black text-slate-900 font-mono">
                                  ₹{room.price_per_night.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] text-slate-400 font-sans">/Night</span>
                              </div>
                            </div>

                            {/* View Details and Book Now Dual Buttons */}
                            <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => { playSound('click'); setDetailedRoom(room); }}
                                className="flex-1 py-2.5 px-3 rounded-xl border border-[#003366] text-[#003366] hover:bg-[#003366]/5 font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                id={`room_btn_details_${room.room_id}`}
                              >
                                View Details
                              </button>
                              
                              <button
                                disabled={!isAvailable}
                                onClick={() => handleBookingTrigger(room)}
                                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold font-sans transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                  isAvailable 
                                    ? 'bg-[#003366] hover:bg-[#001f3f] text-[#F9D976] hover:text-[#fff] shadow-md hover:shadow-[#003366]/20' 
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border'
                                }`}
                                id={`room_btn_book_${room.room_id}`}
                              >
                                <span>{isAvailable ? 'Book Now' : 'Booked'}</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* GUEST COMPLAINT, SERVICES AND FEEDBACK MODULE (GUEST DASHBOARD OVERVIEW) */}
            <section className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
                  Guest Services & Active Stay Dashboard
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Access your stay history, checkout receipts, raise issues, or request room dining services.
                </p>
              </div>

              <GuestDashboard loggedInGuest={loggedInGuest} onUpdateGuest={setLoggedInGuest} />
            </section>

            {/* CORPORATE MULTI-ROOM RESERVATION SUITE */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white rounded-3xl overflow-hidden border border-[#D4AF37]/20 shadow-lg" id="corporate_booking_lead_form">
              
              {/* Marketing details */}
              <div className="bg-gradient-to-br from-[#003366] to-[#001f3f] p-8 md:p-12 text-white flex flex-col justify-between relative border-r border-[#D4AF37]/10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.08),transparent)]" />
                <div className="space-y-6 relative z-10">
                  <span className="text-[10px] tracking-widest uppercase font-bold text-[#F9D976] bg-[#D4AF37]/10 p-1 px-3 rounded-full border border-[#D4AF37]/30">
                    Sri Nirvana Corporate Rates
                  </span>
                  <h3 className="text-2xl md:text-3xl font-bold font-heading">
                    Corporate Retreats & Bulk Lodge Bookings
                  </h3>
                  <p className="text-slate-200 text-xs sm:text-sm leading-relaxed max-w-md">
                    Planning family gatherings, business meets, or organizational conferences? Register corporate bookings of 5+ rooms to receive specialized tariff pricing and local transfers.
                  </p>
                </div>

                <div className="space-y-2 text-xs pt-8 relative z-10">
                  <div className="flex items-center gap-2 text-[#F9D976]">
                    <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />
                    <span className="text-slate-100">Flexible Payment Tiers with full Invoice Invoicing</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#F9D976]">
                    <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />
                    <span className="text-slate-100">Allocated Private Meeting Lounge & Banquet Services</span>
                  </div>
                </div>
              </div>

              {/* Form panel */}
              <div className="p-8 md:p-12 space-y-4">
                <h4 className="text-lg font-bold text-[#003366] font-heading">
                  Submit Corporate Enquiry
                </h4>

                <form onSubmit={handleCorpSubmit} className="space-y-3">
                  {corpSuccess && (
                    <div className="bg-emerald-50 border border-emerald-250 text-emerald-900 text-xs p-3 rounded-lg flex items-center gap-2 animate-pulse">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <div>
                        <strong>Form Submitted!</strong> Our manager team will audit dates of Stay and respond to your Email with quote breakup.
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Company / Group Name</label>
                      <input 
                        type="text" required
                        value={corpCompany} onChange={(e) => setCorpCompany(e.target.value)}
                        placeholder="e.g. Antigravity Labs"
                        className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Contact Representative</label>
                      <input 
                        type="text" required
                        value={corpPerson} onChange={(e) => setCorpPerson(e.target.value)}
                        placeholder="e.g. Abhiram T."
                        className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Official Email</label>
                      <input 
                        type="email" required
                        value={corpEmail} onChange={(e) => setCorpEmail(e.target.value)}
                        placeholder="e.g. rep@corporate.com"
                        className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Phone Number</label>
                      <input 
                        type="tel" required
                        value={corpPhone} onChange={(e) => setCorpPhone(e.target.value)}
                        placeholder="e.g. +91 999 888 777"
                        className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tariff Rooms Required (5-30 limits)</label>
                    <input 
                      type="number" min={5} max={30} required
                      value={corpRooms} onChange={(e) => setCorpRooms(Number(e.target.value))}
                      className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:border-[#003366]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingCorp}
                    className="w-full bg-[#003366] hover:bg-[#001f3f] text-[#F9D976] font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-colors"
                  >
                    {isSubmittingCorp ? "Submitting inquiry..." : "Request Corporate Quote"}
                  </button>
                </form>
              </div>

            </section>

          </div>
          </GuestAuthGate>
          </>
         )}
        </>
       )}

        {/* Sub-view switcher for operational roles */}
        {['Front Desk Staff', 'Hotel Manager', 'Administrator'].includes(currentRole) && (
          <div className="mb-6 bg-white p-3.5 rounded-2xl border border-[#D4AF37]/35 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-[#003366] font-mono font-bold uppercase tracking-wider block">Unified Management Console</span>
              <h3 className="text-sm font-bold text-slate-800">Sai Nirvana Plaza System Navigator</h3>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => { playSound('container'); setDashboardTab('operations'); }}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  dashboardTab === 'operations'
                    ? 'bg-gradient-to-r from-[#001f3f] to-[#003366] text-[#F9D976] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                🏨 Core Operations Portal
              </button>
              <button
                onClick={() => { playSound('container'); setDashboardTab('messaging'); }}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  dashboardTab === 'messaging'
                    ? 'bg-gradient-to-r from-[#001f3f] to-[#003366] text-[#F9D976] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>💬 Messaging & Reporting Hub</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            </div>
          </div>
        )}

        {dashboardTab === 'messaging' && ['Front Desk Staff', 'Hotel Manager', 'Administrator'].includes(currentRole) ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <MessagingReportingDashboard onBack={() => { setDashboardTab('operations'); }} currentRole={currentRole} />
          </motion.div>
        ) : (
          <>
            {currentRole === 'Front Desk Staff' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b pb-4">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-950 font-heading">
                    Front Desk Operations Panel
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Acknowledge incoming stays, execute check-in documents scans, or checkout finished stays.
                  </p>
                </div>
                
                <FrontDeskDashboard currentRole={currentRole} />
              </motion.div>
            )}

            {(currentRole === 'Housekeeping Staff' || currentRole === 'Housekeeping Team') && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b pb-4">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-950 font-heading">
                    Guest Services Staff Management
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Review dirty chambers list and flag them of available after thorough sanitized cleanings.
                  </p>
                </div>

                <HousekeepingDashboard />
              </motion.div>
            )}

            {currentRole === 'Accounts Staff' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b pb-4">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-950 font-heading">
                    Accounts & Audit Management Dashboard
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Process payments logs, generate GST Slab invoices, and trace financial ledgers.
                  </p>
                </div>

                <AccountsDashboard />
              </motion.div>
            )}

            {currentRole === 'Hotel Manager' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b pb-4">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-950 font-heading">
                    Hotel Manager Operations Suite
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Monitor Indian Rupee billing summaries, accept corporate inquiries, or query custom tables.
                  </p>
                </div>

                <AdminDashboard currentRole={currentRole} />
              </motion.div>
            )}

            {currentRole === 'Administrator' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b pb-4">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-950 font-heading">
                    System Administrator Command Panel
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Full relational MySQL tables inspect terminal, custom schema updates, and live metrics.
                  </p>
                </div>

                <AdminDashboard currentRole={currentRole} />
              </motion.div>
            )}
          </>
        )}



      </main>

      {/* FOOTER */}
      <footer className="bg-gradient-to-r from-[#001f3f] to-[#002b54] text-slate-300 py-12 mt-20 border-t border-[#D4AF37]/35" id="footer_section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="space-y-3">
            <h5 className="text-[#F9D976] font-extrabold text-sm tracking-wider uppercase">Sai Nirvana Plaza</h5>
            <p className="text-xs text-slate-200 leading-relaxed">
              Comfortable Rooms, Easy Booking, Great Hospitality. A modern comprehensive booking engine designed for premium hospitality services.
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="text-[#F9D976] font-extrabold text-sm uppercase tracking-wider">Contact Reservation Desk</h5>
            <div className="text-xs space-y-2 text-slate-200">
              <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#F9D976]" /> Sector 22, Dwarka, New Delhi 110077, India</p>
              <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-[#F9D976]" /> +91 11-4560-6000 • Desk: EXT 201</p>
              <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-[#F9D976]" /> reservations@sri-nirvana-plaza.com</p>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-[#F9D976] font-extrabold text-sm uppercase tracking-wider">DBMS Compliance Index</h5>
            <p className="text-xs text-slate-200 leading-relaxed">
              Relational simulation meets normal-forms indexing for optimized check-in, guest services automation and corporate leads audit.
            </p>
            <div className="h-1.5 w-full bg-emerald-500/10 rounded overflow-hidden">
              <div className="h-full bg-emerald-400 w-full animate-pulse" />
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 mt-6 border-t border-white/10 text-center text-[11px] text-slate-400 flex flex-col sm:flex-row justify-between gap-4">
          <p>© 2026 Sai Nirvana Plaza Hotel. All Rights Reserved. Rated 4.9/5 by verified premium business guests.</p>
          <div className="flex gap-4 justify-center font-mono text-[10px] text-[#F9D976]">
            <span>Secure 256-bit Booking SSL</span>
            <span>Verified Luxury Standards</span>
          </div>
        </div>
      </footer>

      {/* RENDER RESERVATION MODAL ON TOP IF INITIATED */}
      {selectedRoomToBook && (
        <BookingModal 
          room={selectedRoomToBook}
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          onClose={() => setSelectedRoomToBook(null)}
          onBookingSuccess={handleBookingComplete}
        />
      )}

      {/* RENDER POWERFUL EXQUISITE DETAIL PAGE OVERLAY */}
      {detailedRoom && (
        <RoomDetailsPage 
          room={detailedRoom}
          allRooms={rooms}
          currentCheckIn={checkInDate}
          currentCheckOut={checkOutDate}
          onClose={() => setDetailedRoom(null)}
          onBookNow={handleBookNowFromDetails}
          onSelectRoom={(r) => setDetailedRoom(r)}
        />
      )}

      {/* LAZY LOADED GUEST AI ASSISTANT CHATBOT */}
      {currentRole === 'Guest' && loggedInGuest !== null && (
        <React.Suspense fallback={null}>
          <ChatbotWidget />
        </React.Suspense>
      )}

    </div>
  );
}
