

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Star, ChevronRight, Plus, Calendar, Clock } from 'lucide-react';
import { Button, Card } from '../UI';
import { User, Appointment, Service, Staff, Promotion } from '../../types';
import { getTierInfo } from '../../utils/helpers';
import { Api } from '../../services/api';

interface HomeViewProps {
  user: User;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
  setActiveTab: (tab: any) => void;
  handleBookNow: () => void;
  setShowMyBookings: (show: boolean) => void;
  appointments: Appointment[];
  services: Service[];
  staffList: Staff[];
}

export const HomeView = ({
  user,
  toggleDarkMode,
  isDarkMode,
  setActiveTab,
  handleBookNow,
  setShowMyBookings,
  appointments,
  services,
  staffList
}: HomeViewProps) => {
  const tierInfo = getTierInfo(user.lifetimePoints);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    // Only show active promotions in Client App
    Api.getPromotions().then(data => setPromotions(data.filter(p => p.active)));
  }, []);

  return (
    <div className="space-y-6 pb-32 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-600 dark:text-rose-300 font-medium text-sm">Welcome,</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">{user.name}</h1>
        </div>
        <button 
          onClick={toggleDarkMode}
          className="w-10 h-10 bg-white dark:bg-white/10 rounded-full flex items-center justify-center shadow-md border border-gray-100 dark:border-white/10 transition-colors text-gray-700 dark:text-gray-200"
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
        </button>
      </div>

      {/* Points Card */}
      <div 
        onClick={() => setActiveTab('rewards')}
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${tierInfo.color} p-6 text-white shadow-xl shadow-rose-900/20 cursor-pointer transition-transform active:scale-[0.98]`}
      >
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
             <p className="text-white/90 font-medium mb-1 flex items-center gap-2"><Star size={14} fill="currentColor"/> Lumina Rewards</p>
             <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                <ChevronRight size={16} className="text-white" />
             </div>
          </div>
          <h2 className="text-4xl font-bold mb-4">{user.points} <span className="text-lg font-normal opacity-80">pts</span></h2>
          <div className="w-full bg-black/20 dark:bg-white/20 h-2 rounded-full mb-2 backdrop-blur-sm">
            <div className="bg-white h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${Math.min(tierInfo.progress, 100)}%` }}></div>
          </div>
          <p className="text-xs text-white/90 font-medium">
             {tierInfo.next ? `${Math.max(0, tierInfo.nextThreshold - user.lifetimePoints)} points until ${tierInfo.next}` : 'You are at the top tier!'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button onClick={handleBookNow} className="h-14 text-lg bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-600/20">
          <Plus size={20} className="mr-2" /> Book New
        </Button>
        <Button variant="secondary" className="h-14 text-lg border border-gray-200 dark:border-transparent text-gray-900 dark:text-rose-300 font-bold bg-white shadow-sm" onClick={() => setShowMyBookings(true)}>
          <Calendar size={20} className="mr-2 text-rose-500" /> My Bookings
        </Button>
      </div>

      {/* Upcoming Appointment */}
      <div>
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Upcoming</h3>
          <button onClick={() => setShowMyBookings(true)} className="text-rose-600 dark:text-rose-400 text-sm font-bold hover:underline">See All</button>
        </div>
        {appointments.filter(a => a.status === 'confirmed' && new Date(a.date) > new Date()).length > 0 ? (
          appointments
            .filter(a => a.status === 'confirmed' && new Date(a.date) > new Date())
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 1)
            .map(appt => {
             const staff = staffList.find(s => s.id === appt.staffId);
             const service = services.find(s => s.id === appt.serviceId);
             return (
               <Card key={appt.id} className="flex items-center gap-4 border border-rose-100 dark:border-white/10 shadow-sm" onClick={() => setShowMyBookings(true)}>
                 <div className="flex flex-col items-center bg-rose-50 dark:bg-rose-500/20 rounded-2xl p-3 min-w-[60px] border border-rose-100 dark:border-transparent">
                   <span className="text-rose-600 dark:text-yellow-400 font-bold text-lg">{new Date(appt.date).getDate()}</span >
                   <span className="text-rose-600 dark:text-yellow-400 text-xs font-bold uppercase">{new Date(appt.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                 </div>
                 <div className="flex-1 min-w-0">
                   <h4 className="text-lg font-bold text-rose-900 dark:text-rose-900 mb-1 truncate">{service?.name || 'Appointment'}</h4>
                   <p className="font-bold text-gray-900 dark:text-rose-500 mb-1 truncate text-sm">with {staff?.name || 'Staff'}</p>
                   <div className="flex items-center text-xs font-bold text-gray-600 dark:text-gray-400">
                     <Clock size={12} className="mr-1" /> {new Date(appt.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                   </div>
                 </div>
                 <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-white/10 flex items-center justify-center shadow-sm flex-shrink-0 border border-gray-100 dark:border-transparent">
                   <ChevronRight size={16} className="text-gray-400 dark:text-gray-300" />
                 </div>
               </Card>
             );
          })
        ) : (
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 p-6 rounded-2xl text-center border border-gray-100 dark:border-white/5">
            No upcoming appointments scheduled.
          </div>
        )}
      </div>

      {/* Promotions Carousel - Now Dynamic */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Special Offers</h3>
        {promotions.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar">
            {promotions.map(promo => (
              <div key={promo.id} className="min-w-[280px] relative rounded-2xl overflow-hidden shadow-lg shadow-black/10 aspect-[16/9] group cursor-pointer">
                <img src={promo.imageUrl} alt={promo.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-5 flex flex-col justify-end">
                  <span className="bg-rose-600/90 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-lg w-fit mb-2 shadow-sm border border-white/20">{promo.discount}</span>
                  <h4 className="text-white font-bold text-xl leading-tight mb-1 shadow-black/50 drop-shadow-md">{promo.title}</h4>
                  <p className="text-gray-200 text-xs font-medium">{promo.description}</p>
                  <p className="text-gray-200 text-[10px] font-medium mt-1 opacity-80">Valid: {new Date(promo.startDate).toLocaleDateString()} - {new Date(promo.endDate).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 dark:bg-white/5 rounded-2xl">Check back later for new offers!</div>
        )}
      </div>

      {/* Popular Services */}
      <div>
         <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Popular Services</h3>
         <div className="grid grid-cols-1 gap-4">
           {(services.length > 0 ? services.slice(0, 3) : []).map(service => (
             <Card key={service.id} className="flex items-center gap-4 hover:border-rose-300 transition-colors border border-rose-100 dark:border-white/5 shadow-sm" onClick={handleBookNow}>
               <img src={service.imageUrl} alt={service.name} className="w-16 h-16 rounded-xl object-cover shadow-sm" />
               <div className="flex-1">
                 <h4 className="text-lg font-bold text-rose-900 dark:text-rose-900 mb-1 truncate">{service.name}</h4>
                 <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 font-medium">
                   <Clock size={12} className="mr-1" />
                   {service.durationMinutes} mins
                 </div>
               </div>
               <div className="text-white font-bold text-sm bg-rose-500 px-3 py-1 rounded-lg">
                 RM {(service.priceCents / 100).toFixed(0)}
               </div>
             </Card>
           ))}
         </div>
      </div>
    </div>
  );
};