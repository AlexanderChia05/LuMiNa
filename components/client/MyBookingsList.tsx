

import React from 'react';
import { ArrowLeft, Calendar, Clock, CreditCard, Hash, QrCode, Star } from 'lucide-react';
import { Button, Card, Avatar, Badge } from '../UI';
import { Appointment, AppointmentStatus, Service, Staff } from '../../types';
import { formatSGDate, getRankSurcharge } from '../../utils/helpers';

interface MyBookingsListProps {
  setShowMyBookings: (show: boolean) => void;
  appointments: Appointment[];
  handleBookNow: () => void;
  initiateReschedule: (id: string) => void;
  initiateCancel: (id: string) => void;
  initiateReview: (id: string) => void;
  services: Service[];
  staffList: Staff[];
}

export const MyBookingsList = ({
  setShowMyBookings,
  appointments,
  handleBookNow,
  initiateReschedule,
  initiateCancel,
  initiateReview,
  services,
  staffList
}: MyBookingsListProps) => {

  // Sort Logic:
  // Upcoming: Confirmed/Pending/Checked-In, Sorted by Nearest Date first
  // History: Completed/Cancelled, Sorted by Newest Date first
  
  const upcomingAppointments = appointments
    .filter(a => (a.status === AppointmentStatus.CONFIRMED || a.status === AppointmentStatus.PENDING || a.status === AppointmentStatus.CHECKED_IN) && new Date(a.date) > new Date())
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastAppointments = appointments
    .filter(a => {
        const apptDate = new Date(a.date);
        const now = new Date();
        const diffTime = now.getTime() - apptDate.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);

        if (a.status === AppointmentStatus.COMPLETED) {
            // Show only if completed within last 7 days
            return diffDays <= 7;
        } else if (a.status === AppointmentStatus.CANCELLED) {
             // Show until next day of booked appointment
             // i.e., hide if now > apptDate + 1 day
             return diffDays <= 1;
        } else {
            // Past pending/confirmed (missed?)
            return new Date(a.date) <= now;
        }
    })
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const renderAppointmentCard = (appt: Appointment) => {
      const service = services.find(s => s.id === appt.serviceId);
      const staff = staffList.find(st => st.id === appt.staffId);
      const isUpcoming = new Date(appt.date) > new Date() && appt.status !== AppointmentStatus.CANCELLED && appt.status !== AppointmentStatus.COMPLETED;
      const isCompleted = appt.status === AppointmentStatus.COMPLETED;
      const reschedules = appt.rescheduleCount || 0;
      const isRescheduleLocked = reschedules >= 3;
      const isCheckedIn = appt.status === AppointmentStatus.CHECKED_IN;
      
      const surcharge = staff ? getRankSurcharge(staff.rank) : 0;
      
      // Prefer the actual price paid from receipt (mapped in API), otherwise estimate
      const totalPrice = appt.pricePaid !== undefined 
          ? appt.pricePaid 
          : (service?.priceCents || 0) + surcharge;

      // Construct Rich QR Data
      const qrDataObj = {
          id: appt.id,
          svc: service?.name || 'Unknown',
          stf: staff?.name || 'Unknown',
          dt: appt.date,
          prc: (totalPrice/100).toFixed(2),
          cust: appt.customerName || 'Client'
      };
      
      const qrString = encodeURIComponent(JSON.stringify(qrDataObj));
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrString}`;

      return (
        <Card key={appt.id} className="flex flex-col gap-0 border border-rose-100 dark:border-white/5 shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-neutral-800 p-0 overflow-hidden mb-4">
          {/* Card Header: Date & Status */}
          <div className="flex justify-between items-center p-4 bg-rose-50/50 dark:bg-white/5 border-b border-rose-100 dark:border-white/5">
            <div className="flex items-center gap-2">
               <Calendar size={16} className="text-rose-600 dark:text-rose-400"/>
               <span className="text-sm font-bold text-gray-900 dark:text-white">
                 {formatSGDate(appt.date)}
               </span>
            </div>
            <Badge status={appt.status} />
          </div>

          {/* Card Body */}
          <div className="p-5 space-y-5">
            
            {/* Main Info */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-rose-900 dark:text-white mb-1">{service?.name || 'Unknown Service'}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Avatar src={staff?.avatarUrl || ''} alt={staff?.name || ''} size="sm" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">Stylist</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{staff?.name || 'Staff'}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                 <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">Ref ID</p>
                 <div className="flex items-center justify-end gap-1 text-gray-900 dark:text-gray-300 font-mono text-sm mt-0.5">
                    <Hash size={12} className="text-rose-400"/>
                    {appt.id}
                 </div>
              </div>
            </div>

            {/* Details Grid & QR Code */}
            <div className="flex gap-3">
                <div className="flex-1 space-y-3">
                    <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1 flex items-center gap-1"><Clock size={12}/> Time</p>
                        <p className="font-bold text-gray-900 dark:text-white">
                        {new Date(appt.date).toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit' })}
                        </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1 flex items-center gap-1"><CreditCard size={12}/> Total Amount</p>
                        <p className="font-bold text-gray-900 dark:text-white">RM {(totalPrice/100).toFixed(2)}</p>
                    </div>
                </div>
                
                {/* QR Code Container */}
                <div className="w-32 bg-white p-2 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center shadow-sm">
                    {/* Dynamic QR */}
                    <img src={qrUrl} alt="Check-in QR" className="w-20 h-20 object-contain mb-1" />
                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{appt.id}</p>
                    <p className="text-[9px] text-gray-400 leading-tight mt-1">Scan at reception</p>
                </div>
            </div>
            
            {/* Reschedule Info */}
            {isUpcoming && (
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                 <span className={`w-2 h-2 rounded-full ${isRescheduleLocked || isCheckedIn ? 'bg-red-500' : 'bg-green-500'}`}></span>
                 {isCheckedIn 
                    ? 'Checked-in (Actions Locked)' 
                    : isRescheduleLocked 
                        ? 'Max reschedules reached' 
                        : `${3 - reschedules} reschedules remaining`
                 }
              </div>
            )}

            {/* Actions */}
            {isUpcoming && (
              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={() => initiateReschedule(appt.id)}
                  disabled={isRescheduleLocked || isCheckedIn}
                  variant="secondary" 
                  className="flex-1 text-sm py-3 border-gray-200 text-gray-700 dark:text-gray-200 dark:border-white/20 hover:bg-gray-50 dark:hover:bg-white/10 dark:bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCheckedIn ? 'Checked In' : isRescheduleLocked ? 'Locked' : 'Reschedule'}
                </Button>
                <Button 
                  onClick={() => initiateCancel(appt.id)}
                  disabled={isCheckedIn}
                  variant="secondary" 
                  className="flex-1 text-sm py-3 text-red-600 border-red-100 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </Button>
              </div>
            )}

            {isCompleted && !appt.reviewed && (
              <div className="pt-2">
                <Button 
                  onClick={() => initiateReview(appt.id)}
                  className="w-full text-sm py-3 bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2"
                >
                  <Star size={16} fill="currentColor" /> Write a Review & Get RM5
                </Button>
              </div>
            )}
            {isCompleted && appt.reviewed && (
              <div className="pt-2 text-center text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 py-2 rounded-lg border border-green-100 dark:border-green-900/30">
                Review Submitted
              </div>
            )}
            {appt.status === AppointmentStatus.CANCELLED && (
              <div className="pt-2 text-center text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 py-2 rounded-lg border border-red-100 dark:border-red-900/30">
                CANCELLED
              </div>
            )}
          </div>
        </Card>
      );
  }

  return (
    <div className="animate-fadeIn h-full flex flex-col">
       <div className="flex items-center mb-6 shrink-0">
          <button onClick={() => setShowMyBookings(false)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 mr-2">
            <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Bookings</h2>
       </div>
       
       <div className="flex-1 overflow-y-auto pb-20">
          {appointments.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
               <Calendar size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
               <p>No bookings found.</p>
               <Button onClick={handleBookNow} className="mt-4">Book Now</Button>
             </div>
          ) : (
            <div className="space-y-8">
              {/* Upcoming Section */}
              {upcomingAppointments.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 pl-1">Upcoming</h3>
                  {upcomingAppointments.map(renderAppointmentCard)}
                </div>
              )}
              
              {/* History Section */}
              {pastAppointments.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 pl-1">History</h3>
                  {pastAppointments.map(renderAppointmentCard)}
                </div>
              )}
            </div>
          )}
       </div>
    </div>
  );
};