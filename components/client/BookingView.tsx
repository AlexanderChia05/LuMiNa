import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Users, Star, ChevronRight, Check, Smartphone, CreditCard, Wallet, CheckCircle, Gift, ChevronLeft, Crown, Building2, X, Tag, ExternalLink, QrCode, Lock, Key, Mail } from 'lucide-react';
import { Button, Card, Avatar } from '../UI';
import { Service, Staff, Reward, CreditCard as CreditCardType, Receipt, Appointment, StylistRank, Promotion } from '../../types';
import { getBookingDate, formatCardNumber, formatCardExpiry, formatPhoneNumber, getRankSurcharge, formatSGDate } from '../../utils/helpers';
import { ReceiptCard } from './ReceiptCard';
import { Api } from '../../services/api';
import { AuthService } from '../../services/auth';

const EXTENDED_TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'
];

interface BookingViewProps {
  bookingStep: string;
  setActiveTab: (tab: any) => void;
  setBookingStep: (step: any) => void;
  resetBooking: () => void;
  selectedService: Service | null;
  setSelectedService: (service: Service | null) => void;
  selectedStaff: Staff | null;
  setSelectedStaff: (staff: Staff | null) => void;
  selectedSlot: string | null;
  setSelectedSlot: (slot: string | null) => void;
  selectedDateOffset: number;
  setSelectedDateOffset: (offset: number) => void;
  myVouchers: Reward[];
  selectedVoucher: Reward | null;
  setSelectedVoucher: (voucher: Reward | null) => void;
  paymentMethod: string;
  setPaymentMethod: (method: any) => void;
  savedCards: CreditCardType[];
  selectedCardId: string;
  setSelectedCardId: (id: string) => void;
  setIsAddCardOpen: (open: boolean) => void;
  handlePayment: (receiptData: any) => void; 
  isProcessingPayment: boolean;
  latestReceipt: Receipt | null;
  appointments: Appointment[]; 
  services: Service[];
  staffList: Staff[];
}

export const BookingView = ({
  bookingStep,
  setActiveTab,
  setBookingStep,
  resetBooking,
  selectedService,
  setSelectedService,
  selectedStaff,
  setSelectedStaff,
  selectedSlot,
  setSelectedSlot,
  selectedDateOffset,
  setSelectedDateOffset,
  myVouchers,
  selectedVoucher,
  setSelectedVoucher,
  paymentMethod,
  setPaymentMethod,
  savedCards,
  selectedCardId,
  setSelectedCardId,
  setIsAddCardOpen,
  handlePayment,
  isProcessingPayment,
  latestReceipt,
  appointments,
  services,
  staffList
}: BookingViewProps) => {
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  
  // Payment Simulator State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payStep, setPayStep] = useState<'method' | 'card_details' | 'tng_pin' | 'otp' | 'processing'>('method');
  const [simPaymentMethod, setSimPaymentMethod] = useState<'card' | 'tng'>('card');
  
  // Card Form
  const [cardForm, setCardForm] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [selectedSimCardId, setSelectedSimCardId] = useState<string>('');
  
  // TNG Form
  const [tngPhone, setTngPhone] = useState('');
  const [tngPin, setTngPin] = useState('');
  
  // OTP Form
  const [otp, setOtp] = useState('');
  
  // Errors
  const [payError, setPayError] = useState('');

  // Save Card State
  const [saveNewCard, setSaveNewCard] = useState(false);

  // User Data needed for TNG default phone
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
     const loadUser = async () => {
         const session = await AuthService.getSession();
         if (session?.user) {
             setUserEmail(session.user.email || '');
             setUserId(session.user.id);
             if (session.user.user_metadata?.phone) {
                 setTngPhone(session.user.user_metadata.phone);
             }
             if (session.user.user_metadata?.name) {
                 setCardForm(prev => ({ ...prev, name: session.user.user_metadata.name }));
             }
         }
     };
     loadUser();
  }, []);

  // Use saved cards prop for initial selection
  useEffect(() => {
      if (savedCards.length > 0) setSelectedSimCardId(savedCards[0].id);
  }, [savedCards]);
  
  const validateCard = () => {
      // Logic for new card (Applied to both Main Booking Flow and Simulator)
      const methodToCheck = isPaymentModalOpen ? simPaymentMethod : paymentMethod;

      if (!selectedSimCardId && methodToCheck === 'card') {
          const cleanNum = cardForm.number.replace(/\D/g, '');
          
          // 1. Check Brand (Visa = 4, Mastercard = 2 or 5)
          if (!cleanNum.startsWith('4') && !cleanNum.startsWith('5') && !cleanNum.startsWith('2')) {
              return "Only Visa (starts with 4) and Mastercard (starts with 2 or 5) are accepted.";
          }
          
          if (cleanNum.length < 15 || cleanNum.length > 19) return "Invalid card number length.";
          
          // 2. Check Expiry
          if (!cardForm.expiry || cardForm.expiry.length !== 5) return "Invalid expiry.";
          const [mm, yy] = cardForm.expiry.split('/').map(Number);
          const now = new Date();
          const curYear = parseInt(now.getFullYear().toString().slice(-2));
          const curMonth = now.getMonth() + 1;
          
          if (!mm || !yy || mm < 1 || mm > 12) return "Invalid month.";
          
          // Expired Check
          if (yy < curYear || (yy === curYear && mm < curMonth)) return "Card has expired.";
          
          // 10-Year Validity Window Check
          if (yy > curYear + 10) return "Card expiry year is invalid (must be within 10 years).";

          // 3. Check CVC
          if (cardForm.cvc.length < 3) return "Invalid CVC.";
          
          // 4. Check Holder Name
          if (!cardForm.name.trim()) return "Cardholder name is required.";
      }
      return null;
  };

  // Promotion Logic
  const [applicablePromotions, setApplicablePromotions] = useState<Promotion[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);

  useEffect(() => {
     const checkPromotions = async () => {
        if (!selectedService) {
           setApplicablePromotions([]);
           // Selection logic is handled by auto-apply effect
           return;
        }
        const promos = await Api.getPromotions();
        const now = new Date();
        
        const validPromos = promos.filter(p => {
           if (!p.active) return false;
           // Check if promo applies to selected service (if applicableServices list exists)
           if (p.applicableServices && p.applicableServices.length > 0 && !p.applicableServices.includes(selectedService.id)) {
               return false;
           }
           
           const start = new Date(p.startDate);
           const end = new Date(p.endDate);
           end.setHours(23, 59, 59, 999);
           
           return now >= start && now <= end;
        });
        
        setApplicablePromotions(validPromos);
     };
     checkPromotions();
  }, [selectedService]);

  // Auto-apply Best Offer (Promotions or Vouchers)
  useEffect(() => {
      if (!selectedService) return;

      const base = selectedService.priceCents;
      const surcharge = selectedStaff ? getRankSurcharge(selectedStaff.rank) : 0;
      const total = base + surcharge;

      let bestDiscount = 0;
      let bestType: 'promo' | 'voucher' | null = null;
      let bestItem: any = null;

      // 1. Evaluate Promotions
      applicablePromotions.forEach(p => {
          let discount = 0;
          const label = p.discount;
          if (label.includes('%')) {
              const percentage = parseInt(label.replace(/\D/g, ''));
              if (!isNaN(percentage)) discount = Math.round(base * (percentage / 100)); // Promo usually on service base price
          } else if (label.toLowerCase().includes('rm')) {
              const amount = parseInt(label.replace(/\D/g, ''));
              if (!isNaN(amount)) discount = amount * 100;
          }
          
          if (discount > bestDiscount) {
              bestDiscount = discount;
              bestType = 'promo';
              bestItem = p;
          }
      });

      // 2. Evaluate Vouchers
      myVouchers.forEach(v => {
          let discount = 0;
          const isPercentage = v.title.includes('%');
          
          if (isPercentage) {
               const percentage = parseInt(v.title.replace(/\D/g, ''));
               if (!isNaN(percentage)) discount = Math.round(total * (percentage / 100));
          } else {
               // Fixed voucher valid only if less than total
               if (v.discountCents < total) {
                   discount = v.discountCents;
               } else {
                   discount = 0; 
               }
          }

          if (discount > bestDiscount) {
              bestDiscount = discount;
              bestType = 'voucher';
              bestItem = v;
          }
      });

      // 3. Apply Best
      if (bestType === 'promo') {
          setSelectedPromotion(bestItem);
          setSelectedVoucher(null);
      } else if (bestType === 'voucher') {
          setSelectedVoucher(bestItem);
          setSelectedPromotion(null);
      } else {
          // Keep current if manually selected? Or reset?
          // Requirement says "Auto-apply", implying override.
          setSelectedPromotion(null);
          setSelectedVoucher(null);
      }

  }, [applicablePromotions, myVouchers, selectedService, selectedStaff]);

  // Sort Vouchers by Expiry Date (Nearest first)
  const sortedVouchers = [...myVouchers].sort((a, b) => {
      if (!a.expiryDate || a.expiryDate === 'No Expiry') return 1;
      if (!b.expiryDate || b.expiryDate === 'No Expiry') return -1;
      
      const [d1, m1, y1] = a.expiryDate.split('/').map(Number);
      const [d2, m2, y2] = b.expiryDate.split('/').map(Number);
      
      const dateA = new Date(y1, m1 - 1, d1);
      const dateB = new Date(y2, m2 - 1, d2);
      
      return dateA.getTime() - dateB.getTime();
  });

  const handleSelectOffer = (item: Promotion | Reward, type: 'promo' | 'voucher') => {
      if (type === 'promo') {
          const p = item as Promotion;
          if (selectedPromotion?.id !== p.id) {
             setSelectedPromotion(p);
             setSelectedVoucher(null);
          }
      } else {
          const v = item as Reward;

          // Check if total amount is greater than voucher amount (for fixed discount vouchers)
          const basePrice = selectedService?.priceCents || 0;
          const rankSurcharge = selectedStaff ? getRankSurcharge(selectedStaff.rank) : 0;
          const estimatedTotal = basePrice + rankSurcharge;

          if (!v.title.includes('%')) {
             if (v.discountCents >= estimatedTotal) {
                 return; // Do nothing if blocked
             }
          }

          if (selectedVoucher?.id !== v.id) {
              setSelectedVoucher(v);
              setSelectedPromotion(null);
          }
      }
  };

  const getRankLabel = (rank: StylistRank) => {
    switch (rank) {
      case 'Senior Director Stylist': return '+RM 50';
      case 'Director Stylist': return '+RM 30';
      default: return '';
    }
  };

  const generateCalendarDays = () => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) { days.push(null); }
    for (let i = 1; i <= daysInMonth; i++) { days.push(new Date(year, month, i)); }
    return days;
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 5); 
    return date < minDate;
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    const today = new Date();
    today.setHours(0,0,0,0);
    const exactOffset = Math.floor((date.getTime() - today.getTime()) / (1000 * 3600 * 24)) - 5;
    setSelectedDateOffset(exactOffset);
  };

  const isSlotTaken = (time: string) => {
    if (time === '13:00') return true;
    if (!selectedStaff) return false;
    const dateObj = getBookingDate(selectedDateOffset);
    return appointments.some(appt => {
      if (appt.staffId !== selectedStaff.id) return false;
      const apptDate = new Date(appt.date);
      const isSameDay = apptDate.getDate() === dateObj.getDate() && apptDate.getMonth() === dateObj.getMonth() && apptDate.getFullYear() === dateObj.getFullYear();
      if (!isSameDay) return false;
      if (appt.status === 'cancelled') return false;
      const [hours, minutes] = time.split(':').map(Number);
      return apptDate.getHours() === hours && apptDate.getMinutes() === minutes;
    });
  };

  const renderCalendar = () => {
    const days = generateCalendarDays();
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const currentMonthStr = currentCalendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    const selectedDate = getBookingDate(selectedDateOffset);
    selectedDate.setHours(0,0,0,0);

    return (
      <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-rose-100 dark:border-white/10 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" /></button>
          <span className="font-bold text-gray-900 dark:text-white">{currentMonthStr}</span>
          <button onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><ChevronRight size={20} className="text-gray-600 dark:text-gray-300" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2 text-center">{weekDays.map(d => <span key={d} className="text-xs font-bold text-gray-400 uppercase">{d}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, idx) => {
            if (!date) return <div key={idx} />;
            const disabled = isDateDisabled(date);
            const isSelected = date.getTime() === selectedDate.getTime();
            return (
              <button key={idx} onClick={() => handleDateClick(date)} disabled={disabled} className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-all ${isSelected ? 'bg-rose-500 text-white shadow-md' : ''} ${!isSelected && !disabled ? 'text-gray-900 dark:text-white hover:bg-rose-50 dark:hover:bg-white/10' : ''} ${disabled ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50' : ''}`}>{date.getDate()}</button>
            );
          })}
        </div>
      </div>
    );
  };

  // Helper to format date explicitly as "Tue, 16 Dec 2025"
  const getFormattedDate = (date: Date) => {
    const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    return `${weekday}, ${day} ${month} ${year}`;
  };

  // BILLING LOGIC
  const basePrice = selectedService?.priceCents || 0;
  const rankSurcharge = selectedStaff ? getRankSurcharge(selectedStaff.rank) : 0;
  let discount = 0;

  // Prioritize Selected Promotion logic
  if (selectedPromotion) {
      const label = selectedPromotion.discount;
      if (label.includes('%')) {
          const percentage = parseInt(label.replace(/\D/g, ''));
          if (!isNaN(percentage)) discount = Math.round(basePrice * (percentage / 100));
      } else if (label.toLowerCase().includes('rm')) {
         const amount = parseInt(label.replace(/\D/g, ''));
         if (!isNaN(amount)) discount = amount * 100;
      }
  } else if (selectedVoucher) {
      if (selectedVoucher.title.includes('%')) {
         const percentage = parseInt(selectedVoucher.title);
         const gross = basePrice + rankSurcharge;
         discount = Math.round(gross * (percentage / 100));
      } else {
         discount = selectedVoucher.discountCents;
      }
  }

  let taxableAmount = basePrice + rankSurcharge;
  if (selectedPromotion) {
     taxableAmount = (basePrice - discount) + rankSurcharge;
  } else if (selectedVoucher) {
     taxableAmount = (basePrice + rankSurcharge) - discount;
  }
  
  taxableAmount = Math.max(0, taxableAmount);
  
  const sstCents = Math.round(taxableAmount * 0.08);
  const totalBeforeRounding = taxableAmount + sstCents;
  
  const amountRM = totalBeforeRounding / 100;
  const roundedRM = (Math.round(amountRM * 20) / 20);
  const finalTotalCents = Math.round(roundedRM * 100);
  const roundingCents = finalTotalCents - totalBeforeRounding;

  // Current Estimated Total for Voucher Validation
  const estimatedTotal = basePrice + rankSurcharge;

  // --- PAYMENT SIMULATOR LOGIC ---
  const openPaymentModal = () => {
      setIsPaymentModalOpen(true);
      setPayStep('method');
      setPayError('');
      setSimPaymentMethod('card');
      setOtp('');
      setTngPin('');
      setSaveNewCard(false); // Reset Checkbox
  };

  const proceedToOTP = async () => {
      setPayError('');
      if (simPaymentMethod === 'card') {
          const err = validateCard();
          if (err) {
              setPayError(err);
              return;
          }
          
          setPayStep('processing');
          
          // Send OTP via Supabase
          const { error } = await AuthService.sendLoginOtp(userEmail);
          
          if (error) {
              setPayStep('card_details');
              setPayError("Failed to send OTP. Please try again.");
              return;
          }

          setPayStep('otp');
      } else {
          // TNG Flow
          if (tngPin.length !== 6) {
              setPayError("PIN must be 6 digits.");
              return;
          }
          setPayStep('processing');
          // Verify PIN via API
          const isValid = await Api.verifyTransactionPin(userId, tngPin);
          if (isValid) {
              completePayment();
          } else {
              setPayStep('tng_pin');
              setPayError("Invalid PIN. Please try again.");
          }
      }
  };

  const verifyOTP = async () => {
      if (simPaymentMethod === 'card') {
           setPayStep('processing');
           const { error } = await AuthService.verifyOtp(userEmail, otp, 'email');
           
           if (error) {
               setPayStep('otp');
               setPayError("Invalid OTP. Please check your email.");
           } else {
               completePayment();
           }
      } else {
          if (otp.length === 6) { 
              completePayment();
          } else {
              setPayError("Invalid OTP.");
          }
      }
  };

  const completePayment = async () => {
      setPayStep('processing');
      
      // Save Card Logic
      if (simPaymentMethod === 'card' && !selectedSimCardId && saveNewCard && userId) {
          try {
              const cleanNum = cardForm.number.replace(/\D/g, '');
              const brand = cleanNum.startsWith('4') ? 'visa' : 'mastercard';
              await Api.addCard(userId, {
                  last4: cleanNum.slice(-4),
                  brand: brand as any,
                  expiry: cardForm.expiry,
                  holderName: cardForm.name
              });
          } catch (e) {
              console.error("Failed to save card", e);
          }
      }

      const receiptData = {
           subtotal: basePrice, // Pass BASE PRICE as totalCents so receipt doesn't double count surcharge
           sstCents,
           roundingCents,
           finalTotalCents, // This is the actual amount paid
           discount,
           rankSurcharge,
           paymentMethod: simPaymentMethod === 'tng' ? "Touch 'n Go" : "Credit Card",
           transactionRef: `SIM-${Date.now().toString().slice(-6)}`
      };
      
      handlePayment(receiptData);
      setTimeout(() => {
          setIsPaymentModalOpen(false);
      }, 500);
  };

  return (
  <div className="animate-fadeIn h-full flex flex-col">
    <div className="flex items-center mb-6 shrink-0">
      <button onClick={() => { if (bookingStep === 'services') setActiveTab('home'); else if (bookingStep === 'staff') setBookingStep('services'); else if (bookingStep === 'slot') setBookingStep('staff'); else if (bookingStep === 'checkout') setBookingStep('slot'); else resetBooking(); }} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 mr-2"><ArrowLeft size={24} className="text-gray-900 dark:text-white" /></button>
      <div className="flex-1"><h2 className="text-2xl font-bold text-gray-900 dark:text-white">{bookingStep === 'services' ? 'Select Service' : bookingStep === 'staff' ? 'Select Stylist' : bookingStep === 'slot' ? 'Select Time' : bookingStep === 'checkout' ? 'Checkout' : 'Confirmed!'}</h2></div>
      {bookingStep !== 'success' && (<div className="flex gap-1">{['services', 'staff', 'slot', 'checkout'].map((step, i) => { const stepIndex = ['services', 'staff', 'slot', 'checkout'].indexOf(step); const currentIndex = ['services', 'staff', 'slot', 'checkout'].indexOf(bookingStep); return (<div key={step} className={`w-2 h-2 rounded-full transition-colors ${stepIndex <= currentIndex ? 'bg-rose-500' : 'bg-gray-200 dark:bg-white/10'}`} />); })}</div>)}
    </div>

    <div className="flex-1 space-y-4 overflow-y-auto pb-32">
      {bookingStep === 'services' && ( <div className="grid grid-cols-1 gap-4">{services.map(service => (<Card key={service.id} className="flex gap-4 border border-rose-100 dark:border-white/5 hover:border-rose-300 dark:hover:border-rose-500 transition-all cursor-pointer group shadow-sm" onClick={() => { setSelectedService(service); setBookingStep('staff'); }}><img src={service.imageUrl} alt={service.name} className="w-20 h-20 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform duration-500" /><div className="flex-1"><div className="flex justify-between items-start"><h3 className="font-bold text-lg text-rose-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">{service.name}</h3><span className="bg-rose-500 text-white px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap">From RM {(service.priceCents / 100).toFixed(0)}</span></div><p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{service.description}</p><div className="flex items-center gap-1 mt-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide"><Clock size={12} /> {service.durationMinutes} mins</div></div></Card>))}</div> )}
      
      {bookingStep === 'staff' && ( 
        <div className="grid grid-cols-1 gap-4">
          <Card className="flex items-center gap-4 border border-rose-100 dark:border-white/5 hover:border-rose-300 cursor-pointer shadow-sm bg-rose-50/50 dark:bg-white/5" onClick={() => { setSelectedStaff(null); setBookingStep('slot'); }}>
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-white/10 flex items-center justify-center text-rose-500 dark:text-white"><Users size={24} /></div>
            <div><h3 className="font-bold text-lg text-gray-900 dark:text-white">Any Professional</h3><p className="text-sm text-gray-500 dark:text-gray-400">Maximum availability</p></div><ChevronRight className="ml-auto text-gray-300" />
          </Card>
          {staffList.map(staff => {
            const surcharge = getRankSurcharge(staff.rank);
            const label = getRankLabel(staff.rank);
            return (
              <Card key={staff.id} className="flex items-center gap-4 border border-rose-100 dark:border-white/5 hover:border-rose-300 cursor-pointer shadow-sm relative overflow-hidden" onClick={() => { setSelectedStaff(staff); setBookingStep('slot'); }}>
                {staff.rank.includes('Director') && (<div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[9px] font-black px-2 py-0.5 rounded-bl-lg flex items-center gap-1 z-10"><Crown size={10} fill="currentColor" /> {staff.rank.includes('Senior Director') ? 'TOP TIER' : 'DIRECTOR'}</div>)}
                <Avatar src={staff.avatarUrl} alt={staff.name} size="md" />
                <div className="flex-1"><h3 className="font-bold text-lg text-gray-900 dark:text-white">{staff.name}</h3><p className="text-xs font-bold text-rose-500 uppercase mb-1">{staff.rank}</p><div className="flex items-center gap-2"><span className="text-sm text-gray-500 dark:text-gray-400 font-bold flex items-center gap-1"><Star size={12} fill="currentColor" className="text-yellow-400"/> {staff.rating}</span>{surcharge > 0 && (<span className="text-xs bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 font-bold">{label}</span>)}</div></div>
                <div className="flex flex-col items-end"><span className="text-rose-600 font-bold text-sm">RM {((basePrice + surcharge) / 100).toFixed(0)}</span><ChevronRight className="text-gray-300 mt-1" /></div>
              </Card>
            );
          })}
        </div> 
      )}
      
      {bookingStep === 'slot' && ( 
        <div className="space-y-6">
          <div><label className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 block">Select Date (Booking starts from +5 days)</label>{renderCalendar()}</div>
          <div><label className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 block">Available Slots</label><div className="grid grid-cols-3 gap-3">{EXTENDED_TIME_SLOTS.map(time => { const taken = isSlotTaken(time); return ( <button key={time} onClick={() => { setSelectedSlot(time); setBookingStep('checkout'); }} disabled={taken} className={`py-3 px-2 rounded-xl text-sm font-bold border transition-all shadow-sm flex flex-col items-center justify-center ${taken ? 'bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-white/5 cursor-not-allowed line-through' : 'border-rose-300 dark:border-yellow-600 bg-white text-gray-700 hover:border-rose-400 hover:text-rose-600'}`}>{time}</button> ); })}</div></div>
        </div> 
      )}

      {bookingStep === 'checkout' && selectedService && (
         <div className="space-y-6">
            <Card className="bg-rose-50/50 dark:bg-white/5 border-rose-100 dark:border-white/10 overflow-hidden" noPadding>
               <div className="relative h-32"><img src={selectedService.imageUrl} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4"><h3 className="text-white font-bold text-xl">{selectedService.name}</h3></div></div>
               <div className="p-4 space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-white/5">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Stylist</span>
                    <div className="flex items-center gap-2">
                       {selectedStaff && <Avatar src={selectedStaff.avatarUrl} alt={selectedStaff.name} size="sm" />}
                       <div className="text-right">
                          <span className="font-bold text-gray-900 dark:text-white block">{selectedStaff ? selectedStaff.name : 'Any Professional'}</span>
                          {selectedStaff && <span className="text-[10px] text-gray-500 uppercase">{selectedStaff.rank}</span>}
                       </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-white/5">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Date & Time</span>
                    <span className="font-bold text-gray-900 dark:text-white text-right">
                        {getFormattedDate(getBookingDate(selectedDateOffset))} • {selectedSlot}
                    </span>
                  </div>
               </div>
            </Card>

            <div>
               <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-3">Offers & Vouchers</h4>
               
               <div className="space-y-3">
                  {/* Applicable Promotions List */}
                  {applicablePromotions.map(promo => (
                     <div 
                        key={promo.id} 
                        onClick={() => handleSelectOffer(promo, 'promo')}
                        className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${selectedPromotion?.id === promo.id ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20'}`}
                     >
                        <div>
                           <p className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                              <Tag size={14} className={selectedPromotion?.id === promo.id ? "text-green-600 dark:text-green-400" : "text-gray-400"}/> 
                              {promo.title}
                           </p>
                           <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{promo.discount}</p>
                           <p className="text-[10px] text-gray-400 mt-1">Special Offer</p>
                        </div>
                        {selectedPromotion?.id === promo.id && (
                           <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><Check size={12} className="text-white"/></div>
                        )}
                        {/* Event Dates Display */}
                        <div className="absolute bottom-1 right-2 text-[9px] text-gray-400 dark:text-gray-500 font-medium">
                           {formatSGDate(promo.startDate)} - {formatSGDate(promo.endDate)}
                        </div>
                     </div>
                  ))}

                  {/* My Vouchers List - Sorted by Expiry */}
                  {sortedVouchers
                    .filter(v => {
                        const isFixed = !v.title.includes('%');
                        return !(isFixed && v.discountCents >= estimatedTotal);
                    })
                    .map(v => {
                     return (
                       <div 
                          key={v.id} 
                          onClick={() => handleSelectOffer(v, 'voucher')}
                          className={`relative p-3 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer
                             ${selectedVoucher?.id === v.id ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' 
                               : 'border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20'}`}
                       >
                          <div>
                             <p className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white">
                                <Gift size={14} className={selectedVoucher?.id === v.id ? "text-rose-500" : "text-gray-400"}/> 
                                {v.title}
                             </p>
                             <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{v.description}</p>
                             <p className="text-[10px] text-gray-400 mt-1">My Voucher</p>
                          </div>
                          
                          {/* Selected Checkmark */}
                          {selectedVoucher?.id === v.id && (
                             <div className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center"><Check size={12} className="text-white"/></div>
                          )}

                          {/* Expiry Date Display */}
                          <div className="absolute bottom-1 right-2 text-[9px] text-gray-400 dark:text-gray-500 font-medium">
                             Exp: {v.expiryDate || 'N/A'}
                          </div>
                       </div>
                     );
                  })}

                  {applicablePromotions.length === 0 && sortedVouchers.filter(v => {
                      const isFixed = !v.title.includes('%');
                      return !(isFixed && v.discountCents >= estimatedTotal);
                  }).length === 0 && (
                     <p className="text-xs text-gray-500 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/10 text-center">
                        No applicable offers or vouchers for this service.
                     </p>
                  )}
               </div>
            </div>

            <div className="bg-white dark:bg-neutral-800 p-5 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
               <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-4">Billing Details</h4>
               <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center"><span className="text-gray-500">Service Price</span><span className="text-gray-900 dark:text-white font-medium">RM {(basePrice / 100).toFixed(2)}</span></div>
                  
                  {discount > 0 && (
                     <div className="flex justify-between items-center text-green-600">
                        <span className="flex items-center gap-1"><Gift size={12}/> {selectedPromotion ? 'Special Offer' : 'Voucher Discount'}</span>
                        <span>- RM {(discount / 100).toFixed(2)}</span>
                     </div>
                  )}

                  {rankSurcharge > 0 && (<div className="flex justify-between items-center"><span className="text-gray-500">Stylist Surcharge</span><span className="text-gray-900 dark:text-white font-medium">RM {(rankSurcharge / 100).toFixed(2)}</span></div>)}
                  
                  {/* Taxable Amount / Subtotal */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-white/5 font-bold text-gray-700 dark:text-gray-300">
                     <span>Taxable Amount</span>
                     <span>RM {(taxableAmount / 100).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500"><span>SST (8%)</span><span>RM {(sstCents / 100).toFixed(2)}</span></div>
                  
                  {roundingCents !== 0 && (<div className="flex justify-between items-center text-xs text-gray-400 italic"><span>Rounding Adj.</span><span>{roundingCents > 0 ? '+' : ''}RM {(roundingCents / 100).toFixed(2)}</span></div>)}
                  
                  <div className="flex justify-between items-center font-black text-rose-600 dark:text-rose-400 text-lg pt-3 border-t border-dashed border-gray-200 dark:border-white/10"><span>Total Payable</span><span>RM {(finalTotalCents / 100).toFixed(2)}</span></div>
               </div>
            </div>

            <Button onClick={openPaymentModal} className="w-full h-12 text-sm shadow-lg border-none">
                Proceed to Payment
            </Button>
         </div>
      )}

      {/* PAYMENT SIMULATOR MODAL */}
      {isPaymentModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
              <Card className="w-full sm:max-w-sm bg-white dark:bg-neutral-800 p-6 shadow-2xl rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
                  {payStep !== 'processing' && (
                    <div className="flex justify-between items-center mb-6">
                        {payStep === 'method' ? (
                             <h3 className="text-lg font-bold text-gray-900 dark:text-white">Payment Method</h3>
                        ) : (
                             <button onClick={() => setPayStep('method')} className="flex items-center gap-1 text-sm font-bold text-gray-500"><ChevronLeft size={16}/> Back</button>
                        )}
                        <button onClick={() => setIsPaymentModalOpen(false)}><X size={20} className="text-gray-500"/></button>
                    </div>
                  )}

                  {payStep === 'method' && (
                      <div className="space-y-4">
                          <button 
                             onClick={() => { setSimPaymentMethod('card'); setPayStep('card_details'); }}
                             className="w-full p-4 rounded-xl border border-gray-200 dark:border-white/10 flex items-center justify-between hover:border-rose-500 dark:hover:border-rose-500 transition-all group"
                          >
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                      <CreditCard size={20} />
                                  </div>
                                  <div className="text-left">
                                      <p className="font-bold text-gray-900 dark:text-white">Credit / Debit Card</p>
                                      <p className="text-xs text-gray-500">Visa & Mastercard</p>
                                  </div>
                              </div>
                              <ChevronRight size={20} className="text-gray-300 group-hover:text-rose-500"/>
                          </button>

                          <button 
                             onClick={() => { setSimPaymentMethod('tng'); setPayStep('tng_pin'); }}
                             className="w-full p-4 rounded-xl border border-gray-200 dark:border-white/10 flex items-center justify-between hover:border-blue-500 transition-all group"
                          >
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center">
                                      <Wallet size={20} />
                                  </div>
                                  <div className="text-left">
                                      <p className="font-bold text-gray-900 dark:text-white">Touch 'n Go eWallet</p>
                                      <p className="text-xs text-gray-500">Secure PIN</p>
                                  </div>
                              </div>
                              <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-500"/>
                          </button>
                      </div>
                  )}

                  {payStep === 'card_details' && (
                      <div className="space-y-4">
                          {savedCards.length > 0 && (
                             <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Saved Cards</label>
                                <div className="space-y-2">
                                   {savedCards.map(c => (
                                       <div key={c.id} onClick={() => setSelectedSimCardId(c.id)} className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 ${selectedSimCardId === c.id ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-gray-200 dark:border-white/10'}`}>
                                            <CreditCard size={18} className="text-gray-600 dark:text-gray-400" />
                                            <span className="flex-1 font-mono font-bold text-gray-900 dark:text-white capitalize">{c.brand} •••• {c.last4}</span>
                                            {selectedSimCardId === c.id && <Check size={16} className="text-rose-500" />}
                                       </div>
                                   ))}
                                </div>
                             </div>
                          )}
                          
                          <div className="pt-2 border-t border-gray-100 dark:border-white/10">
                             <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => setSelectedSimCardId('')}>
                                 <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!selectedSimCardId ? 'border-rose-500' : 'border-gray-300'}`}>
                                     {!selectedSimCardId && <div className="w-2 h-2 rounded-full bg-rose-500"></div>}
                                 </div>
                                 <span className="text-sm font-bold text-gray-900 dark:text-white">Use New Card</span>
                             </div>

                             {!selectedSimCardId && (
                                 <div className="space-y-3 animate-fadeIn">
                                     <input 
                                       type="text" 
                                       placeholder="Card Number" 
                                       value={cardForm.number}
                                       onChange={e => setCardForm({...cardForm, number: formatCardNumber(e.target.value)})}
                                       maxLength={19}
                                       className="w-full p-3 rounded-xl border border-gray-300 bg-white dark:bg-black/20 text-black dark:text-white outline-none font-mono"
                                     />
                                     <div className="flex gap-3">
                                         <input 
                                           type="text" 
                                           placeholder="MM/YY" 
                                           value={cardForm.expiry}
                                           onChange={e => setCardForm({...cardForm, expiry: formatCardExpiry(e.target.value)})}
                                           maxLength={5}
                                           className="w-1/2 p-3 rounded-xl border border-gray-300 bg-white dark:bg-black/20 text-black dark:text-white outline-none"
                                         />
                                         <input 
                                            type="text" 
                                            placeholder="CVC" 
                                            maxLength={3}
                                            value={cardForm.cvc}
                                            onChange={e => setCardForm({...cardForm, cvc: e.target.value.replace(/\D/g, '')})}
                                            className="w-1/2 p-3 rounded-xl border border-gray-300 bg-white dark:bg-black/20 text-black dark:text-white outline-none"
                                         />
                                     </div>
                                     <input 
                                        type="text" 
                                        placeholder="Cardholder Name"
                                        value={cardForm.name}
                                        onChange={e => setCardForm({...cardForm, name: e.target.value})}
                                        className="w-full p-3 rounded-xl border border-gray-300 bg-white dark:bg-black/20 text-black dark:text-white outline-none"
                                     />
                                     
                                     {/* Save Card Option */}
                                     <div 
                                        className="flex items-center gap-2 mt-2 cursor-pointer pt-1"
                                        onClick={() => setSaveNewCard(!saveNewCard)}
                                     >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${saveNewCard ? 'bg-rose-500 border-rose-500' : 'border-gray-300 dark:border-white/30'}`}>
                                            {saveNewCard && <Check size={14} className="text-white" />}
                                        </div>
                                        <span className="text-xs text-gray-600 dark:text-gray-300 font-medium select-none">Save this card for future payments</span>
                                     </div>
                                 </div>
                             )}
                          </div>
                          
                          {payError && <p className="text-xs text-red-500 font-bold text-center">{payError}</p>}
                          
                          <Button onClick={proceedToOTP} className="w-full mt-4">Pay RM {(finalTotalCents/100).toFixed(2)}</Button>
                      </div>
                  )}

                  {payStep === 'tng_pin' && (
                      <div className="text-center space-y-6">
                          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30">
                              <Wallet size={32} className="text-white" />
                          </div>
                          <div>
                              <p className="text-gray-500 text-sm">Amount</p>
                              <h3 className="text-3xl font-black text-gray-900 dark:text-white">RM {(finalTotalCents/100).toFixed(2)}</h3>
                          </div>
                          
                          <div className="space-y-4">
                             <div>
                                <label className="block text-left text-xs font-bold text-gray-500 uppercase mb-1">TNG eWallet Number</label>
                                <input 
                                   type="text" 
                                   value={tngPhone}
                                   disabled
                                   className="w-full p-3 bg-gray-100 dark:bg-white/5 rounded-xl text-gray-500 font-bold"
                                />
                             </div>
                             <div>
                                <label className="block text-left text-xs font-bold text-gray-500 uppercase mb-1">6-Digit PIN</label>
                                <input 
                                   type="password" 
                                   maxLength={6}
                                   placeholder="••••••"
                                   value={tngPin}
                                   onChange={e => setTngPin(e.target.value.replace(/\D/g,''))}
                                   className="w-full p-3 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl text-center text-2xl font-black tracking-widest outline-none focus:border-blue-500"
                                />
                             </div>
                          </div>
                          
                          {payError && <p className="text-xs text-red-500 font-bold">{payError}</p>}
                          
                          <Button onClick={proceedToOTP} className="w-full bg-blue-600 hover:bg-blue-700 border-none">Pay Now</Button>
                      </div>
                  )}

                  {payStep === 'otp' && (
                       <div className="text-center space-y-6">
                          <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center animate-pulse">
                              <Mail size={32} className="text-green-600" />
                          </div>
                          <div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Verify Payment</h3>
                              {simPaymentMethod === 'card' ? (
                                <p className="text-gray-500 text-sm mt-1">Please check your email <b>{userEmail}</b> for the verification code.</p>
                              ) : (
                                <p className="text-gray-500 text-sm mt-1">OTP sent to <b>{userEmail}</b></p>
                              )}
                          </div>
                          
                          <input 
                             type="text" 
                             maxLength={6}
                             placeholder="123456"
                             value={otp}
                             onChange={e => setOtp(e.target.value.replace(/\D/g,''))}
                             className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-center text-3xl font-black tracking-[0.5em] outline-none focus:ring-2 focus:ring-rose-500"
                          />
                          
                          {payError && <p className="text-xs text-red-500 font-bold">{payError}</p>}
                          
                          <Button onClick={verifyOTP} className="w-full">Confirm OTP</Button>
                          {simPaymentMethod !== 'card' && <p className="text-xs text-gray-400">Use 123456 for simulator</p>}
                       </div>
                  )}

                  {payStep === 'processing' && (
                       <div className="text-center py-10 space-y-4">
                           <div className="w-16 h-16 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto"></div>
                           <p className="font-bold text-gray-900 dark:text-white">Processing Transaction...</p>
                       </div>
                  )}
              </Card>
          </div>
      )}

      {bookingStep === 'success' && ( 
        <div className="text-center py-6 flex flex-col items-center min-h-full">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Booking Confirmed!</h2>
            <p className="text-gray-500 dark:text-gray-300 text-sm mb-6">Payment successful.</p>
            {latestReceipt && <ReceiptCard receipt={latestReceipt} />}
            <Button onClick={resetBooking} className="w-full h-12 text-lg mt-6">Done</Button>
        </div>
      )}
    </div>
  </div>
  );
};