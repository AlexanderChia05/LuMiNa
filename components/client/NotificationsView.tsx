
import React, { useState } from 'react';
import { Bell, FileText, X, ChevronRight, Clock, Calendar, Star, Tag, MessageSquare } from 'lucide-react';
import { Button } from '../UI';
import { Notification, Receipt } from '../../types';
import { ReceiptCard } from './ReceiptCard';

interface NotificationsViewProps {
  notifications: Notification[];
  handleMarkAllRead: () => void;
  selectedReceipt: Receipt | null;
  setSelectedReceipt: (receipt: Receipt | null) => void;
  selectedReview: Notification | null;
  setSelectedReview: (notification: Notification | null) => void;
}

export const NotificationsView = ({
  notifications,
  handleMarkAllRead,
  selectedReceipt,
  setSelectedReceipt,
  selectedReview,
  setSelectedReview
}: NotificationsViewProps) => {
  const [selectedReminder, setSelectedReminder] = useState<Notification | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'reminder' | 'receipt' | 'review' | 'promo'>('all');

  const handleNotificationClick = (notif: Notification) => {
    if (notif.type === 'receipt' && notif.data) {
      setSelectedReceipt(notif.data);
    } else if (notif.type === 'reminder') {
      setSelectedReminder(notif);
    } else if (notif.type === 'review') {
      setSelectedReview(notif);
    }
  };

  const filteredNotifications = notifications
    .filter(n => activeFilter === 'all' ? true : n.type === activeFilter)
    .sort((a, b) => {
        // Simple sort assuming new items are added to top of list
        return 0; 
    });

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'reminder', label: 'Reminders' },
    { id: 'receipt', label: 'Bookings' },
    { id: 'review', label: 'Reviews' },
    { id: 'promo', label: 'Offers' }
  ];

  return (
    <div className="animate-fadeIn pb-32 space-y-4">
      <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Alerts</h2>
          {notifications.some(n => !n.read) && (
            <button 
              onClick={handleMarkAllRead}
              className="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors bg-white dark:bg-white/5 text-black dark:text-gray-400 border border-gray-100 dark:border-white/10 hover:bg-gray-50"
            >
              Mark All Read
            </button>
          )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
         {filters.map(f => (
             <button
               key={f.id}
               onClick={() => setActiveFilter(f.id as any)}
               className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeFilter === f.id ? 'bg-rose-500 text-white shadow-md' : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-white/10'}`}
             >
               {f.label}
             </button>
         ))}
      </div>

      {filteredNotifications.length === 0 ? (
          <div className="text-center py-20 text-gray-500"><Bell size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" /><p>No {activeFilter === 'all' ? '' : activeFilter} notifications</p></div>
      ) : (
          filteredNotifications.map(notif => (
            <div key={notif.id} onClick={() => handleNotificationClick(notif)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${notif.read ? 'bg-white dark:bg-neutral-800 border-gray-100 dark:border-white/5' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-500/20'}`}>
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'receipt' ? 'bg-green-100 text-green-600' : notif.type === 'reminder' ? 'bg-amber-100 text-amber-600' : notif.type === 'review' ? 'bg-purple-100 text-purple-600' : 'bg-rose-100 text-rose-600'}`}>
                      {notif.type === 'receipt' ? <FileText size={18} /> : notif.type === 'reminder' ? <Clock size={18} /> : notif.type === 'review' ? <MessageSquare size={18} /> : notif.type === 'promo' ? <Tag size={18} /> : <Bell size={18} />}
                  </div>
                  <div className="flex-1">
                      <div className="flex justify-between items-start"><h4 className="font-bold text-gray-900 dark:text-white text-sm">{notif.title}</h4><span className="text-[10px] text-gray-400">{notif.date}</span></div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{notif.message}</p>
                      {notif.type === 'receipt' && (<div className="mt-2 text-xs font-bold text-rose-500 flex items-center gap-1">View Receipt <ChevronRight size={12} /></div>)}
                      {notif.type === 'reminder' && (<div className="mt-2 text-xs font-bold text-amber-500 flex items-center gap-1">Check Details <ChevronRight size={12} /></div>)}
                      {notif.type === 'review' && (<div className="mt-2 text-xs font-bold text-purple-500 flex items-center gap-1">See Reply <ChevronRight size={12} /></div>)}
                  </div>
                </div>
            </div>
          ))
      )}
      
      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-sm"><div className="flex justify-end mb-2"><button onClick={() => setSelectedReceipt(null)} className="p-2 bg-white rounded-full text-black"><X size={20}/></button></div><ReceiptCard receipt={selectedReceipt} /></div>
        </div>
      )}

      {/* Reminder Modal */}
      {selectedReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-sm bg-white dark:bg-neutral-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-amber-400"></div>
                <div className="flex justify-between items-start mb-6">
                   <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center">
                     <Clock size={24} className="text-amber-600 dark:text-amber-500" />
                   </div>
                   <button onClick={() => setSelectedReminder(null)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-600 dark:text-gray-300"><X size={20}/></button>
                </div>
                
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Upcoming!</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  This is a friendly reminder for your appointment tomorrow.
                </p>

                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 mb-6">
                   <div className="flex items-center gap-3 mb-3">
                     <Calendar size={18} className="text-rose-500" />
                     <span className="font-bold text-gray-900 dark:text-white">Tomorrow, 10:00 AM</span>
                   </div>
                   <p className="text-xs text-gray-500 dark:text-gray-400 pl-8">Please arrive 10 minutes early.</p>
                </div>

                <Button onClick={() => setSelectedReminder(null)} className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20">Got it</Button>
            </div>
        </div>
      )}

      {/* Review Reply Modal */}
      {selectedReview && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
             <div className="w-full max-w-sm bg-white dark:bg-neutral-800 rounded-3xl p-6 shadow-2xl relative">
                 <div className="flex justify-between items-start mb-4">
                     <h3 className="text-xl font-bold text-gray-900 dark:text-white">Admin Response</h3>
                     <button onClick={() => setSelectedReview(null)}><X size={20}/></button>
                 </div>
                 
                 <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl mb-6">
                     {selectedReview.data?.originalComment && (
                         <div className="mb-4 pb-4 border-b border-gray-200 dark:border-white/10">
                            <p className="text-xs text-gray-500 font-bold uppercase mb-2">Your Review</p>
                            <p className="text-gray-900 dark:text-white text-sm italic">"{selectedReview.data.originalComment}"</p>
                         </div>
                     )}
                     <p className="text-xs text-gray-500 font-bold uppercase mb-2">Message</p>
                     <p className="text-gray-900 dark:text-white text-sm">
                       "{selectedReview.message}"
                     </p>
                 </div>

                 <Button onClick={() => setSelectedReview(null)} className="w-full">Close</Button>
             </div>
         </div>
      )}
    </div>
  );
};
