
import React, { useState } from 'react';
import { Save, Store, Bell, Shield, Smartphone } from 'lucide-react';
import { Card, Button } from '../UI';

export const SettingsView = () => {
  const [storeName, setStoreName] = useState('Lumina Salon');
  const [notifications, setNotifications] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);

  return (
    <div className="animate-fadeIn w-full h-full pr-6 overflow-y-auto">
      <h2 className="text-xl font-bold text-white mb-6">System Settings</h2>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
         {/* General Section */}
         <Card className="bg-neutral-900 border-neutral-800 p-6 h-fit">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
               <Store size={20} className="text-neutral-400" /> General Information
            </h3>
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Store Name</label>
                  <input 
                     type="text" 
                     value={storeName} 
                     onChange={(e) => setStoreName(e.target.value)}
                     className="w-full p-3 bg-white border border-neutral-800 rounded-xl text-black outline-none focus:border-white transition-colors"
                  />
               </div>
               <div className="flex gap-4">
                  <div className="flex-1">
                     <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Opening Time</label>
                     <input type="time" defaultValue="08:30" className="w-full p-3 bg-white border border-neutral-800 rounded-xl text-black outline-none" />
                  </div>
                  <div className="flex-1">
                     <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Closing Time</label>
                     <input type="time" defaultValue="19:00" className="w-full p-3 bg-white border border-neutral-800 rounded-xl text-black outline-none" />
                  </div>
               </div>
            </div>
         </Card>

         {/* Toggles */}
         <div className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800 p-0 overflow-hidden h-fit">
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-800 rounded-lg"><Bell size={18} className="text-white"/></div>
                    <div>
                        <p className="font-bold text-white text-sm">Push Notifications</p>
                        <p className="text-xs text-neutral-500">Receive alerts for new bookings</p>
                    </div>
                </div>
                <Toggle checked={notifications} onChange={() => setNotifications(!notifications)} />
                </div>
                
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-800 rounded-lg"><Shield size={18} className="text-white"/></div>
                    <div>
                        <p className="font-bold text-white text-sm">Auto-Approve Bookings</p>
                        <p className="text-xs text-neutral-500">Automatically confirm new requests</p>
                    </div>
                </div>
                <Toggle checked={autoApprove} onChange={() => setAutoApprove(!autoApprove)} />
                </div>

                <div className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-800 rounded-lg"><Smartphone size={18} className="text-white"/></div>
                    <div>
                        <p className="font-bold text-white text-sm">Client App Maintenance</p>
                        <p className="text-xs text-neutral-500">Temporarily disable client app access</p>
                    </div>
                </div>
                <Toggle checked={false} onChange={() => {}} />
                </div>
            </Card>

            <div className="flex justify-end">
                <Button className="bg-green-600 text-white hover:bg-green-700 border-none px-8 py-3 w-full xl:w-auto">
                <Save size={18} className="mr-2" /> Save Changes
                </Button>
            </div>
         </div>
      </div>
    </div>
  );
};

const Toggle = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
   <button 
      onClick={onChange}
      className={`w-12 h-7 rounded-full transition-colors relative ${checked ? 'bg-white' : 'bg-neutral-700'}`}
   >
      <div className={`w-5 h-5 bg-black rounded-full absolute top-1 transition-all ${checked ? 'left-6' : 'left-1'}`}></div>
   </button>
);
