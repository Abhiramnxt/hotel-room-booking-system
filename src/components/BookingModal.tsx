/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, Check, Sparkles, Receipt, ShieldCheck, AlertCircle, RefreshCw, Smartphone 
} from 'lucide-react';
import { Room } from '../types';
import { playSound } from '../soundUtils';

interface BookingModalProps {
  room: Room;
  checkInDate: string;
  checkOutDate: string;
  onClose: () => void;
  onBookingSuccess: () => void;
}

export function BookingModal({ room, checkInDate, checkOutDate, onClose, onBookingSuccess }: BookingModalProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room>(room);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [govId, setGovId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Cash'>('UPI');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // AI Upsell Recommendation State
  const [aiUpsell, setAiUpsell] = useState<{
    has_upgrade: boolean;
    recommendedRoom?: Room;
    pitch?: string;
    discountedDifference?: number;
    model?: string;
  } | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [upgradeAccepted, setUpgradeAccepted] = useState(false);

  // Nights count calculation
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Cost calculations
  const priceUnit = selectedRoom.price_per_night;
  const baseCost = priceUnit * nights;
  const gstRate = priceUnit >= 7500 ? 0.18 : 0.12; // Standard Indian hotel slab
  const gstAmount = Math.round(baseCost * gstRate);
  const totalCost = baseCost + gstAmount;

  // Query AI for premium upgrade suggestions
  useEffect(() => {
    const fetchAiUpgrade = async () => {
      setIsLoadingAi(true);
      try {
        const res = await fetch('/api/ai/suggest-upgrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_room_id: room.room_id,
            check_in_date: checkInDate,
            check_out_date: checkOutDate
          })
        });
        if (res.ok) {
          const data = await res.json();
          setAiUpsell(data);
        }
      } catch (err) {
        console.warn("Could not query AI upgrade recommendations:", err);
      } finally {
        setIsLoadingAi(false);
      }
    };

    fetchAiUpgrade();
  }, [room, checkInDate, checkOutDate]);

  const handleAcceptUpgrade = () => {
    if (aiUpsell?.recommendedRoom) {
      playSound('success');
      setSelectedRoom(aiUpsell.recommendedRoom);
      setUpgradeAccepted(true);
    }
  };

  const handleDeclineUpgrade = () => {
    playSound('tap');
    setSelectedRoom(room);
    setUpgradeAccepted(false);
    setAiUpsell(null); // hide recommendation card
  };

  const handlePaymentMethodSelect = (method: typeof paymentMethod) => {
    playSound('tap');
    setPaymentMethod(method);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestEmail || !guestPhone || !govId) {
      setErrorMessage("Please fill all databases fields precisely.");
      playSound('tap');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    playSound('confirm');

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: guestName,
          email: guestEmail,
          mobile_number: guestPhone,
          address: guestAddress,
          government_id: govId,
          room_id: selectedRoom.room_id,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          payment_method: paymentMethod
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Stay dates validation failed.");
      }

      playSound('success');
      onBookingSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong during transactional creation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" id="booking_modal_overlay">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-y-auto md:overflow-hidden border border-slate-100 flex flex-col md:flex-row max-h-full md:max-h-[90vh]" id="booking_modal_inner">
        
        {/* Left Side: Booking fields Form */}
        <div className="flex-1 p-6 md:p-8 md:overflow-y-auto">
          <div className="flex justify-between items-center pb-4 border-b">
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading">
                Guest Stay Verification
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Sai Nirvana Plaza Reservation Desk
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            
            {/* Stay Dates Info Details */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border text-xs">
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Check-In</span>
                <span className="font-bold text-slate-800">{checkInDate} (12:00 PM)</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Check-Out</span>
                <span className="font-bold text-slate-800">{checkOutDate} (11:00 AM)</span>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Guest Basic Details Column */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Guest Name *</label>
                <input 
                  type="text" required
                  value={guestName} onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Abhiram Thunikipati"
                  className="w-full text-xs p-2.5 bg-slate-50/50 border rounded-lg focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                  <input 
                    type="email" required
                    value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="e.g. customer@example.com"
                    className="w-full text-xs p-2.5 bg-slate-50/50 border rounded-lg focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mobile number *</label>
                  <input 
                    type="tel" required
                    value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full text-xs p-2.5 bg-slate-50/50 border rounded-lg focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Government ID (Aadhaar / Passport) *</label>
                <input 
                  type="text" required
                  value={govId} onChange={(e) => setGovId(e.target.value)}
                  placeholder="e.g. Aadhaar: XXXX-XXXX-XXXX"
                  className="w-full text-xs p-2.5 bg-slate-50/50 border rounded-lg focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors animate-pulse"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Home Address</label>
                <input 
                  type="text"
                  value={guestAddress} onChange={(e) => setGuestAddress(e.target.value)}
                  placeholder="e.g. Sector 12, Dwarka, Delhi"
                  className="w-full text-xs p-2.5 bg-slate-50/50 border rounded-lg focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Payment Method UI Grid */}
            <div className="pt-2">
              <label className="text-xs font-bold text-slate-700 block mb-2">Simulated payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {(['UPI', 'Credit Card', 'Cash'] as const).map((method) => {
                  const isSelected = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => handlePaymentMethodSelect(method)}
                      className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5 ${
                        isSelected 
                          ? 'border-[#003366] bg-[#003366]/5 text-[#003366]' 
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[#003366]" />}
                      {method}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Complete Reservation Action block */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#001f3f] to-[#003366] hover:from-[#003366] hover:to-[#001f3f] text-[#F9D976] border border-[#D4AF37]/35 font-bold py-3 px-6 rounded-xl text-xs sm:text-sm shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-[#F9D976]" />
                    <span>Executing MySQL Transactions...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 text-[#F9D976]" />
                    <span>Confirm Stay & Dynamic Payment (₹{totalCost.toLocaleString('en-IN')})</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* Right Side: Stay Summary, Cost & AI recommendations */}
        <div className="w-full md:w-[360px] bg-gradient-to-b from-[#001f3f] to-[#002b54] text-white p-6 md:p-8 flex flex-col justify-between border-t md:border-t-0 md:border-l border-[#D4AF37]/25 md:overflow-y-auto">
          <div className="space-y-6">
            
            {/* Selected Cabin/Room Block */}
            <div>
              <span className="text-[10px] text-[#F9D976] uppercase tracking-widest font-bold">Selected Chamber</span>
              <h4 className="text-lg font-bold font-heading mt-1">{selectedRoom.room_type}</h4>
              <p className="text-xs text-slate-350 mt-1">Room {selectedRoom.room_number} • Capacity {selectedRoom.capacity} Guests</p>
            </div>

            {/* AI SUGGESTION IF ACTIVE AND LOADING */}
            {isLoadingAi && (
              <div className="bg-[#001f3f]/50 p-4 rounded-xl border border-dashed border-[#D4AF37]/30 text-center text-xs text-slate-300 space-y-2">
                <Sparkles className="h-4 w-4 text-[#F9D976] animate-spin mx-auto" />
                <p>Generating premium upgrade suggestions via Gemini AI...</p>
              </div>
            )}

            {/* AI Recommendation Box if loaded and present */}
            {aiUpsell && aiUpsell.has_upgrade && !upgradeAccepted && (
              <div className="bg-gradient-to-br from-[#003366] via-[#001f3f] to-[#003366] p-4 rounded-[20px] border-[2.683761px] border-[#D4AF37]/45 text-xs shadow-md space-y-3 relative overflow-hidden">
                <div className="flex items-center gap-1.5 text-[#F9D976] font-bold uppercase text-[9px] tracking-wider">
                  <Sparkles className="h-4 w-4 text-[#F9D976] fill-amber-500/20" />
                  <span>Sai Guest Copilot Recommend</span>
                </div>
                
                <p className="text-slate-100 leading-relaxed text-[11px] font-sans">
                  "{aiUpsell.pitch}"
                </p>

                <div className="flex gap-2 pt-1.5">
                  <button 
                    type="button" 
                    onClick={handleAcceptUpgrade}
                    className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#F9D976] text-[#001f3f] font-extrabold p-1.5 rounded text-[10px] uppercase tracking-wider transition-colors border border-[#D4AF37]"
                  >
                    Accept Upgrade
                  </button>
                  <button 
                    type="button" 
                    onClick={handleDeclineUpgrade}
                    className="bg-[#001f3f] hover:bg-slate-800 text-slate-300 font-bold px-2.5 py-1.5 rounded text-[10px] border border-white/10"
                  >
                    No Thanks
                  </button>
                </div>
              </div>
            )}

            {upgradeAccepted && (
              <div className="bg-emerald-950/80 p-3 rounded-lg border border-emerald-500/30 text-xs flex gap-2 items-start text-emerald-300">
                <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[10px] text-emerald-400 font-mono">UPGRADE ENGAGED!</span>
                  Successfully moved up to premium suite. 10% AI deduction mapped.
                </div>
              </div>
            )}

            {/* Cost Taxes Billing Receipt */}
            <div className="border-t border-white/10 pt-4 space-y-2.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <Receipt className="h-3.5 w-3.5 text-[#F9D976]" />
                <span>GST Tax Invoice Breakup</span>
              </h5>
              
              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Price Per Night:</span>
                  <span className="font-mono text-slate-100">₹{priceUnit.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Nights:</span>
                  <span className="font-mono text-slate-100">{nights} {nights === 1 ? 'Night' : 'Nights'}</span>
                </div>
                <div className="flex justify-between text-slate-350">
                  <span>Room Cost:</span>
                  <span className="font-mono">₹{baseCost.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2 text-slate-350">
                  <span>GST Taxes ({(gstRate * 100).toFixed(0)}%):</span>
                  <span className="font-mono">₹{gstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-2 text-sm text-[#F9D976] font-bold">
                  <span>Total Stay Cost:</span>
                  <span className="font-mono text-lg">₹{totalCost.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Secure Trust badge */}
          <div className="mt-8 border-t border-slate-850 pt-4 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-slate-500" />
              <span>Relational SQL Safety Lock</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
