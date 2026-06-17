import React, { useState, useEffect } from 'react';
import { 
  X, Star, Maximize2, ChevronLeft, ChevronRight, Wifi, Tv, Coffee, Wind,
  Layers, Lock, Monitor, ShieldAlert, Calendar, Users, Square, Eye, 
  ArrowRight, ShieldCheck, Heart, Share2, Sparkles, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Room } from '../types';
import { playSound } from '../soundUtils';
import { RoomImage } from './RoomImage';
import { getOptimizedImageUrl } from '../image_data';

interface RoomDetailsPageProps {
  room: Room;
  allRooms: Room[];
  currentCheckIn: string;
  currentCheckOut: string;
  onClose: () => void;
  onBookNow: (room: Room, checkIn: string, checkOut: string) => void;
  onSelectRoom: (room: Room) => void;
}

const MotionRoomImage = motion(RoomImage);

export function RoomDetailsPage({
  room,
  allRooms,
  currentCheckIn,
  currentCheckOut,
  onClose,
  onBookNow,
  onSelectRoom
}: RoomDetailsPageProps) {
  
  // Gallery states
  const gallery = room.gallery_images || [room.image_url];
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [renderAllThumbnails, setRenderAllThumbnails] = useState(false);

  // Booking details state pre-populated with current values
  const [checkIn, setCheckIn] = useState(currentCheckIn);
  const [checkOut, setCheckOut] = useState(currentCheckOut);

  // Simple static booked list. Let's make some random dates booked per room to show in calendar
  const [reservedDates, setReservedDates] = useState<string[]>([]);

  useEffect(() => {
    // Generate a couple of mock reserved dates for this room to show occupancy calendar
    const hash = room.room_id * 7;
    const reserved = [
      `2026-06-${(hash % 5) + 12 < 10 ? '0' + ((hash % 5) + 12) : (hash % 5) + 12}`,
      `2026-06-${(hash % 5) + 13 < 10 ? '0' + ((hash % 5) + 13) : (hash % 5) + 13}`,
      `2026-06-${(hash % 3) + 21 < 10 ? '0' + ((hash % 3) + 21) : (hash % 3) + 21}`
    ];
    setReservedDates(reserved);
    setActivePhotoIdx(0);
    setZoomScale(1);
    
    // Background deferment of gallery thumbnails beyond the first 3
    setRenderAllThumbnails(false);
    const timer = setTimeout(() => {
      setRenderAllThumbnails(true);
    }, 200);
    return () => clearTimeout(timer);
  }, [room]);

  // Preload NEXT image only (the main image is already active)
  useEffect(() => {
    if (gallery && gallery.length > 1) {
      const nextIdx = (activePhotoIdx + 1) % gallery.length;
      const nextUrl = getOptimizedImageUrl(gallery[nextIdx], 1200, 85);
      const img = new Image();
      img.src = nextUrl;
    }
  }, [activePhotoIdx, gallery]);

  // Pricing math
  const basePrice = room.price_per_night;
  
  // Count booking nights
  const getNights = () => {
    try {
      const d1 = new Date(checkIn);
      const d2 = new Date(checkOut);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return isNaN(diffDays) ? 1 : diffDays;
    } catch {
      return 1;
    }
  };

  const nights = getNights();
  const subTotalForNights = basePrice * nights;
  const gstAmount = Math.round(subTotalForNights * 0.12);
  const grandTotal = subTotalForNights + gstAmount;

  // Filter recommendations of the exact same category, excluding active room
  const similarRooms = React.useMemo(() => {
    return allRooms
      .filter(r => r.room_type === room.room_type && r.room_id !== room.room_id)
      .slice(0, 3);
  }, [allRooms, room.room_type, room.room_id]);

  // Lightbox navigation
  const nextPhoto = () => {
    playSound('click');
    setActivePhotoIdx((prev) => (prev + 1) % gallery.length);
  };

  const prevPhoto = () => {
    playSound('click');
    setActivePhotoIdx((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  // Select dates inside calendar handler
  const handleCalendarDayClick = (dateStr: string) => {
    playSound('click');
    if (reservedDates.includes(dateStr)) {
      return; // can't click reserved
    }
    // Set check-in if not set or if we click a date before current check-in
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(dateStr);
      setCheckOut('');
    } else {
      if (dateStr > checkIn) {
        setCheckOut(dateStr);
      } else {
        setCheckIn(dateStr);
      }
    }
  };

  // Calendar render details
  const renderCalendarDays = () => {
    const days = [];
    const baseMonth = 5; // June (0-indexed is 5)
    
    // We render June 2026 (starting on Monday, June 1, 2026)
    // June 1, 2026 is a Monday. June has 30 days.
    for (let day = 1; day <= 30; day++) {
      const dateStr = `2026-06-${day < 10 ? '0' + day : day}`;
      const isReserved = reservedDates.includes(dateStr);
      const isSelectedCheckIn = checkIn === dateStr;
      const isSelectedCheckOut = checkOut === dateStr;
      const isRange = checkIn && checkOut && dateStr > checkIn && dateStr < checkOut;

      let bgClass = "bg-slate-50 text-slate-800 hover:bg-[#003366]/10";
      if (isReserved) {
        bgClass = "bg-rose-100/70 text-rose-500 line-through cursor-not-allowed border border-rose-200/40";
      } else if (isSelectedCheckIn) {
        bgClass = "bg-[#003366] text-white font-bold ring-2 ring-[#D4AF37]";
      } else if (isSelectedCheckOut) {
        bgClass = "bg-[#003366] text-white font-bold ring-2 ring-[#D4AF37]";
      } else if (isRange) {
        bgClass = "bg-[#003366]/15 text-[#003366] font-semibold";
      }

      days.push(
        <button
          key={day}
          disabled={isReserved}
          onClick={() => handleCalendarDayClick(dateStr)}
          className={`h-9 w-full flex flex-col items-center justify-center rounded-lg text-xs transition-all duration-200 ${bgClass}`}
        >
          <span>{day}</span>
          {isReserved && <span className="text-[7px] text-rose-500 uppercase tracking-widest font-extrabold uppercase">Full</span>}
          {isSelectedCheckIn && <span className="text-[7px] text-amber-300 font-bold uppercase">In</span>}
          {isSelectedCheckOut && <span className="text-[7px] text-amber-300 font-bold uppercase">Out</span>}
        </button>
      );
    }
    return days;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Occupied':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'Dirty':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default:
        return 'bg-slate-550/10 text-slate-400 border border-slate-550/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 md:p-8 animate-fade-in">
      <div className="bg-slate-900 border border-[#D4AF37]/30 text-white rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col relative">
        
        {/* Sticky top action tools */}
        <div className="sticky top-0 bg-slate-900/90 backdrop-blur-md px-6 py-4 border-b border-white/10 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[11px] uppercase tracking-widest text-[#F9D976] font-extrabold font-mono">
              Sri Nirvana Resort Inventory Standard
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { playSound('click'); alert("Sri Nirvana share link copied to clipboard!"); }}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition duration-150 text-slate-350 hover:text-white"
              title="Share Chamber Link"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button 
              onClick={() => { playSound('click'); onClose(); }}
              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition duration-150 text-rose-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Core details view body layout */}
        <div className="p-6 md:p-8 space-y-8 flex-1">
          
          {/* Section 1: Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#D4AF37]/20 border border-[#D4AF37]/45 text-[#F9D976] text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md">
                  {room.room_type}
                </span>
                <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md ${getStatusBadgeColor(room.room_status)}`}>
                  {room.room_status}
                </span>
                <span className="text-slate-400 text-xs font-mono">
                  No. {room.room_number}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight mt-2 text-slate-100">
                {room.room_name || `${room.room_type} Room ${room.room_number}`}
              </h2>
              <div className="flex items-center gap-1.5 mt-1.5 text-slate-300 text-xs text-amber-400">
                <div className="flex gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
                  <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
                  <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
                  <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
                  <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
                </div>
                <span className="text-slate-300 text-[11px] font-mono">(4.9/5 Rating - Elite Guest Certified stays)</span>
              </div>
            </div>

            <div className="bg-[#002244]/80 border border-[#D4AF37]/35 p-3.5 px-6 rounded-2xl flex flex-col text-right items-end">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider font-mono">Guaranteed Best Rate</span>
              <span className="text-xl sm:text-2xl font-black text-[#F9D976] font-mono mt-0.5">
                ₹{basePrice.toLocaleString('en-IN')} <span className="text-xs text-slate-300 font-normal">/ Night</span>
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Excludes GST calculated on selection</span>
            </div>
          </div>          {/* Section 2: Immersive 4K Gallery Grid */}
          <div className="space-y-3">
            {/* Main Stage */}
            <div className="relative h-64 sm:h-[400px] rounded-2xl overflow-hidden group border border-white/5 bg-slate-950">
              <AnimatePresence mode="wait">
                <MotionRoomImage 
                  key={activePhotoIdx}
                  src={gallery[activePhotoIdx]} 
                  alt={`${room.room_type} View ${activePhotoIdx + 1}`}
                  category={room.room_type}
                  width={1200}
                  quality={85}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AnimatePresence>
              {/* Overlay with image counter */}
              <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-mono">
                Photo {activePhotoIdx + 1} of {gallery.length} (Ultra HD 4K Resort Capture)
              </div>

              {/* Quick light-box click to zoom */}
              <button 
                onClick={() => { playSound('click'); setIsLightboxOpen(true); }}
                className="absolute top-4 right-4 p-2 bg-slate-955/80 hover:bg-[#003366] text-white rounded-xl border border-white/10 transition duration-150 cursor-pointer"
                title="Expand Full Screen Gallery"
              >
                <Maximize2 className="h-4 w-4" />
              </button>

              {/* Prev Next arrows */}
              <div className="absolute inset-y-0 left-0 right-0 flex justify-between items-center px-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition duration-200">
                <button 
                  onClick={prevPhoto}
                  className="p-3 rounded-full bg-slate-900/85 hover:bg-[#003366] text-white border border-white/10 transition-all cursor-pointer shadow-lg hover:scale-105"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button 
                  onClick={nextPhoto}
                  className="p-3 rounded-full bg-slate-900/85 hover:bg-[#003366] text-white border border-white/10 transition-all cursor-pointer shadow-lg hover:scale-105"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Micro Thumbnail Stream */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 overflow-x-auto py-1">
              {gallery.map((photo, index) => {
                const isDeferred = index >= 3 && !renderAllThumbnails;

                return (
                  <button
                    key={index}
                    onClick={() => { 
                      if (!isDeferred) {
                        playSound('click'); 
                        setActivePhotoIdx(index); 
                      }
                    }}
                    disabled={isDeferred}
                    className={`relative h-11 sm:h-14 rounded-lg overflow-hidden border transition bg-slate-950 cursor-pointer ${
                      activePhotoIdx === index 
                        ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/50 opacity-100' 
                        : 'border-white/10 opacity-60 hover:opacity-100'
                    } ${isDeferred ? 'animate-pulse bg-slate-800' : ''}`}
                  >
                    {isDeferred ? (
                      <div className="w-full h-full bg-indigo-950/20 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/40" />
                      </div>
                    ) : (
                      <>
                        <RoomImage 
                          src={photo} 
                          alt="thumbnail" 
                          category={room.room_type} 
                          width={200}
                          quality={70}
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/10 hover:bg-transparent" />
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Dual Column Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
            
            {/* Left Side: Room details descriptions, amenities, reviews */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Elegant Copywrite */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold font-heading text-slate-100 flex items-center gap-2 border-b border-white/10 pb-2">
                  <Layers className="h-4 w-4 text-[#D4AF37]" />
                  <span>The Nirvana Experience</span>
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {room.description || "Indulge in a space where architecture meets ultimate wellness hospitality. Expertly curated room features represent a modern retreat environment fitted with elite structural styling, high-contrast amenities, and pristine view vistas."}
                </p>
              </div>

              {/* Room Specs Bento Layout */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/40 p-4 rounded-2xl border border-white/5 text-center">
                <div className="p-3 bg-slate-900/60 rounded-xl">
                  <Square className="h-4 w-4 mx-auto text-[#D4AF37] mb-1.5" />
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Room Size</p>
                  <p className="text-sm font-bold mt-0.5">{room.size_sqft || 350} SQFT</p>
                </div>
                
                <div className="p-3 bg-slate-900/60 rounded-xl">
                  <Users className="h-4 w-4 mx-auto text-[#D4AF37] mb-1.5" />
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Max Guests</p>
                  <p className="text-sm font-bold mt-0.5">{room.capacity} Adults</p>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl">
                  <Star className="h-4 w-4 mx-auto text-[#D4AF37] mb-1.5" />
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Bed Configuration</p>
                  <p className="text-xs font-bold mt-0.5 truncate">{room.bed_type || "Kingsized Luxury bed"}</p>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl">
                  <Eye className="h-4 w-4 mx-auto text-[#D4AF37] mb-1.5" />
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Window Vista</p>
                  <p className="text-xs font-bold mt-0.5 truncate">{room.view_type || "Plaza Overlook View"}</p>
                </div>
              </div>

              {/* Master Amenities Checklist */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold font-heading text-slate-100 flex items-center gap-2 border-b border-white/10 pb-2">
                  <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                  <span>Premium Curated Amenities</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <div className="bg-[#003366] p-1.5 rounded-lg text-[#F9D976]"><Wifi className="h-3.5 w-3.5" /></div>
                    <span>High-Speed Wi-Fi</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <div className="bg-[#003366] p-1.5 rounded-lg text-[#F9D976]"><Wind className="h-3.5 w-3.5" /></div>
                    <span>Whisper Air Conditioning</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <div className="bg-[#003366] p-1.5 rounded-lg text-[#F9D976]"><Tv className="h-3.5 w-3.5" /></div>
                    <span>4K Smart TV</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <div className="bg-[#003366] p-1.5 rounded-lg text-[#F9D976]"><Coffee className="h-3.5 w-3.5" /></div>
                    <span>Nespresso/Coffee Station</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <div className="bg-[#003366] p-1.5 rounded-lg text-[#F9D976]"><Layers className="h-3.5 w-3.5" /></div>
                    <span>Mini Refreshing Refrigerator</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <div className="bg-[#003366] p-1.5 rounded-lg text-[#F9D976]"><Lock className="h-3.5 w-3.5" /></div>
                    <span>Digital Bio-Safe Vault</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <div className="bg-[#003366] p-1.5 rounded-lg text-[#F9D976]"><Monitor className="h-3.5 w-3.5" /></div>
                    <span>Ergonomic Luxury Desk</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <div className="bg-[#003366] p-1.5 rounded-lg text-[#F9D976]"><Users className="h-3.5 w-3.5" /></div>
                    <span>24/7 Priority Room Service</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <div className="bg-[#003366] p-1.5 rounded-lg text-[#F9D976]"><ShieldCheck className="h-3.5 w-3.5" /></div>
                    <span>Certified Fresh Guest Services</span>
                  </div>
                </div>
              </div>

              {/* Guest Verified Reviews */}
              <div className="space-y-4 pt-1">
                <h3 className="text-lg font-bold font-heading text-slate-100 flex items-center gap-2 border-b border-white/10 pb-2">
                  <Star className="h-4 w-4 text-[#D4AF37]" />
                  <span>Verified Guest Feedback logs</span>
                </h3>
                <div className="space-y-3.5">
                  {(room.reviews && room.reviews.length > 0) ? (
                    room.reviews.map((rev, rIdx) => (
                      <div key={rIdx} className="bg-slate-800/30 p-4 border border-white/5 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs font-sans text-slate-200">{rev.reviewer}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{rev.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: rev.rating }).map((_, stIdx) => (
                            <Star key={stIdx} className="h-3 w-3 fill-current text-amber-400" />
                          ))}
                        </div>
                        <p className="text-xs text-slate-300 italic leading-normal">"{rev.comment}"</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-450 italic">No reviews logged yet. Be the first to stay and review!</p>
                  )}
                </div>
              </div>

            </div>

            {/* Right Side: Stay dates selection calendar, real-time pricing calculation table, Book Now CTA */}
            <div className="space-y-6">

              {/* Interactive availability calendar widget */}
              <div className="bg-slate-800/50 p-4.5 border border-white/10 rounded-2xl space-y-3.5">
                <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#F9D976]" />
                    <span className="text-xs font-bold uppercase tracking-wide">Stay Scheduler</span>
                  </div>
                  <span className="bg-[#003366] text-[#F9D976] px-2 py-0.5 rounded text-[10px] font-mono">June 2026</span>
                </div>

                {/* Calendar Day Grid Header */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
                  <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-1">
                  {renderCalendarDays()}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1.5 text-[9px] text-slate-400 border-t border-white/5">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-[#003366]" />
                    <span>Selected</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-rose-100" />
                    <span>Reserved Stay</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-slate-50 border border-slate-200" />
                    <span>Available Openings</span>
                  </div>
                </div>
              </div>

              {/* Exact GST Price calc Table */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-[#D4AF37]/25 space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
                  Pricing & Regulatory Calculations
                </span>
                
                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Base Fare Per Night</span>
                    <span className="font-mono">₹{basePrice.toLocaleString('en-IN')}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Requested stays duration</span>
                    <span className="font-mono font-bold text-[#F9D976]">{nights} {nights > 1 ? 'Nights' : 'Night'}</span>
                  </div>

                  <div className="border-t border-white/5 my-2 pt-2 flex justify-between">
                    <span>Stay Subtotal</span>
                    <span className="font-mono">₹{subTotalForNights.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-[#F9D976]">
                    <span>Luxury GST Surcharge (12%)</span>
                    <span className="font-mono">+ ₹{gstAmount.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="border-t border-white/10 pt-3 flex justify-between items-end text-white">
                    <span className="font-bold text-sm">Grand Consolidated Total</span>
                    <div className="text-right">
                      <p className="text-lg font-black text-emerald-400 font-mono leading-none">
                        ₹{grandTotal.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[8px] text-slate-400 mt-1 uppercase">Tax Calculated under SGST/CGST</p>
                    </div>
                  </div>
                </div>

                {/* Pre-flight booking warning */}
                {room.room_status !== 'Available' ? (
                  <div className="bg-amber-500/10 border border-amber-500/35 p-3 rounded-xl flex gap-2 items-start text-[10px] text-amber-300">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Chamber is currently {room.room_status}. Reservations remain frozen until front desk resets clean status logs.
                    </p>
                  </div>
                ) : (
                  <div className="bg-emerald-500/10 border border-emerald-500/35 p-3 rounded-xl flex gap-2 items-start text-[10px] text-emerald-300">
                    <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Guaranteed instant transactional confirmation with 256-bit hotel reservation index block.
                    </p>
                  </div>
                )}

                {/* Booking call-to-action button */}
                <button
                  disabled={room.room_status !== 'Available' || !checkIn || !checkOut}
                  onClick={() => {
                    playSound('success');
                    onBookNow(room, checkIn, checkOut);
                  }}
                  className={`w-full py-3.5 rounded-xl font-bold font-sans flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    room.room_status === 'Available' && checkIn && checkOut
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#F9D976] hover:from-[#bfa12e] hover:to-[#ebc963] text-slate-900 shadow-lg hover:scale-[1.01] active:scale-95'
                      : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-white/5'
                  }`}
                >
                  <span>Book Secure stayed reservation</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

            </div>

          </div>

          {/* Section 4: Similar Chamber Recommendations */}
          {similarRooms.length > 0 && (
            <div className="pt-6 border-t border-white/10 space-y-4">
              <h3 className="text-lg font-bold font-heading text-slate-100 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#F9D976]" />
                <span>Similar Premium Chambers in this Category</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {similarRooms.map((simRoom) => (
                  <div 
                    key={simRoom.room_id}
                    onClick={() => { playSound('click'); onSelectRoom(simRoom); }}
                    className="bg-slate-800/40 border border-white/5 rounded-xl overflow-hidden hover:border-[#D4AF37]/35 cursor-pointer transition duration-200 flex flex-col group"
                  >
                    <div className="relative h-28 overflow-hidden bg-slate-955">
                      <RoomImage 
                        src={simRoom.image_url} 
                        alt={simRoom.room_type}
                        category={simRoom.room_type}
                        width={500}
                        quality={75}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute top-2 left-2 bg-slate-900/90 text-[9px] font-mono p-1 rounded">
                        No. {simRoom.room_number}
                      </div>
                    </div>
                    
                    <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200 line-clamp-1">
                          {simRoom.room_name || `${simRoom.room_type} Room ${simRoom.room_number}`}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{simRoom.view_type || "Resort Outlook View"}</p>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[11px]">
                        <span className="font-bold text-[#F9D976] font-mono">₹{simRoom.price_per_night.toLocaleString('en-IN')}</span>
                        <span className="text-[9px] text-indigo-400 font-extrabold uppercase">Inspect details</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* FULL SCREEN LIGHTBOX PHOTO PREVIEW */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col justify-between p-4 animate-fade-in text-white select-none">
          {/* Header */}
          <div className="flex justify-between items-center py-2 px-4 border-b border-white/10">
            <span className="text-xs tracking-wider font-mono">Ultra HD 4K Immersive Panorama Stage</span>
            <button 
              onClick={() => { playSound('click'); setIsLightboxOpen(false); setZoomScale(1); }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition duration-150"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Photo stage */}
          <div className="relative flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            <RoomImage 
              src={gallery[activePhotoIdx]} 
              alt="Lightbox" 
              category={room.room_type}
              style={{ transform: `scale(${zoomScale})` }}
              className="max-w-full max-h-[72vh] object-contain rounded-xl transition-transform duration-300"
            />

            {/* Float left right lightbox controls */}
            <div className="absolute inset-x-4 flex justify-between">
              <button 
                onClick={prevPhoto}
                className="p-4 rounded-full bg-slate-900/80 hover:bg-[#003366] text-white border border-white/10 cursor-pointer text-xl"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button 
                onClick={nextPhoto}
                className="p-4 rounded-full bg-slate-900/80 hover:bg-[#003366] text-white border border-white/10 cursor-pointer text-xl"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Footer zoom details and indices */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-white/10 pt-3 px-4 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span>Zoom Scale: {zoomScale}x</span>
              <button 
                onClick={() => { playSound('click'); setZoomScale(s => s === 1 ? 1.5 : (s === 1.5 ? 2 : 1)); }}
                className="px-3 py-1 bg-white/10 hover:bg-[#003366] rounded border border-white/15 cursor-pointer hover:text-white"
              >
                Toggle Magnification
              </button>
            </div>
            <span>Stay Photo {activePhotoIdx + 1} of {gallery.length}</span>
          </div>
        </div>
      )}

    </div>
  );
}
