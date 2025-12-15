

import React, { useState } from 'react';
import { Search, UserPlus, X, FileText, Clock, Check, Mail, Phone, Calendar, User as UserIcon } from 'lucide-react';
import { Card, Button, Avatar } from '../UI';
import { User, Appointment } from '../../types';
import { formatSGDate } from '../../utils/helpers';

interface ClientsViewProps {
  clients: User[];
  appointments: Appointment[];
}

export const ClientsView = ({
  clients,
  appointments
}: ClientsViewProps) => {
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<User | null>(null);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
    c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const getClientHistory = (userId: string) => {
    return appointments.filter(a => a.userId === userId);
  };

  return (
    <div className="h-full flex gap-6 overflow-hidden animate-fadeIn">
      {/* Client List */}
      <div className={`flex-1 flex flex-col ${selectedClient ? 'w-2/3 hidden md:flex' : 'w-full'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Clients Directory</h2>
          <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input 
                type="text" 
                placeholder="Search clients..." 
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white rounded-xl border border-neutral-800 outline-none focus:border-white focus:ring-1 focus:ring-white w-64 text-black placeholder-neutral-600" 
              />
          </div>
        </div>

        <Card className="bg-neutral-900 border-neutral-800 flex-1 overflow-hidden flex flex-col shadow-none" noPadding>
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-800/50 text-neutral-400 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Points</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filteredClients.map(client => (
                  <tr key={client.id} className={`hover:bg-white/5 transition-colors ${selectedClient?.id === client.id ? 'bg-white/10' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         {/* Replaced Avatar with User Icon container */}
                         <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
                            <UserIcon size={16} className="text-neutral-400" />
                         </div>
                         <span className="font-bold text-white">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-400">
                      <div className="flex flex-col text-xs">
                         <span>{client.email}</span>
                         <span>{client.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-300 font-mono">{client.points}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedClient(client)}
                        className="text-white font-bold text-xs hover:underline"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                   <tr><td colSpan={4} className="text-center py-10 text-neutral-600">No clients found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Client Detail Panel */}
      {selectedClient && (
        <div className="w-full md:w-[400px] bg-neutral-900 border-l border-neutral-800 h-full overflow-y-auto p-6 shadow-2xl z-20 absolute right-0 top-0 bottom-0 md:static md:shadow-none animate-fadeIn flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-xl text-white">Client Profile</h3>
            <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 border-4 border-neutral-800 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center">
               <UserIcon size={48} className="text-neutral-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">{selectedClient.name}</h2>
            <div className="flex items-center justify-center gap-2 mt-2 text-neutral-400 text-sm">
               <Mail size={14} /> {selectedClient.email}
            </div>
            {selectedClient.phone && (
              <div className="flex items-center justify-center gap-2 mt-1 text-neutral-400 text-sm">
                 <Phone size={14} /> {selectedClient.phone}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-black/40 p-4 rounded-2xl text-center border border-neutral-800">
              <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Lifetime Pts</p>
              <p className="text-xl font-bold text-white">{selectedClient.lifetimePoints}</p>
            </div>
            <div className="bg-black/40 p-4 rounded-2xl text-center border border-neutral-800">
               <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Current Pts</p>
               <p className="text-xl font-bold text-white">{selectedClient.points}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
               <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"><Clock size={16} className="text-neutral-500"/> Booking History</h4>
               <div className="space-y-3">
                  {getClientHistory(selectedClient.id).map((appt, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border border-neutral-800 rounded-xl hover:bg-white/5 bg-black/20">
                      <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
                        <Calendar size={16} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{formatSGDate(appt.date)}</p>
                        <p className="text-xs text-neutral-500 capitalize">{appt.status}</p>
                      </div>
                      <span className="text-xs font-mono text-neutral-400">{appt.id}</span>
                    </div>
                  ))}
                  {getClientHistory(selectedClient.id).length === 0 && (
                     <p className="text-sm text-neutral-600 italic">No bookings history.</p>
                  )}
               </div>
            </div>
          </div>
          
          <div className="mt-auto pt-6">
             <Button className="w-full bg-white text-black hover:bg-gray-200">Contact Client</Button>
          </div>
        </div>
      )}
    </div>
  );
};