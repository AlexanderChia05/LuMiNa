
import React, { useState } from 'react';
import { Calendar, Clock, Check, X, Filter, RotateCcw } from 'lucide-react';
import { Card, Badge, Button } from '../UI';
import { Appointment, Staff, AppointmentStatus } from '../../types';
import { formatSGDate, formatSGTime } from '../../utils/helpers';
import { Api } from '../../services/api';

interface AppointmentsViewProps {
  appointments: Appointment[];
  staffList: Staff[];
  handleStatusChange: (id: string, status: string) => void;
}

export const AppointmentsView = ({ appointments, staffList, handleStatusChange }: AppointmentsViewProps) => {
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter States
  const [filterClient, setFilterClient] = useState('');
  const [filterStaffId, setFilterStaffId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  const clearFilters = () => {
    setFilterClient('');
    setFilterStaffId('all');
    setFilterStatus('all');
    setFilterDate('');
  };

  const handleComplete = async (appt: Appointment) => {
      if (appt.status !== 'checked-in') {
          alert('Error: Appointment must be CHECKED-IN before it can be completed.');
          return;
      }
      handleStatusChange(appt.id, 'completed');
  };

  // 1. Filter Logic
  const filteredAppointments = appointments.filter(appt => {
    // Client Name
    const clientName = appt.customerName || '';
    if (filterClient && !clientName.toLowerCase().includes(filterClient.toLowerCase())) return false;

    // Staff
    if (filterStaffId !== 'all' && appt.staffId !== filterStaffId) return false;

    // Status
    if (filterStatus !== 'all' && appt.status !== filterStatus) return false;

    // Date
    if (filterDate) {
      // The appointment.date is an ISO string. We need to match it against YYYY-MM-DD from the date input.
      const apptDateStr = new Date(appt.date).toLocaleDateString('en-CA'); // YYYY-MM-DD format
      if (apptDateStr !== filterDate) return false;
    }

    return true;
  });

  // 2. Sort Logic
  // Status Priority: CONFIRMED > CHECKED-IN > COMPLETED > ABSENCE > CANCELLED
  const statusOrder: Record<string, number> = {
    'confirmed': 1,
    'checked-in': 2,
    'completed': 3,
    'absence': 4,
    'cancelled': 5,
    'pending': 6
  };

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const statusA = statusOrder[a.status.toLowerCase()] || 99;
    const statusB = statusOrder[b.status.toLowerCase()] || 99;
    
    // Sort by Status Group first
    if (statusA !== statusB) {
      return statusA - statusB;
    }
    
    // Within same status, sort by nearest date at the top (Ascending: Oldest/Nearest to Newest/Farthest)
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return (
    <div className="h-full flex flex-col animate-fadeIn">
       <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">All Appointments</h2>
          <Button 
            variant="secondary" 
            className={`border-none ${showFilters ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-neutral-800 text-white hover:bg-neutral-700'}`}
            onClick={() => setShowFilters(!showFilters)}
          >
             <Filter size={16} className="mr-2" /> {showFilters ? 'Hide Filters' : 'Filter'}
          </Button>
       </div>

       {/* Filter Panel */}
       {showFilters && (
         <div className="mb-6 bg-neutral-900 border border-neutral-800 p-4 rounded-xl grid grid-cols-1 md:grid-cols-5 gap-4 animate-fadeIn">
            <div>
               <label className="block text-xs font-bold text-neutral-500 mb-1">Client Name</label>
               <input 
                 type="text" 
                 placeholder="Search client..." 
                 value={filterClient}
                 onChange={(e) => setFilterClient(e.target.value)}
                 className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white transition-colors"
               />
            </div>
            <div>
               <label className="block text-xs font-bold text-neutral-500 mb-1">Staff</label>
               <select 
                 value={filterStaffId} 
                 onChange={(e) => setFilterStaffId(e.target.value)}
                 className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white transition-colors appearance-none cursor-pointer"
               >
                 <option value="all">All Staff</option>
                 {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
               </select>
            </div>
            <div>
               <label className="block text-xs font-bold text-neutral-500 mb-1">Status</label>
               <select 
                 value={filterStatus} 
                 onChange={(e) => setFilterStatus(e.target.value)}
                 className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white transition-colors appearance-none cursor-pointer"
               >
                 <option value="all">All Statuses</option>
                 <option value="confirmed">Confirmed</option>
                 <option value="checked-in">Checked In</option>
                 <option value="completed">Completed</option>
                 <option value="cancelled">Cancelled</option>
                 <option value="absence">Absence</option>
                 <option value="pending">Pending</option>
               </select>
            </div>
            <div>
               <label className="block text-xs font-bold text-neutral-500 mb-1">Date</label>
               <input 
                 type="date" 
                 value={filterDate}
                 onChange={(e) => setFilterDate(e.target.value)}
                 className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white transition-colors cursor-pointer"
               />
            </div>
            <div className="flex items-end">
               <button 
                 onClick={clearFilters}
                 className="w-full bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
               >
                 <RotateCcw size={14} /> Reset
               </button>
            </div>
         </div>
       )}

       <Card className="bg-neutral-900 border-neutral-800 flex-1 overflow-hidden flex flex-col shadow-none" noPadding>
          <div className="overflow-y-auto flex-1">
             <table className="w-full text-left text-sm">
                <thead className="bg-neutral-800/50 text-neutral-400 sticky top-0 z-10">
                   <tr>
                      <th className="px-6 py-4">Ref ID</th>
                      <th className="px-6 py-4">Client</th>
                      <th className="px-6 py-4">Staff</th>
                      <th className="px-6 py-4">Service</th>
                      <th className="px-6 py-4">Date & Time</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                   {sortedAppointments.map((appt, i) => {
                      const staff = staffList.find(s => s.id === appt.staffId);
                      const isCompleteable = appt.status === 'checked-in';
                      const isCancellable = appt.status !== 'completed' && appt.status !== 'cancelled' && appt.status !== 'absence';

                      return (
                         <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-mono text-white text-xs">{appt.id}</td>
                            <td className="px-6 py-4 text-white font-bold">
                               {/* @ts-ignore */}
                               {appt.customerName || 'Walk-In'}
                            </td>
                            <td className="px-6 py-4 text-neutral-300">{staff?.name || 'Any Stylist'}</td>
                            <td className="px-6 py-4 text-neutral-300">{appt.serviceName || 'Service'}</td>
                            <td className="px-6 py-4 text-neutral-400">
                               <div className="flex items-center gap-2">
                                  <Calendar size={14} /> 
                                  {formatSGDate(appt.date)}
                                  <Clock size={14} className="ml-2" /> 
                                  {formatSGTime(appt.date)}
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <Badge status={appt.status} />
                            </td>
                            <td className="px-6 py-4">
                               <div className="flex items-center gap-2">
                                  {/* Confirmed -> Checked-In */}
                                  {appt.status === 'confirmed' && (
                                     <button 
                                       onClick={() => handleStatusChange(appt.id, 'checked-in')}
                                       className="p-2 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors"
                                       title="Check In"
                                     >
                                       <Check size={16} />
                                     </button>
                                  )}
                                  
                                  {/* Checked-In -> Completed */}
                                  {isCompleteable && (
                                     <button 
                                       onClick={() => handleComplete(appt)}
                                       className="p-2 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors"
                                       title="Mark Complete (Must be Checked-In)"
                                     >
                                       <Check size={16} />
                                     </button>
                                  )}
                                  
                                  {isCancellable && (
                                     <button 
                                       onClick={() => handleStatusChange(appt.id, 'cancelled')} 
                                       className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                                       title="Cancel"
                                     >
                                       <X size={16} />
                                     </button>
                                  )}
                               </div>
                            </td>
                         </tr>
                      );
                   })}
                   {sortedAppointments.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-10 text-neutral-600">No appointments found matching filters</td></tr>
                   )}
                </tbody>
             </table>
          </div>
       </Card>
    </div>
  );
};
