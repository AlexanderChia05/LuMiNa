

import React, { useState } from 'react';
import { ArrowLeft, History, ScanLine, Trophy, X, QrCode, Gift, TrendingUp, Check, AlertCircle, Ticket, Clock } from 'lucide-react';
import { Button, Card } from '../UI';
import { User, Reward, RewardHistoryItem } from '../../types';
import { REWARDS } from '../../constants';
import { getTierInfo } from '../../utils/helpers';

interface RewardsViewProps {
  user: User;
  setActiveTab: (tab: any) => void;
  setHistoryModalOpen: (open: boolean) => void;
  showQrCode: boolean;
  setShowQrCode: (show: boolean) => void;
  handleClaimReward: (reward: Reward) => void;
  historyModalOpen: boolean;
  rewardHistory: RewardHistoryItem[];
  redeemModalOpen: boolean;
  setRedeemModalOpen: (open: boolean) => void;
  selectedReward: Reward | null;
  redemptionDetails: { serial: string, expiry: string } | null;
  myVouchers: Reward[]; 
}

export const RewardsView = ({
  user,
  setActiveTab,
  setHistoryModalOpen,
  showQrCode,
  setShowQrCode,
  handleClaimReward,
  historyModalOpen,
  rewardHistory,
  redeemModalOpen,
  setRedeemModalOpen,
  selectedReward,
  redemptionDetails,
  myVouchers
}: RewardsViewProps) => {
  const tierInfo = getTierInfo(user.lifetimePoints);
  const [confirmClaimReward, setConfirmClaimReward] = useState<Reward | null>(null);
  const [myVouchersModalOpen, setMyVouchersModalOpen] = useState(false);

  const initiateClaim = (reward: Reward) => {
    setConfirmClaimReward(reward);
  };

  const confirmClaim = () => {
    if (confirmClaimReward) {
      handleClaimReward(confirmClaimReward);
      setConfirmClaimReward(null);
    }
  };

  // QR Code URL Generator
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=MEMBER:${user.id}`;

  return (
    <div className="animate-fadeIn space-y-6 pb-32">
      <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button 
              onClick={() => setActiveTab('home')} 
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 mr-2"
            >
              <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Rewards</h2>
          </div>
          
          <Button 
            variant="secondary" 
            className="flex items-center gap-2 h-10 px-4 text-xs font-bold border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white"
            onClick={() => setHistoryModalOpen(true)}
          >
            <History size={16} className="text-gray-500 dark:text-gray-400" />
            History
          </Button>
      </div>

      {/* Tier Status Card */}
      <div className="relative perspective-1000">
        <div className={`relative transition-transform duration-700 transform-style-3d ${showQrCode ? 'rotate-y-180' : ''}`}>
           {/* FRONT SIDE (Stats) */}
           {!showQrCode && (
              <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${tierInfo.color} p-6 text-white shadow-xl shadow-yellow-500/20`}>
                 <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
                 
                 {/* Scan Button */}
                 <button 
                    onClick={() => setShowQrCode(true)}
                    className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 backdrop-blur-sm z-20"
                 >
                    <ScanLine size={20} className="text-white" />
                 </button>

                 <div className="relative z-10 text-center pt-2">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                       <Trophy size={32} className="text-white drop-shadow-md" />
                    </div>
                    <p className="text-white/80 font-bold uppercase tracking-widest text-sm mb-1">Current Balance</p>
                    <h2 className="text-4xl font-black mb-1 tracking-tight">{user.points} pts</h2>
                    <p className="text-sm font-medium opacity-90 mb-6">{tierInfo.current} Member Status</p>
                    
                    <div className="bg-black/20 p-4 rounded-xl backdrop-blur-sm border border-white/10 text-left">
                       <div className="flex justify-between text-xs font-bold uppercase mb-2 text-white/90">
                          <span>Progress to {tierInfo.next || 'Max Tier'}</span>
                          <span>{user.lifetimePoints} / {tierInfo.nextThreshold || tierInfo.max}</span>
                       </div>
                       <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden relative">
                          <div className="bg-white h-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out" style={{ width: `${Math.min(tierInfo.progress, 100)}%` }}></div>
                       </div>
                       <p className="text-[10px] text-white/70 mt-2 text-center">1 RM Spent = 1 Point Earned</p>
                    </div>
                 </div>
              </div>
           )}

           {/* BACK SIDE (QR Code) */}
           {showQrCode && (
              <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-neutral-800 p-8 text-center shadow-xl border-4 border-yellow-400 h-[340px] flex flex-col items-center justify-center animate-fadeIn transform rotate-y-180">
                 <button 
                    onClick={() => setShowQrCode(false)}
                    className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-500"
                 >
                    <X size={20} />
                 </button>
                 
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-widest">Member ID</h3>
                 <div className="p-3 bg-white rounded-2xl border-2 border-gray-100 shadow-inner mb-4">
                    <img src={qrUrl} alt="Member QR" className="w-32 h-32 object-contain" />
                 </div>
                 <p className="font-mono text-xl font-bold text-gray-900 dark:text-white tracking-widest">{user.id.substring(0,8).toUpperCase()}</p>
                 <p className="text-xs text-gray-400 mt-2">Scan at counter to earn points</p>
              </div>
           )}
        </div>
      </div>

      {/* Quick Action: My Vouchers */}
      <Button 
        variant="secondary"
        onClick={() => setMyVouchersModalOpen(true)} 
        className="w-full h-14 bg-white dark:bg-white/5 border border-rose-200 dark:border-white/10 text-rose-500 dark:text-white font-bold flex items-center justify-between px-6 shadow-sm hover:bg-rose-50 dark:hover:bg-white/10"
      >
        <span className="flex items-center gap-2"><Ticket size={20}/> My Vouchers</span>
        <span className="bg-rose-100 dark:bg-rose-500 text-rose-600 dark:text-white px-2 py-1 rounded-md text-xs">{myVouchers.length} Active</span>
      </Button>

      {/* Redeem Vouchers - Vertical Grid */}
      <div>
         <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Gift size={20} className="text-rose-500" /> Redeem Rewards
         </h3>
         <div className="grid grid-cols-2 gap-3 pb-20">
            {REWARDS.map((reward) => (
               <div key={reward.id} className="relative rounded-2xl overflow-hidden shadow-md shadow-black/5 aspect-[3/4] group border border-gray-100 dark:border-white/5 bg-white dark:bg-neutral-800 flex flex-col">
                  {/* Image Section */}
                  <div className="relative h-1/2 overflow-hidden">
                     <div className="w-full h-full bg-gradient-to-br from-rose-50 to-rose-100 dark:from-neutral-700 dark:to-neutral-800 flex flex-col items-center justify-center p-4 text-center">
                        <h3 className="font-black text-2xl text-rose-500 dark:text-rose-400">{reward.title.split(' ')[0]}</h3>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500 mt-1">Voucher</p>
                     </div>
                     <div className="absolute top-2 left-2 bg-yellow-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                       {reward.cost} pts
                     </div>
                  </div>
                  
                  {/* Content Section */}
                  <div className="p-3 flex flex-col flex-1 justify-between bg-white dark:bg-neutral-800/80">
                     <div>
                       <h4 className="text-gray-900 dark:text-white font-bold text-sm leading-tight mb-1 line-clamp-2">{reward.title}</h4>
                       <p className="text-gray-500 dark:text-gray-400 text-[10px] leading-tight line-clamp-2">{reward.description}</p>
                     </div>
                     
                     <Button 
                       onClick={() => initiateClaim(reward)}
                       disabled={user.points < reward.cost}
                       className={`w-full h-8 mt-2 text-xs font-bold rounded-lg shadow-none ${user.points < reward.cost ? 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-600' : 'bg-rose-500 text-white hover:bg-rose-600'}`}
                     >
                       {user.points < reward.cost ? 'Locked' : 'Claim'}
                     </Button>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* My Vouchers Modal */}
      {myVouchersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-sm bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-rose-600 dark:text-white flex items-center gap-2">
                 <Ticket size={20} className="text-rose-500" /> My Vouchers
               </h3>
               <button onClick={() => setMyVouchersModalOpen(false)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-600 dark:text-gray-300">
                 <X size={20} />
               </button>
             </div>
             
             <div className="space-y-4">
                {myVouchers.length === 0 ? (
                  <p className="text-center text-gray-500 py-10">No active vouchers.</p>
                ) : (
                  myVouchers.map((v, i) => (
                    <div key={i} className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-500/20 p-4 rounded-2xl relative overflow-hidden">
                       <div className="absolute -right-4 -top-4 w-16 h-16 bg-rose-500/10 rounded-full blur-xl"></div>
                       <div className="flex justify-between items-start mb-2 relative z-10">
                          <h4 className="font-black text-rose-600 dark:text-white text-lg">{v.title}</h4>
                          <span className="bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-200 text-[10px] font-bold px-2 py-0.5 rounded">ACTIVE</span>
                       </div>
                       <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 relative z-10">{v.description}</p>
                       <div className="flex items-center gap-2 text-xs font-bold text-rose-500 relative z-10">
                          <Clock size={12} /> Expires: {v.expiryDate || 'N/A'}
                       </div>
                       {v.serialNumber && (
                         <div className="mt-2 pt-2 border-t border-rose-200 dark:border-white/10 flex justify-between items-center relative z-10">
                            <span className="text-[10px] uppercase font-bold text-rose-400 dark:text-gray-400 tracking-wider">Serial</span>
                            <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-200">{v.serialNumber}</span>
                         </div>
                       )}
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmClaimReward && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <Card className="w-full max-w-sm bg-white dark:bg-neutral-800 p-6 shadow-2xl border-none">
             <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 mx-auto">
               <AlertCircle size={24} className="text-amber-600 dark:text-amber-500" />
             </div>
             <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">Confirm Redemption</h3>
             <p className="text-center text-gray-600 dark:text-gray-300 text-sm mb-6">
               Are you sure you want to spend <b>{confirmClaimReward.cost} points</b> to claim this {confirmClaimReward.title}?
             </p>
             <div className="flex gap-3">
               <Button variant="secondary" onClick={() => setConfirmClaimReward(null)} className="flex-1 border-gray-200 dark:border-white/10 dark:text-white dark:bg-transparent">Cancel</Button>
               <Button onClick={confirmClaim} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white border-none shadow-rose-500/20">Yes, Claim it</Button>
             </div>
          </Card>
        </div>
      )}

      {/* History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-sm bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                 <History size={20} className="text-gray-500" /> History
               </h3>
               <button onClick={() => setHistoryModalOpen(false)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-600 dark:text-gray-300">
                 <X size={20} />
               </button>
             </div>
             
             <div className="space-y-4">
                {rewardHistory.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border-b border-gray-100 dark:border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'earn' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                            {item.type === 'earn' ? <TrendingUp size={16} /> : <Gift size={16} />}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.date}</p>
                        </div>
                      </div>
                      <span className={`font-mono font-bold text-sm ${item.type === 'earn' ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {item.pts}
                      </span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* Redemption Success Modal */}
      {redeemModalOpen && selectedReward && redemptionDetails && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <Card className="w-full max-w-sm bg-white dark:bg-neutral-800 p-8 shadow-2xl border-none relative overflow-hidden text-center">
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 to-rose-500"></div>
               
               <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 mx-auto animate-bounce">
                  <Check size={40} className="text-green-600 dark:text-green-400" />
               </div>
               
               <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Reward Claimed!</h3>
               <p className="text-gray-500 dark:text-gray-400 mb-6">You have successfully redeemed:</p>
               
               <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 mb-6">
                  <h4 className="font-bold text-lg text-rose-600 dark:text-rose-400 mb-1">{selectedReward.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{selectedReward.description}</p>
                  
                  <div className="border-t border-dashed border-gray-300 dark:border-white/10 pt-4 mt-4">
                     <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Serial Number</p>
                     <p className="font-mono text-xl font-bold text-gray-900 dark:text-white tracking-widest select-all">{redemptionDetails.serial}</p>
                     <p className="text-xs text-gray-400 mt-2">Expires: {redemptionDetails.expiry}</p>
                  </div>
               </div>
               
               <Button onClick={() => setRedeemModalOpen(false)} className="w-full">Done</Button>
            </Card>
         </div>
      )}
    </div>
  );
};