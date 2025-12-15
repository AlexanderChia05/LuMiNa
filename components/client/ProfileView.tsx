

import React, { useState } from 'react';
import { Edit2, User as UserIcon, CreditCard, Settings, HelpCircle, LogOut, ChevronRight, Lock, X } from 'lucide-react';
import { Button, Card } from '../UI';
import { User } from '../../types';
import { Api } from '../../services/api';

interface ProfileViewProps {
  user: User;
  setIsEditProfileOpen: (open: boolean) => void;
  setIsManageCardsOpen: (open: boolean) => void;
  handleLogout: () => void;
}

export const ProfileView = ({
  user,
  setIsEditProfileOpen,
  setIsManageCardsOpen,
  handleLogout
}: ProfileViewProps) => {
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [pinError, setPinError] = useState('');

    const handleUpdatePin = async () => {
        if (!newPin || newPin.length !== 6) {
            setPinError("PIN must be 6 digits.");
            return;
        }
        const success = await Api.updateTransactionPin(user.id, newPin);
        if (success) {
            alert("PIN Updated Successfully");
            setPinModalOpen(false);
            setNewPin('');
            setPinError('');
        } else {
            setPinError("Failed to update PIN.");
        }
    };

    return (
  <div className="animate-fadeIn space-y-6 pb-32">
    <div className="text-center pt-4">
      <div className="relative inline-block mb-4">
        <div className="w-28 h-28 rounded-full border-4 border-white shadow-xl mx-auto overflow-hidden bg-gray-200 dark:bg-white/10 flex items-center justify-center">
            {user.avatarUrl && user.avatarUrl !== 'https://i.pravatar.cc/150' ? (
                <img 
                  src={user.avatarUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {e.currentTarget.style.display='none'; e.currentTarget.parentElement?.classList.add('fallback');}}
                />
            ) : (
                <UserIcon size={48} className="text-gray-400" />
            )}
        </div>
        <div className="absolute bottom-1 right-1 bg-rose-500 text-white p-2 rounded-full border-4 border-white shadow-sm cursor-pointer hover:bg-rose-600 transition-colors">
          <Edit2 size={14} />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h3>
      <p className="text-gray-500">{user.email}</p>
    </div>
    
    <div className="space-y-3">
      <Card onClick={() => setIsEditProfileOpen(true)} className="flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border border-rose-100 dark:border-white/5 shadow-sm cursor-pointer">
          <div className="flex items-center gap-3"><UserIcon size={20} className="text-rose-500" /><span className="font-medium text-gray-900 dark:text-white">Personal Details</span></div>
          <ChevronRight size={16} className="text-gray-400 group-hover:text-rose-500" />
      </Card>
      <Card onClick={() => setIsManageCardsOpen(true)} className="flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border border-rose-100 dark:border-white/5 shadow-sm cursor-pointer">
          <div className="flex items-center gap-3"><CreditCard size={20} className="text-rose-500" /><span className="font-medium text-gray-900 dark:text-white">Payment Methods</span></div>
          <ChevronRight size={16} className="text-gray-400 group-hover:text-rose-500" />
      </Card>
      <Card onClick={() => setPinModalOpen(true)} className="flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border border-rose-100 dark:border-white/5 shadow-sm cursor-pointer">
          <div className="flex items-center gap-3"><Lock size={20} className="text-rose-500" /><span className="font-medium text-gray-900 dark:text-white">Transaction PIN</span></div>
          <ChevronRight size={16} className="text-gray-400 group-hover:text-rose-500" />
      </Card>
      <Card onClick={() => alert("Preferences")} className="flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border border-rose-100 dark:border-white/5 shadow-sm cursor-pointer">
          <div className="flex items-center gap-3"><Settings size={20} className="text-rose-500" /><span className="font-medium text-gray-900 dark:text-white">Preferences</span></div>
          <ChevronRight size={16} className="text-gray-400 group-hover:text-rose-500" />
      </Card>
      <Card onClick={() => alert("Help Support")} className="flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border border-rose-100 dark:border-white/5 shadow-sm cursor-pointer">
          <div className="flex items-center gap-3"><HelpCircle size={20} className="text-rose-500" /><span className="font-medium text-gray-900 dark:text-white">Help & Support</span></div>
          <ChevronRight size={16} className="text-gray-400 group-hover:text-rose-500" />
      </Card>
    </div>
    <Button variant="outline" onClick={handleLogout} className="w-full text-red-500 border-red-200 hover:bg-red-50 mt-4 flex items-center gap-2"><LogOut size={18}/> Log Out</Button>

    {pinModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <Card className="w-full max-w-sm bg-white dark:bg-neutral-800 p-6 shadow-2xl border-none">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Update PIN</h3>
                    <button onClick={() => setPinModalOpen(false)}><X size={20} className="text-gray-500"/></button>
                </div>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Set a new 6-digit PIN for Touch 'n Go transactions.</p>
                    <input 
                        type="password" 
                        placeholder="Enter 6-digit PIN"
                        value={newPin}
                        maxLength={6}
                        inputMode="numeric"
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g,''))}
                        className="w-full p-3 rounded-xl border border-gray-300 bg-white text-black outline-none tracking-widest text-center text-lg font-bold"
                    />
                    {pinError && <p className="text-xs text-red-500 font-bold text-center">{pinError}</p>}
                    <Button onClick={handleUpdatePin} className="w-full">Save PIN</Button>
                </div>
            </Card>
        </div>
    )}
  </div>
);
};