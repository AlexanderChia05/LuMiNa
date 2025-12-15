
import React, { useState } from 'react';
import { Plus, Star, Edit2, Calendar, X, Clock } from 'lucide-react';
import { Card, Avatar, Button, Badge } from '../UI';
import { Staff, Appointment } from '../../types';
import { formatSGDate, formatSGTime } from '../../utils/helpers';

interface StaffViewProps {
  staffList: Staff[];
  onSaveStaff: (staff: any) => void;
  appointments: Appointment[]; // Added appointments prop
}

export const StaffView = ({ staffList, onSaveStaff, appointments }: StaffViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [selectedStaffForSchedule, setSelectedStaffForSchedule] = useState<Staff | null>(null);
  
  // Form State
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');

  const openModal = (staff?: Staff) => {
    if (staff) {
      setEditingStaff(staff);
      setFormName(staff.name);
      setFormRole(staff.specialties[0]);
    } else {
      setEditingStaff(null);
      setFormName('');
      setFormRole('');
    }
    setIsModalOpen(true);
  };

  const openSchedule = (staff: Staff) => {
    setSelectedStaffForSchedule(staff);
    setIsScheduleModalOpen(true);
  };

  const handleSave = () => {
    onSaveStaff({
      staff_id: editingStaff?.id,
      name: formName,
      specialties: [formRole]
    });
    setIsModalOpen(false);
  };

  // Filter appointments for selected staff
  // Rule: CHECKED IN and CONFIRMED status only, and upcoming (>= today)
  const staffAppointments = selectedStaffForSchedule 
    ? appointments
        .filter(a => {
           if (a.staffId !== selectedStaffForSchedule.id) return false;
           if (a.status !== 'confirmed' && a.status !== 'checked-in') return false;
           // Ensure it's upcoming (including today)
           const apptDate = new Date(a.date);
           const today = new Date();
           today.setHours(0,0,0,0);
           return apptDate >= today;
        })
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  return (
  <div className="pb-20 overflow-y-auto h-full animate-fadeIn">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-bold text-white">Staff Management</h2>
      <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-white hover:bg-neutral-800 text-sm font-bold">
        <Plus size={16} /> Add New Staff
      </button>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
      {staffList.map(staff => (
        <Card key={staff.id} className="bg-neutral-900 border-neutral-800 flex flex-col items-center p-6 text-center shadow-none hover:bg-neutral-800 transition-all">
          <div className="relative mb-4">
              <Avatar src={staff.avatarUrl} alt={staff.name} size="lg" />
              <div className="absolute -bottom-2 -right-2 bg-neutral-900 rounded-full p-1 border border-neutral-800">
                 <div className="flex items-center justify-center w-6 h-6 bg-white rounded-full">
                    <Star size={12} className="text-black fill-black" />
                 </div>
              </div>
          </div>
          <h3 className="font-bold text-lg text-white">{staff.name}</h3>
          <p className="text-neutral-400 font-medium text-xs uppercase tracking-wide mb-1">{staff.rank}</p>
          <div className="flex items-center justify-center gap-1 mb-6">
             <span className="text-neutral-500 text-xs font-medium">{staff.rating.toFixed(1)} Rating</span>
          </div>
          
          <div className="flex gap-2 w-full mt-auto">
            <Button variant="secondary" className="flex-1 text-xs py-2 h-8 bg-white border-transparent text-black hover:bg-gray-200" onClick={() => openModal(staff)}>
              Edit
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 text-xs py-2 h-8 border-neutral-700 text-neutral-400 hover:text-white hover:border-white"
              onClick={() => openSchedule(staff)}
            >
              Schedule
            </Button>
          </div>
        </Card>
      ))}
    </div>

    {/* Edit/Add Modal */}
    {isModalOpen && (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">{editingStaff ? 'Edit Staff' : 'Add New Staff'}</h3>
            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-neutral-400 hover:text-white"/></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Full Name</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full p-3 border border-neutral-700 bg-white rounded-xl outline-none text-black focus:border-white transition-colors" placeholder="e.g. Sarah Jenkins"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Role / Rank</label>
              <input type="text" value={formRole} onChange={(e) => setFormRole(e.target.value)} className="w-full p-3 border border-neutral-700 bg-white rounded-xl outline-none text-black focus:border-white transition-colors" placeholder="e.g. Senior Stylist"/>
            </div>
            <div className="pt-4 flex gap-3">
              <Button onClick={() => setIsModalOpen(false)} className="flex-1 bg-red-600 text-white hover:bg-red-700 border-none">Cancel</Button>
              <Button onClick={handleSave} className="flex-1 bg-neutral-800 text-white border border-white hover:bg-neutral-700" disabled={!formName || !formRole}>Save Staff</Button>
            </div>
          </div>
        </Card>
      </div>
    )}

    {/* Schedule Modal */}
    {isScheduleModalOpen && selectedStaffForSchedule && (
       <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 p-0 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
             <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <Avatar src={selectedStaffForSchedule.avatarUrl} alt={selectedStaffForSchedule.name} size="md" />
                   <div>
                      <h3 className="text-lg font-bold text-white">{selectedStaffForSchedule.name}'s Schedule</h3>
                      <p className="text-xs text-neutral-500 uppercase font-bold">Upcoming Appointments</p>
                   </div>
                </div>
                <button onClick={() => setIsScheduleModalOpen(false)}><X size={20} className="text-neutral-400 hover:text-white"/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {staffAppointments.length === 0 ? (
                   <div className="text-center py-10 text-neutral-600">No active upcoming appointments.</div>
                ) : (
                   staffAppointments.map(appt => (
                      <div key={appt.id} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-neutral-800">
                         <div className="flex items-center gap-4">
                            <div className="text-center bg-neutral-800 rounded-lg p-2 min-w-[60px]">
                               <p className="text-xs font-bold text-neutral-500 uppercase">{formatSGDate(appt.date).split('/')[0]}</p>
                               <p className="text-lg font-bold text-white">{new Date(appt.date).getDate()}</p>
                            </div>
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <Clock size={14} className="text-neutral-500" />
                                  <span className="text-white font-bold">{formatSGTime(appt.date)}</span>
                               </div>
                               <p className="text-xs text-neutral-400">
                                  {/* @ts-ignore */}
                                  Client: {appt.customerName || 'Walk-In'}
                               </p>
                            </div>
                         </div>
                         <Badge status={appt.status} />
                      </div>
                   ))
                )}
             </div>
             <div className="p-4 border-t border-neutral-800 bg-neutral-900">
                <Button 
                   onClick={() => setIsScheduleModalOpen(false)} 
                   className="w-full bg-neutral-800 text-white border border-white hover:bg-neutral-700"
                >
                   Close
                </Button>
             </div>
          </Card>
       </div>
    )}
  </div>
  );
};
