
import React, { useState, useEffect } from 'react';
import { Home, Calendar, Bell, User as UserIcon, AlertTriangle, X, CreditCard, AlertCircle, Star, MessageSquare, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Card, Button, Avatar } from '../components/UI';
import { REWARDS } from '../constants';
import { Service, Staff, AppointmentStatus, Reward, Notification, Receipt, RewardHistoryItem, CreditCard as CreditCardType, Appointment, User } from '../types';
import { generateRefId, getBookingDate, formatPhoneNumber, formatCardExpiry, formatCardNumber } from '../utils/helpers';
import { Api } from '../services/api';
import { AuthService } from '../services/auth';
import { supabase } from '../services/supabase';

// Import Views
import { HomeView } from '../components/client/HomeView';
import { RewardsView } from '../components/client/RewardsView';
import { BookingView } from '../components/client/BookingView';
import { NotificationsView } from '../components/client/NotificationsView';
import { MyBookingsList } from '../components/client/MyBookingsList';
import { ProfileView } from '../components/client/ProfileView';

type Tab = 'home' | 'book' | 'notifications' | 'profile' | 'rewards';
type BookingStep = 'services' | 'staff' | 'slot' | 'checkout' | 'success';

// Consistent with BookingView: 9AM-5PM, excluding 1PM
const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'
];

interface ClientBookingProps {
  userId: string;
}

export const ClientBooking = ({ userId }: ClientBookingProps) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [bookingStep, setBookingStep] = useState<BookingStep>('services');
  
  // Data from API
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]); 
  const [user, setUser] = useState<User | null>(null);
  const [myVouchers, setMyVouchers] = useState<Reward[]>([]);
  // Store appointment specifically for blocking slots (Staff Appointments)
  const [staffAppointments, setStaffAppointments] = useState<Appointment[]>([]);

  // Booking Flow State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDateOffset, setSelectedDateOffset] = useState<number>(0); 
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [newApptRef, setNewApptRef] = useState<string>('');
  const [latestReceipt, setLatestReceipt] = useState<Receipt | null>(null);
  
  // Payment & Voucher State
  const [selectedVoucher, setSelectedVoucher] = useState<Reward | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'tng' | 'card' | 'apple'>('tng');
  const [savedCards, setSavedCards] = useState<CreditCardType[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardForm, setNewCardForm] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [cardError, setCardError] = useState<string>(''); // Add Error State
  const [cardToRemove, setCardToRemove] = useState<string | null>(null);

  // App State
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMyBookings, setShowMyBookings] = useState(false);

  // Other State
  const [rewardHistory, setRewardHistory] = useState<RewardHistoryItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null); 
  const [selectedReview, setSelectedReview] = useState<Notification | null>(null); // Lifted state

  // Modals
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleConfirmOpen, setRescheduleConfirmOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [rescheduleDateOffset, setRescheduleDateOffset] = useState<number>(0); 
  const [rescheduleSlot, setRescheduleSlot] = useState<string | null>(null);
  const [rescheduleCalendarMonth, setRescheduleCalendarMonth] = useState(new Date());

  const [showQrCode, setShowQrCode] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redemptionDetails, setRedemptionDetails] = useState<{ serial: string, expiry: string } | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isManageCardsOpen, setIsManageCardsOpen] = useState(false);
  const [rescheduleStaffId, setRescheduleStaffId] = useState<string>('');

  // PIN Modal State (Lifted from ProfileView)
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState('');

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [apptToReview, setApptToReview] = useState<string | null>(null);

  // Profile Edit State
  const [editProfileForm, setEditProfileForm] = useState({ name: '', email: '', phone: '' });


  // --- HELPER TO REFRESH APPOINTMENTS & NOTIFICATIONS ---
  const refreshData = async (uid: string) => {
    const fetchedAppts = await Api.getUserAppointments(uid);
    setAppointments(fetchedAppts);
    const fetchedNotifs = await Api.getUserNotifications(uid);
    setNotifications(fetchedNotifs);
    const fetchedHistory = await Api.getPointHistory(uid);
    setRewardHistory(fetchedHistory);
  };

  // --- INITIAL DATA LOAD ---
  useEffect(() => {
    let sub: any = null;
    let notifSub: any = null;

    const initData = async () => {
      setLoading(true);
      
      const userProfile = await Api.getUserProfile(userId);
      
      if (userProfile) {
        setUser(userProfile);
        setEditProfileForm({ name: userProfile.name, email: userProfile.email, phone: userProfile.phone || '' });
        
        if (userProfile.themePreference === 'dark') setIsDarkMode(true);

        try {
          const [fetchedServices, fetchedStaff, fetchedAppts, fetchedVouchers, fetchedCards, fetchedNotifs, fetchedHistory] = await Promise.all([
            Api.getServices(),
            Api.getStaff(),
            Api.getUserAppointments(userId),
            Api.getUserVouchers(userId),
            Api.getSavedCards(userId),
            Api.getUserNotifications(userId),
            Api.getPointHistory(userId)
          ]);
          
          if(fetchedServices.length > 0) setServices(fetchedServices);
          if(fetchedStaff.length > 0) setStaffList(fetchedStaff);
          setAppointments(fetchedAppts);
          setMyVouchers(fetchedVouchers);
          setSavedCards(fetchedCards);
          setNotifications(fetchedNotifs);
          setRewardHistory(fetchedHistory);
          
          if (fetchedCards.length > 0) setSelectedCardId(fetchedCards[0].id);

        } catch (err) {
          console.error("Error fetching initial data", err);
        }

        sub = supabase
          .channel('client-updates')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment' }, () => {
             refreshData(userId);
          })
          .subscribe();
          
        notifSub = supabase
          .channel('client-notifs')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notification' }, () => {
             Api.getUserNotifications(userId).then(setNotifications);
          })
          .subscribe();

      }
      setLoading(false);
    };
    initData();

    return () => {
      if (sub) supabase.removeChannel(sub);
      if (notifSub) supabase.removeChannel(notifSub);
    };
  }, [userId]);

  // Handle Staff Selection & Availability Fetch
  useEffect(() => {
    if (selectedStaff) {
      Api.getStaffAppointments(selectedStaff.id).then(appts => {
        setStaffAppointments(appts);
      });
    } else {
      setStaffAppointments([]);
    }
  }, [selectedStaff]);
  
  // Handle Reschedule Staff Selection
  useEffect(() => {
    if (rescheduleStaffId) {
      Api.getStaffAppointments(rescheduleStaffId).then(appts => {
        setStaffAppointments(appts);
      });
    }
  }, [rescheduleStaffId]);

  const toggleDarkMode = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (user) {
       await Api.updateUserTheme(user.id, newTheme ? 'dark' : 'light');
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) { root.classList.add('theme-dark'); root.classList.add('dark'); } 
    else { root.classList.remove('theme-dark'); root.classList.remove('dark'); }
  }, [isDarkMode]);

  const resetBooking = () => {
    setBookingStep('services');
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedSlot(null);
    setSelectedDateOffset(0);
    setSelectedVoucher(null);
    setActiveTab('home');
  };

  const handleBookNow = () => {
    setShowMyBookings(false);
    setActiveTab('book');
    setBookingStep('services');
  };

  const handleAddCard = async () => {
    setCardError('');
    const { number, expiry, cvc, name } = newCardForm;
    const cleanNum = number.replace(/\D/g, '');

    // 1. Check Brand (Visa = 4, Mastercard = 2 or 5)
    if (!cleanNum.startsWith('4') && !cleanNum.startsWith('5') && !cleanNum.startsWith('2')) {
        setCardError("Only Visa (starts with 4) and Mastercard (starts with 2 or 5) are accepted.");
        return;
    }
    
    // 2. Check Length
    if (cleanNum.length < 15) {
         setCardError("Card number is too short.");
         return;
    }

    // 3. Check Holder Name
    if (!name.trim()) {
        setCardError("Cardholder name is required.");
        return;
    }

    // 4. Check Expiry
    if (!expiry.includes('/') || expiry.length !== 5) {
        setCardError("Invalid expiry format (MM/YY).");
        return;
    }

    const [mm, yy] = expiry.split('/').map(Number);
    const now = new Date();
    const currentYear = parseInt(now.getFullYear().toString().slice(-2));
    const currentMonth = now.getMonth() + 1;

    if (!mm || !yy || mm < 1 || mm > 12) {
        setCardError("Invalid month.");
        return;
    }

    if (yy < currentYear || (yy === currentYear && mm < currentMonth)) {
        setCardError("Card has expired.");
        return;
    }
    
    // NEW CHECK
    if (yy > currentYear + 10) {
        setCardError("Expiry year invalid (max 10 years).");
        return;
    }

    if (cvc.length < 3) {
        setCardError("Invalid CVC.");
        return;
    }

    if (!user) return;
    
    const brand = cleanNum.startsWith('4') ? 'visa' : 'mastercard';
    
    const newCard = await Api.addCard(user.id, {
      last4: cleanNum.slice(-4),
      brand: brand as any,
      expiry: expiry,
      holderName: name
    });

    if (newCard) {
      setSavedCards(prev => [...prev, newCard]);
      setSelectedCardId(newCard.id);
      setIsAddCardOpen(false);
      setNewCardForm({ number: '', expiry: '', cvc: '', name: '' });
      setCardError('');
    } else {
      setCardError("Failed to save card. Please try again.");
    }
  };
  
  const initiateRemoveCard = (id: string) => setCardToRemove(id);
  const confirmRemoveCard = async () => {
    if (cardToRemove) {
      const success = await Api.deleteCard(cardToRemove);
      if (success) {
        setSavedCards(prev => prev.filter(c => c.id !== cardToRemove));
        if (selectedCardId === cardToRemove) setSelectedCardId('');
      }
      setCardToRemove(null);
    }
  };

  // Standard Payment Handler (Fallback or Direct)
  const handlePayment = async (billingData: any) => {
    if (!selectedService || !user) return;
    setIsProcessingPayment(true);

    const refId = generateRefId();
    setNewApptRef(refId);

    const dateObj = getBookingDate(selectedDateOffset);
    if (selectedSlot) {
      const [hours, minutes] = selectedSlot.split(':').map(Number);
      dateObj.setHours(hours, minutes);
    }
    
    const receipt: Receipt = {
        id: `RCP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        date: new Date().toLocaleString(),
        bookingDate: new Date().toLocaleString(),
        appointmentDate: dateObj.toLocaleString(),
        serviceName: selectedService.name,
        staffName: selectedStaff?.name || 'Any Stylist',
        paymentMethod: billingData.paymentMethod, // Use Simulator Method
        
        totalCents: billingData.subtotal, 
        discountCents: billingData.discount,
        depositCents: billingData.finalTotalCents, 
        balanceCents: 0,
        
        surchargeCents: billingData.rankSurcharge,
        sstCents: billingData.sstCents,
        roundingCents: billingData.roundingCents,
        status: 'paid',
        transactionRef: billingData.transactionRef
    };

    const newApptData: Partial<Appointment> = {
      userId: user.id,
      staffId: selectedStaff?.id || staffList[0].id,
      serviceId: selectedService.id,
      date: dateObj.toISOString(),
    };

    const uuid = await Api.createAppointment(newApptData, billingData.finalTotalCents, selectedVoucher || undefined, receipt);

    if (uuid) {
      refreshData(user.id);
      
      const pointsEarned = Math.floor(billingData.finalTotalCents / 100);

      setUser(prev => prev ? ({ 
        ...prev, 
        points: prev.points + pointsEarned,
        lifetimePoints: prev.lifetimePoints + pointsEarned 
      }) : null);
      
      setLatestReceipt(receipt);

      if (selectedVoucher) {
        setMyVouchers(prev => prev.filter(v => v.id !== selectedVoucher.id));
        setSelectedVoucher(null);
      }

      setBookingStep('success');
    } else {
      alert("Booking failed. Slot may have been taken. Please try again.");
    }
    
    setIsProcessingPayment(false);
  };
  
  const handleMarkAllRead = async () => {
    if (user) {
       await Api.markAllNotificationsRead(user.id);
       setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };
  
  const handleLogout = async () => { 
    await AuthService.signOut(); 
  };

  const handleUpdatePin = async () => {
        if (!pinCode || pinCode.length !== 6) {
            setPinError("PIN must be 6 digits.");
            return;
        }
        if(user) {
            const success = await Api.updateTransactionPin(user.id, pinCode);
            if (success) {
                alert("PIN Updated Successfully");
                setIsPinModalOpen(false);
                setPinCode('');
                setPinError('');
            } else {
                setPinError("Failed to update PIN.");
            }
        }
  };

  // Cancel
  const initiateCancel = (id: string) => { setSelectedAppointmentId(id); setCancelModalOpen(true); };
  const confirmCancel = async () => { 
    if (selectedAppointmentId) { 
       const appt = appointments.find(a => a.id === selectedAppointmentId);
       const targetId = appt?.dbId || selectedAppointmentId;
       const success = await Api.cancelAppointment(targetId);
       if (success) refreshData(user?.id || '');
       setCancelModalOpen(false); 
       setSelectedAppointmentId(null); 
    }
  };
  
  // Reschedule
  const initiateReschedule = (id: string) => { 
    const appt = appointments.find(a => a.id === id);
    setSelectedAppointmentId(id); 
    setRescheduleStaffId(appt?.staffId || '');
    setRescheduleModalOpen(true); 
    setRescheduleDateOffset(0); 
    setRescheduleSlot(null); 
    setRescheduleCalendarMonth(new Date());
  };
  
  const handleRescheduleDateClick = (date: Date) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 5); 
    
    if (date < minDate) return;

    const exactOffset = Math.floor((date.getTime() - today.getTime()) / (1000 * 3600 * 24)) - 5;
    setRescheduleDateOffset(exactOffset);
    setRescheduleSlot(null); // Reset slot when date changes
  };

  const renderRescheduleCalendar = () => {
    const year = rescheduleCalendarMonth.getFullYear();
    const month = rescheduleCalendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) { days.push(null); }
    for (let i = 1; i <= daysInMonth; i++) { days.push(new Date(year, month, i)); }
    
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const currentMonthStr = rescheduleCalendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    const selectedDate = getBookingDate(rescheduleDateOffset);
    selectedDate.setHours(0,0,0,0);
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 5);

    return (
      <div className="bg-neutral-800 rounded-2xl p-4 border border-neutral-700 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setRescheduleCalendarMonth(new Date(year, month - 1))} className="p-1 hover:bg-neutral-700 rounded-full text-white"><ChevronLeft size={20} /></button>
          <span className="font-bold text-white">{currentMonthStr}</span>
          <button onClick={() => setRescheduleCalendarMonth(new Date(year, month + 1))} className="p-1 hover:bg-neutral-700 rounded-full text-white"><ChevronRight size={20} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2 text-center">
          {weekDays.map(d => <span key={d} className="text-xs font-bold text-neutral-400 uppercase">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, idx) => {
            if (!date) return <div key={idx} />;
            const disabled = date < minDate;
            const isSelected = date.getTime() === selectedDate.getTime();
            return (
              <button key={idx} onClick={() => handleRescheduleDateClick(date)} disabled={disabled} className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-all ${isSelected ? 'bg-rose-500 text-white shadow-md' : ''} ${!isSelected && !disabled ? 'text-white hover:bg-neutral-700' : ''} ${disabled ? 'text-neutral-600 cursor-not-allowed opacity-50' : ''}`}>
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };
  
  const initiateConfirmReschedule = () => {
    if (selectedAppointmentId && rescheduleSlot) {
      setRescheduleConfirmOpen(true);
    }
  };

  const confirmReschedule = async () => { 
    if (selectedAppointmentId && rescheduleSlot) { 
      const newDateObj = getBookingDate(rescheduleDateOffset); 
      const [hours, minutes] = rescheduleSlot.split(':').map(Number); 
      newDateObj.setHours(hours, minutes); 
      
      const appt = appointments.find(a => a.id === selectedAppointmentId);
      const targetId = appt?.dbId || selectedAppointmentId;

      const success = await Api.rescheduleAppointment(targetId, newDateObj.toISOString(), rescheduleStaffId);
      if (success) {
        refreshData(user?.id || '');
      } else {
        alert('Failed to reschedule. Slot might be taken or limit reached.');
      }

      setRescheduleConfirmOpen(false);
      setRescheduleModalOpen(false); 
      setSelectedAppointmentId(null); 
      setRescheduleSlot(null); 
    }
  };

  const handleClaimReward = async (reward: Reward) => {
    if (user && user.points >= reward.cost) {
      const redeemedVoucher = await Api.redeemPointsForVoucher(user.id, reward);
      if (redeemedVoucher) {
        setUser(prev => prev ? ({ ...prev, points: prev.points - reward.cost }) : null);
        setSelectedReward(reward);
        setMyVouchers(prev => [...prev, redeemedVoucher]);
        refreshData(user.id); // Update History
        setRedemptionDetails({ serial: redeemedVoucher.serialNumber || 'ERR', expiry: redeemedVoucher.expiryDate || '' });
        setRedeemModalOpen(true);
      }
    }
  };

  // Review
  const initiateReview = (id: string) => {
    setApptToReview(id);
    setReviewRating(0);
    setReviewComment('');
    setIsReviewModalOpen(true);
  };

  const submitReview = async () => {
    if (apptToReview && user) {
      const appt = appointments.find(a => a.id === apptToReview);
      const targetId = appt?.dbId || apptToReview;

      const success = await Api.submitReview(targetId, reviewRating, reviewComment, user.id);
      
      if (success) {
        refreshData(user.id);
        
        setIsReviewModalOpen(false);
        alert('Thank you for your feedback! A RM5 voucher has been added to your account.');
      }
    }
  };

  // Profile
  const openEditProfile = () => { if(user) { setEditProfileForm({ name: user.name, email: user.email, phone: user.phone || '' }); setIsEditProfileOpen(true); }};
  const saveProfile = () => { setUser(prev => prev ? ({ ...prev, name: editProfileForm.name, email: editProfileForm.email, phone: editProfileForm.phone }) : null); setIsEditProfileOpen(false); };

  const tabItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'book', icon: Calendar, label: 'Book' },
    { id: 'notifications', icon: Bell, label: 'Alerts' },
    { id: 'profile', icon: UserIcon, label: 'Profile' }
  ];

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-200"><div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div></div>;

  // Ensure user is loaded before rendering main app
  if (!user) {
     return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-200 gap-4">
           <p className="text-red-500 font-bold">Error loading user profile.</p>
           <Button onClick={handleLogout}>Log Out</Button>
        </div>
     );
  }

  // Calculate Tab Bar Visibility
  // Hide if:
  // 1. In Booking Flow (except 'services')
  // 2. My Bookings list is open
  // 3. Viewing a Receipt
  // 4. Viewing an Admin Response (Review)
  // 5. Viewing Edit Profile Modal
  // 6. Viewing Manage Cards Modal
  // 7. Viewing Update PIN Modal
  const isTabBarVisible = 
      !showMyBookings && 
      !selectedReceipt && 
      !selectedReview && 
      !isEditProfileOpen &&
      !isManageCardsOpen &&
      !isPinModalOpen &&
      activeTab !== 'rewards' && 
      (activeTab !== 'book' || bookingStep === 'services');

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-900 p-0 md:p-8">
      <div className="w-full h-full md:w-[440px] md:h-[956px] shrink-0 md:rounded-[60px] relative bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden flex flex-col border-0 md:border-[8px] border-neutral-900/5 dark:border-neutral-800 md:ring-1 ring-black/5">
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-b-3xl z-50"></div>
        <main className="flex-1 overflow-y-auto p-6 pt-8 md:pt-12 pb-28 scroll-smooth no-scrollbar relative z-0 bg-white dark:bg-neutral-900">
           {showMyBookings ? (
             <MyBookingsList 
                setShowMyBookings={setShowMyBookings}
                appointments={appointments}
                handleBookNow={handleBookNow}
                initiateReschedule={initiateReschedule}
                initiateCancel={initiateCancel}
                initiateReview={initiateReview}
                services={services}
                staffList={staffList}
             />
           ) : (
             <>
               {activeTab === 'home' && (
                 <HomeView 
                    user={user}
                    toggleDarkMode={toggleDarkMode}
                    isDarkMode={isDarkMode}
                    setActiveTab={setActiveTab}
                    handleBookNow={handleBookNow}
                    setShowMyBookings={setShowMyBookings}
                    appointments={appointments}
                    services={services}
                    staffList={staffList}
                 />
               )}
               {activeTab === 'rewards' && (
                 <RewardsView 
                    user={user}
                    setActiveTab={setActiveTab}
                    setHistoryModalOpen={setHistoryModalOpen}
                    showQrCode={showQrCode}
                    setShowQrCode={setShowQrCode}
                    handleClaimReward={handleClaimReward}
                    historyModalOpen={historyModalOpen}
                    rewardHistory={rewardHistory}
                    redeemModalOpen={redeemModalOpen}
                    setRedeemModalOpen={setRedeemModalOpen}
                    selectedReward={selectedReward}
                    redemptionDetails={redemptionDetails}
                    myVouchers={myVouchers} 
                 />
               )}
               {activeTab === 'book' && (
                 <BookingView 
                    bookingStep={bookingStep}
                    setActiveTab={setActiveTab}
                    setBookingStep={setBookingStep}
                    resetBooking={resetBooking}
                    selectedService={selectedService}
                    setSelectedService={setSelectedService}
                    selectedStaff={selectedStaff}
                    setSelectedStaff={setSelectedStaff}
                    selectedSlot={selectedSlot}
                    setSelectedSlot={setSelectedSlot}
                    selectedDateOffset={selectedDateOffset}
                    setSelectedDateOffset={setSelectedDateOffset}
                    myVouchers={myVouchers}
                    selectedVoucher={selectedVoucher}
                    setSelectedVoucher={setSelectedVoucher}
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    savedCards={savedCards}
                    selectedCardId={selectedCardId}
                    setSelectedCardId={setSelectedCardId}
                    setIsAddCardOpen={setIsAddCardOpen}
                    handlePayment={handlePayment}
                    isProcessingPayment={isProcessingPayment}
                    latestReceipt={latestReceipt}
                    appointments={staffAppointments} // Use staffAppointments for blocking slots
                    services={services}
                    staffList={staffList}
                 />
               )}
               {activeTab === 'notifications' && (
                 <NotificationsView 
                    notifications={notifications}
                    handleMarkAllRead={handleMarkAllRead}
                    selectedReceipt={selectedReceipt}
                    setSelectedReceipt={setSelectedReceipt}
                    selectedReview={selectedReview}
                    setSelectedReview={setSelectedReview}
                 />
               )}
               {activeTab === 'profile' && (
                 <ProfileView 
                    user={user}
                    setIsEditProfileOpen={openEditProfile}
                    setIsManageCardsOpen={setIsManageCardsOpen}
                    setIsPinModalOpen={setIsPinModalOpen}
                    handleLogout={handleLogout}
                 />
               )}
             </>
           )}
        </main>

        {/* Hover Segmented Tab Bar */}
        {isTabBarVisible && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-[360px] z-50">
             <div className="bg-gray-200/90 dark:bg-zinc-800/90 backdrop-blur-xl border border-white/20 p-1 rounded-full flex items-center justify-between shadow-2xl relative">
                <div className="absolute top-1 bottom-1 bg-white dark:bg-neutral-600 rounded-full shadow-md transition-all duration-300 ease-out z-0"
                  style={{ left: `${(tabItems.findIndex(t => t.id === activeTab)) * (100 / tabItems.length) + 0.5}%`, width: `${100 / tabItems.length - 1}%` }}
                />
                {tabItems.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button 
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as Tab)}
                      className={`relative flex-1 h-12 flex flex-col items-center justify-center gap-0.5 rounded-full z-10 group transition-all duration-200 ${isActive ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                    >
                      <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-200 group-hover:scale-110" />
                      <span className={`text-[10px] font-bold transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 hidden group-hover:block group-hover:opacity-100'}`}>
                        {tab.label}
                      </span>
                      {tab.id === 'notifications' && !isActive && notifications.some(n => !n.read) && (
                        <span className="absolute top-3 right-5 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-black/50"></span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Modals */}
        {isEditProfileOpen && user && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
             <Card className="w-full max-w-sm bg-white dark:bg-neutral-800 p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Profile</h3><button onClick={() => setIsEditProfileOpen(false)}><X size={20}/></button></div>
                <div className="space-y-4">
                   <div><label className="text-xs font-bold text-gray-500 mb-1 block">Full Name</label><input type="text" value={editProfileForm.name} onChange={(e) => setEditProfileForm({...editProfileForm, name: e.target.value})} className="w-full p-3 rounded-xl border border-gray-300 bg-white text-black outline-none focus:ring-2 focus:ring-rose-500" /></div>
                   <div><label className="text-xs font-bold text-gray-500 mb-1 block">Email</label><input type="text" value={editProfileForm.email} onChange={(e) => setEditProfileForm({...editProfileForm, email: e.target.value})} className="w-full p-3 rounded-xl border border-gray-300 bg-white text-black outline-none focus:ring-2 focus:ring-rose-500" /></div>
                   <div><label className="text-xs font-bold text-gray-500 mb-1 block">Phone</label><input type="text" value={editProfileForm.phone} onChange={(e) => setEditProfileForm({...editProfileForm, phone: formatPhoneNumber(e.target.value)})} className="w-full p-3 rounded-xl border border-gray-300 bg-white text-black outline-none focus:ring-2 focus:ring-rose-500" placeholder="+60 123456789" /></div>
                   <Button onClick={saveProfile} className="w-full">Save Changes</Button>
                </div>
             </Card>
          </div>
        )}
        
        {/* Updated Reschedule Modal with Calendar */}
        {rescheduleModalOpen && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
             <Card className="w-full max-w-sm bg-white dark:bg-neutral-800 p-6 shadow-2xl h-[600px] flex flex-col">
               <div className="flex justify-between items-center mb-4 shrink-0">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Reschedule</h3>
                  <button onClick={() => setRescheduleModalOpen(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} className="text-black"/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                 <div className="mb-4">
                   <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">Select Staff</label>
                   <select 
                     value={rescheduleStaffId}
                     onChange={(e) => setRescheduleStaffId(e.target.value)}
                     className="w-full p-3 rounded-xl border border-gray-300 bg-white text-black outline-none"
                   >
                     {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                 </div>
                 
                 <div>
                    <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">Select Date</label>
                    {renderRescheduleCalendar()}
                 </div>

                 <div>
                    <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">Select Time Slot</label>
                    <div className="grid grid-cols-3 gap-2">
                       {TIME_SLOTS.map(time => {
                         // Check availability using staffAppointments for the SELECTED reschedule staff
                         const dateObj = getBookingDate(rescheduleDateOffset);
                         const isRestTime = time === '13:00';
                         if (isRestTime) return null; // Don't even render 13:00

                         const taken = staffAppointments.some(appt => {
                            if (appt.id === selectedAppointmentId) return false;
                            
                            const d = new Date(appt.date);
                            // Enforce strict check on Year, Month, Day, and Hour to avoid crashing
                            return d.getFullYear() === dateObj.getFullYear() &&
                                   d.getMonth() === dateObj.getMonth() && 
                                   d.getDate() === dateObj.getDate() &&
                                   d.getHours() === parseInt(time.split(':')[0]);
                         });
                         
                         return (
                            <button 
                              key={time} 
                              onClick={() => setRescheduleSlot(time)}
                              disabled={taken}
                              className={`py-2 rounded-lg text-xs font-bold border ${rescheduleSlot === time ? 'bg-rose-500 text-white border-rose-500' : taken ? 'bg-neutral-900 text-neutral-600 border-neutral-800 line-through' : 'bg-neutral-800 text-white border-neutral-700 hover:border-neutral-500'}`}
                            >
                              {time}
                            </button>
                         )
                       })}
                    </div>
                 </div>
               </div>
               
               <div className="pt-4 mt-auto border-t border-gray-100 shrink-0">
                  <Button onClick={initiateConfirmReschedule} disabled={!rescheduleSlot} className="w-full">Next</Button>
               </div>
             </Card>
           </div>
        )}

        {/* Reschedule Confirmation */}
        {rescheduleConfirmOpen && (
           <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
              <Card className="w-full max-w-sm bg-white p-6 shadow-2xl text-center">
                 <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar size={24} className="text-rose-600" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Reschedule?</h3>
                 <p className="text-gray-600 text-sm mb-6">
                    You are moving your appointment to <b>{getBookingDate(rescheduleDateOffset).toLocaleDateString()} at {rescheduleSlot}</b>.
                 </p>
                 <div className="flex gap-3">
                   <Button variant="secondary" onClick={() => setRescheduleConfirmOpen(false)} className="flex-1">Back</Button>
                   <Button onClick={confirmReschedule} className="flex-1">Confirm</Button>
                 </div>
              </Card>
           </div>
        )}

        {/* Cancel Modal */}
        {cancelModalOpen && (
           <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
             <Card className="w-full max-w-sm bg-white dark:bg-neutral-800 p-6 shadow-2xl border-none">
               <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 mx-auto">
                 <AlertTriangle size={24} className="text-red-600 dark:text-red-500" />
               </div>
               <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">Cancel Appointment?</h3>
               <p className="text-center text-gray-600 dark:text-gray-300 text-sm mb-2">Are you sure? This action cannot be undone.</p>
               <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/20 mb-6 text-xs text-red-700 dark:text-red-400 text-center">
                  <strong>Cancellation Policy:</strong><br/>
                  Cancellations made 3 days or less before the appointment will not be refunded. Otherwise, 80% of the payment amount will be refunded.
               </div>
               <div className="flex gap-3">
                 <Button variant="secondary" onClick={() => setCancelModalOpen(false)} className="flex-1 border-gray-200 dark:border-white/10 dark:text-white dark:bg-transparent">No, Keep it</Button>
                 <Button onClick={confirmCancel} className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none shadow-red-500/20">Yes, Cancel</Button>
               </div>
             </Card>
           </div>
        )}
        
        {isReviewModalOpen && user && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <Card className="w-full max-w-sm bg-white dark:bg-neutral-800 p-6 shadow-2xl border-none">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-bold text-gray-900 dark:text-white">Review Experience</h3>
                 <button onClick={() => setIsReviewModalOpen(false)}><X size={20}/></button>
              </div>
              <div className="text-center mb-6">
                <Avatar src={appointments.find(a => a.id === apptToReview)?.staffId ? staffList.find(s => s.id === appointments.find(a => a.id === apptToReview)?.staffId)?.avatarUrl || '' : ''} alt="Staff" size="lg" />
                <p className="mt-2 font-bold text-gray-900 dark:text-white">How was your service?</p>
              </div>
              
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setReviewRating(star)} className="transition-transform hover:scale-110 focus:scale-110">
                    <Star size={32} className={`${star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">Leave a comment</label>
                <textarea 
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white text-black min-h-[100px] text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="Tell us what you liked..."
                />
              </div>

              <Button onClick={submitReview} disabled={reviewRating === 0} className="w-full shadow-lg shadow-rose-500/20">
                Submit & Get RM5
              </Button>
            </Card>
          </div>
        )}
        
        {isManageCardsOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
             <div className="w-full sm:max-w-sm bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[85vh]">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-gray-900 dark:text-white">My Cards</h3><button onClick={() => setIsManageCardsOpen(false)}><X size={20}/></button></div>
                <div className="space-y-3 mb-6">
                   {savedCards.length === 0 ? (
                     <p className="text-gray-500 text-center py-4">No cards saved yet.</p>
                   ) : savedCards.map(card => (
                     <div key={card.id} className="flex items-center gap-3 p-3 border rounded-xl border-gray-200 dark:border-white/10">
                        <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white"><CreditCard size={20} /></div>
                        <div className="flex-1"><p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{card.brand} •••• {card.last4}</p><p className="text-xs text-gray-500">Expires {card.expiry}</p></div>
                        <button onClick={() => initiateRemoveCard(card.id)} className="text-xs text-red-500 font-bold hover:text-red-700">Remove</button>
                     </div>
                   ))}
                </div>
                <Button onClick={() => { setIsManageCardsOpen(false); setIsAddCardOpen(true); }} variant="outline" className="w-full">+ Add New Card</Button>
             </div>
          </div>
        )}
        
        {isAddCardOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
             <Card className="w-full max-w-sm bg-white dark:bg-neutral-800 p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-gray-900 dark:text-white">Add New Card</h3><button onClick={() => setIsAddCardOpen(false)}><X size={20}/></button></div>
                <div className="space-y-4">
                   <input 
                     type="text" 
                     placeholder="Card Number (Digits Only)" 
                     value={newCardForm.number} 
                     onChange={e => setNewCardForm({...newCardForm, number: formatCardNumber(e.target.value)})} 
                     maxLength={19}
                     className="w-full p-3 rounded-xl border border-gray-300 bg-white outline-none focus:ring-2 focus:ring-rose-500 text-black font-mono" 
                   />
                   <div className="flex gap-3">
                      <input 
                        type="text" 
                        placeholder="MM/YY" 
                        value={newCardForm.expiry} 
                        onChange={e => setNewCardForm({...newCardForm, expiry: formatCardExpiry(e.target.value)})} 
                        maxLength={5}
                        className="w-1/2 p-3 rounded-xl border border-gray-300 bg-white outline-none focus:ring-2 focus:ring-rose-500 text-black" 
                      />
                      <input 
                        type="text" 
                        placeholder="CVC" 
                        value={newCardForm.cvc} 
                        onChange={e => {
                           const v = e.target.value.replace(/\D/g,'').slice(0,3);
                           setNewCardForm({...newCardForm, cvc: v});
                        }} 
                        maxLength={3}
                        className="w-1/2 p-3 rounded-xl border border-gray-300 bg-white outline-none focus:ring-2 focus:ring-rose-500 text-black" 
                      />
                   </div>
                   <input 
                     type="text" 
                     placeholder="Cardholder Name" 
                     value={newCardForm.name} 
                     onChange={e => setNewCardForm({...newCardForm, name: e.target.value})} 
                     className="w-full p-3 rounded-xl border border-gray-300 bg-white outline-none focus:ring-2 focus:ring-rose-500 text-black" 
                   />
                   
                   {/* Validation Error Display */}
                   {cardError && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-xs text-red-600 font-bold text-center">
                        {cardError}
                      </div>
                   )}

                   <Button onClick={handleAddCard} className="w-full mt-2">Save Card</Button>
                </div>
             </Card>
          </div>
        )}
        
        {cardToRemove && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <Card className="w-full max-w-sm bg-white dark:bg-neutral-800 p-6 shadow-2xl border-none">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 mx-auto">
                <AlertTriangle size={24} className="text-red-600 dark:text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">Remove Card?</h3>
              <p className="text-center text-gray-600 dark:text-gray-300 text-sm mb-6">Are you sure you want to remove this card?</p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setCardToRemove(null)} className="flex-1 border-gray-200 dark:border-white/10 dark:text-white dark:bg-transparent">Cancel</Button>
                <Button onClick={confirmRemoveCard} className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none shadow-red-500/20">Remove</Button>
              </div>
            </Card>
          </div>
        )}

        {isPinModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                <Card className="w-full max-w-sm bg-white dark:bg-neutral-800 p-6 shadow-2xl border-none">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Update PIN</h3>
                        <button onClick={() => setIsPinModalOpen(false)}><X size={20} className="text-gray-500"/></button>
                    </div>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Set a new 6-digit PIN for Touch 'n Go transactions.</p>
                        <input 
                            type="password" 
                            placeholder="Enter 6-digit PIN"
                            value={pinCode}
                            maxLength={6}
                            inputMode="numeric"
                            onChange={(e) => setPinCode(e.target.value.replace(/\D/g,''))}
                            className="w-full p-3 rounded-xl border border-gray-300 bg-white text-black outline-none tracking-widest text-center text-lg font-bold"
                        />
                        {pinError && <p className="text-xs text-red-500 font-bold text-center">{pinError}</p>}
                        <Button onClick={handleUpdatePin} className="w-full">Save PIN</Button>
                    </div>
                </Card>
            </div>
        )}

      </div>
    </div>
  );
};
