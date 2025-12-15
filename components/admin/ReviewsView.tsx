
import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Gift, AlertCircle, X, Reply } from 'lucide-react';
import { Card, Avatar, Button } from '../UI';
import { Api } from '../../services/api';
import { formatSGDate } from '../../utils/helpers';

export const ReviewsView = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('All');
  
  // Compensation State
  const [compensateModalOpen, setCompensateModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [voucherType, setVoucherType] = useState<'RM100' | '50%' | '75%' | ''>('');

  // Reply State
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
      setLoading(true);
      const data = await Api.getAllReviews();
      setReviews(data);
      setLoading(false);
  };

  const initiateCompensation = (review: any) => {
    setSelectedReview(review);
    setCompensateModalOpen(true);
    setVoucherType('');
  };

  const initiateReply = (review: any) => {
      setSelectedReview(review);
      setReplyText(review.reply || '');
      setReplyModalOpen(true);
  };

  const submitReply = async () => {
      if (selectedReview && replyText.trim()) {
          const success = await Api.replyToReview(selectedReview.id, replyText);
          if (success) {
              alert('Reply sent!');
              setReplyModalOpen(false);
              fetchReviews(); // Refresh data
          } else {
              alert('Failed to send reply.');
          }
      }
  };

  const sendCompensation = async () => {
    if (selectedReview && selectedReview.userId && voucherType) {
       const success = await Api.sendCompensationVoucher(selectedReview.userId, voucherType as any, selectedReview.id);
       if (success) {
         alert('Voucher sent successfully!');
         setCompensateModalOpen(false);
         setSelectedReview(null);
         fetchReviews(); // Refresh to show compensation status
       } else {
         alert('Failed to send voucher.');
       }
    }
  };

  // Extract unique staff names for filter
  const staffNames = ['All', ...Array.from(new Set(reviews.map(r => r.staffName)))];

  const filteredReviews = selectedStaffFilter === 'All' 
    ? reviews 
    : reviews.filter(r => r.staffName === selectedStaffFilter);

  if (loading) return <div className="text-white">Loading Reviews...</div>;

  return (
    <div className="h-full flex flex-col animate-fadeIn">
       <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Client Reviews</h2>
          
          <div className="flex items-center gap-2">
             <span className="text-sm text-neutral-400">Filter by Stylist:</span>
             <select 
               value={selectedStaffFilter} 
               onChange={(e) => setSelectedStaffFilter(e.target.value)}
               className="bg-neutral-800 text-white text-sm border border-neutral-700 rounded-lg px-3 py-2 outline-none focus:border-white"
             >
                {staffNames.map(name => <option key={name} value={name}>{name}</option>)}
             </select>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 overflow-y-auto pb-20">
          {filteredReviews.map(review => (
             <Card key={review.id} className="bg-neutral-900 border-neutral-800 p-5 flex flex-col shadow-none">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                      <Avatar src={`https://ui-avatars.com/api/?name=${review.customerName}&background=random`} alt={review.customerName} size="sm" />
                      <div>
                         <p className="text-white font-bold text-sm">{review.customerName}</p>
                         <p className="text-neutral-500 text-xs">{formatSGDate(review.date)}</p>
                      </div>
                   </div>
                   <div className="flex items-center bg-yellow-900/20 px-2 py-1 rounded text-yellow-500 gap-1">
                      <Star size={12} fill="currentColor" />
                      <span className="text-xs font-bold">{review.rating}</span>
                   </div>
                </div>
                
                <div className="flex-1 mb-4">
                   <p className="text-neutral-300 text-sm italic">"{review.comment}"</p>
                   {review.reply && (
                       <div className="mt-3 pl-3 border-l-2 border-rose-500">
                           <p className="text-[10px] text-rose-500 font-bold uppercase mb-1">Admin Reply</p>
                           <p className="text-neutral-400 text-xs">"{review.reply}"</p>
                       </div>
                   )}
                   {review.compensation && (
                       <div className="mt-3 pl-3 border-l-2 border-green-500">
                           <p className="text-[10px] text-green-500 font-bold uppercase mb-1">Compensation Sent</p>
                           <p className="text-neutral-400 text-xs">{review.compensation}</p>
                       </div>
                   )}
                </div>

                <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Avatar src={review.staffAvatar || ''} alt={review.staffName} size="sm" />
                      <div className="text-xs">
                          <span className="text-neutral-500 block">Review for</span>
                          <span className="text-white font-bold">{review.staffName}</span>
                      </div>
                   </div>
                   <div className="flex gap-2">
                        {/* Reply Button */}
                       <button
                          onClick={() => initiateReply(review)}
                          className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg transition-colors border border-neutral-700 hover:border-white"
                          title="Reply to Review"
                       >
                           <Reply size={16} />
                       </button>

                       {/* Compensation Button */}
                       <button 
                          onClick={() => initiateCompensation(review)}
                          disabled={!!review.compensation}
                          className={`p-2 rounded-lg transition-colors border ${!!review.compensation ? 'bg-neutral-800/50 text-neutral-600 border-neutral-800 cursor-not-allowed' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border-neutral-700 hover:border-white'}`}
                          title="Send Compensation"
                       >
                          <Gift size={16} />
                       </button>
                   </div>
                </div>
             </Card>
          ))}
          {filteredReviews.length === 0 && (
             <div className="col-span-full text-center py-20 text-neutral-600">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                <p>No reviews found for this selection.</p>
             </div>
          )}
       </div>

       {/* Reply Modal */}
       {replyModalOpen && selectedReview && (
           <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
              <Card className="w-full max-w-sm bg-neutral-900 border border-neutral-800 p-6 shadow-2xl">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                       <Reply size={20} className="text-blue-500"/> Reply to Review
                    </h3>
                    <button onClick={() => setReplyModalOpen(false)}><X size={20} className="text-neutral-400 hover:text-white"/></button>
                 </div>
                 
                 <div className="mb-4 bg-neutral-800 p-3 rounded-xl border border-neutral-700">
                    <p className="text-xs text-neutral-400 italic">"{selectedReview.comment}"</p>
                 </div>

                 <textarea
                    className="w-full bg-black border border-neutral-700 rounded-xl p-3 text-white text-sm outline-none focus:border-white mb-4 min-h-[100px]"
                    placeholder="Write your response here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                 />

                 <Button 
                    onClick={submitReply}
                    className="w-full bg-neutral-800 border border-white text-white hover:bg-neutral-700"
                    disabled={!replyText.trim()}
                 >
                    Send Reply
                 </Button>
              </Card>
           </div>
       )}

       {/* Compensation Modal */}
       {compensateModalOpen && selectedReview && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
             <Card className="w-full max-w-sm bg-neutral-900 border border-neutral-800 p-6 shadow-2xl">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                       <Gift size={20} className="text-rose-500"/> Compensation
                    </h3>
                    <button onClick={() => setCompensateModalOpen(false)}><X size={20} className="text-neutral-400 hover:text-white"/></button>
                 </div>
                 
                 <div className="mb-6 bg-neutral-800 p-4 rounded-xl border border-neutral-700">
                    <p className="text-xs text-neutral-500 uppercase font-bold mb-1">Customer</p>
                    <p className="text-white font-bold">{selectedReview.customerName}</p>
                    <p className="text-xs text-neutral-500 mt-2 italic">"{selectedReview.comment}"</p>
                 </div>

                 <p className="text-sm text-neutral-300 mb-4">Select a voucher to send as compensation:</p>
                 
                 <div className="space-y-3 mb-6">
                    <button 
                      onClick={() => setVoucherType('RM100')}
                      className={`w-full p-3 rounded-xl border text-left flex justify-between items-center transition-all ${voucherType === 'RM100' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-neutral-800 border-neutral-700 text-white hover:border-neutral-500'}`}
                    >
                      <span className="font-bold">RM100 Voucher</span>
                      {voucherType === 'RM100' && <Gift size={16} />}
                    </button>
                    <button 
                      onClick={() => setVoucherType('50%')}
                      className={`w-full p-3 rounded-xl border text-left flex justify-between items-center transition-all ${voucherType === '50%' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-neutral-800 border-neutral-700 text-white hover:border-neutral-500'}`}
                    >
                      <span className="font-bold">50% OFF Voucher</span>
                      {voucherType === '50%' && <Gift size={16} />}
                    </button>
                    <button 
                      onClick={() => setVoucherType('75%')}
                      className={`w-full p-3 rounded-xl border text-left flex justify-between items-center transition-all ${voucherType === '75%' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-neutral-800 border-neutral-700 text-white hover:border-neutral-500'}`}
                    >
                      <span className="font-bold">75% OFF Voucher</span>
                      {voucherType === '75%' && <Gift size={16} />}
                    </button>
                 </div>

                 {/* Updated Send Voucher Button Style (Same as Edit in PostsView) */}
                 <Button 
                    onClick={sendCompensation} 
                    disabled={!voucherType} 
                    className="w-full bg-neutral-800 hover:bg-neutral-700 text-white border border-white h-12"
                 >
                    Send Voucher
                 </Button>
             </Card>
          </div>
       )}
    </div>
  );
};
