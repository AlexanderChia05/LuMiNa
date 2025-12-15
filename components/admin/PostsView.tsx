
import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Plus, Archive, Tag, Eye, Send, Check, Edit2, X } from 'lucide-react';
import { Card, Button } from '../UI';
import { Api } from '../../services/api';
import { Promotion, Service } from '../../types';
import { formatSGDate } from '../../utils/helpers';

export const PostsView = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Archive View Toggle
  const [showArchived, setShowArchived] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [discount, setDiscount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
     setLoading(true);
     const [promoData, serviceData] = await Promise.all([
        Api.getPromotions(),
        Api.getServices()
     ]);
     setPromotions(promoData);
     setServices(serviceData);
     setLoading(false);
  };

  const handleCreateOrUpdate = async () => {
    if (!title || !desc) {
      alert("Please fill in at least Title and Description");
      return;
    }
    
    // Default image if none provided
    const finalImage = imageUrl || 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&q=80&w=600';
    
    const payload = {
      title,
      description: desc,
      imageUrl: finalImage,
      discount: discount || 'Special Offer',
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date(Date.now() + 86400000 * 30).toISOString(),
      active: isActive,
      applicableServices: selectedServices
    };

    if (activeTab === 'edit' && editingId) {
       const success = await Api.updatePromotion(editingId, payload);
       if (success) {
         alert('Promotion Updated!');
         resetForm();
         setActiveTab('list');
         loadData();
       } else {
         alert('Update Failed');
       }
    } else {
       const success = await Api.createPromotion(payload);
       if (success) {
         alert('Promotion Posted Successfully!');
         resetForm();
         setActiveTab('list');
         loadData();
       } else {
         alert('Failed to post promotion.');
       }
    }
  };
  
  const resetForm = () => {
     setTitle(''); setDesc(''); setDiscount(''); setImageUrl(''); setSelectedServices([]); 
     setStartDate(''); setEndDate(''); setIsActive(true); setEditingId(null);
  };

  const initiateEdit = (p: Promotion) => {
     setEditingId(p.id);
     setTitle(p.title);
     setDesc(p.description);
     setDiscount(p.discount);
     setImageUrl(p.imageUrl);
     setStartDate(p.startDate ? p.startDate.split('T')[0] : '');
     setEndDate(p.endDate ? p.endDate.split('T')[0] : '');
     setIsActive(p.active);
     setSelectedServices(p.applicableServices || []);
     setActiveTab('edit');
  };

  const toggleServiceSelection = (id: string) => {
     if (selectedServices.includes(id)) {
        setSelectedServices(prev => prev.filter(s => s !== id));
     } else {
        setSelectedServices(prev => [...prev, id]);
     }
  };
  
  // Filter logic:
  // If showArchived is true -> Show INACTIVE posts
  // If showArchived is false -> Show ACTIVE posts (Normal View)
  const filteredPromotions = promotions
    .filter(p => showArchived ? !p.active : p.active)
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Promotions & Notices</h2>
        <div className="flex gap-2">
           <button 
             onClick={() => setShowArchived(!showArchived)}
             className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${showArchived ? 'bg-amber-600 text-white border border-amber-500' : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700 hover:text-white'}`}
           >
             <Archive size={16} /> {showArchived ? 'Back to Active' : 'Archived Posts'}
           </button>

           {!showArchived && (
               <button 
                 onClick={() => { setActiveTab('create'); resetForm(); }}
                 className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'create' ? 'bg-rose-600 text-white' : 'bg-neutral-800 text-white hover:bg-neutral-700'}`}
               >
                 <Plus size={16} /> New Post
               </button>
           )}
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="flex flex-col h-full overflow-hidden">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 overflow-y-auto pb-20 flex-1">
             {filteredPromotions.length === 0 ? (
               <div className="col-span-full text-center py-20 text-neutral-600">
                   <Archive size={48} className="mx-auto mb-4 opacity-50" />
                   <p>No {showArchived ? 'archived' : 'active'} promotions found.</p>
               </div>
             ) : (
               filteredPromotions.map(p => (
                  <div key={p.id} className="group relative rounded-2xl overflow-hidden shadow-lg bg-neutral-900 border border-neutral-800 flex flex-col h-[320px]">
                    <div className="h-40 relative overflow-hidden">
                       <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                       <div className="absolute top-2 right-2">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase shadow-sm ${p.active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                             {p.active ? 'Active' : 'Archived'}
                          </span>
                       </div>
                    </div>
                    
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-2">
                         <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">{p.discount}</span>
                         <span className="text-[10px] text-neutral-500">
                           {formatSGDate(p.startDate)} - {formatSGDate(p.endDate)}
                         </span>
                      </div>
                      <h4 className="text-white font-bold text-lg leading-tight mb-1 truncate">{p.title}</h4>
                      <p className="text-neutral-400 text-xs font-medium line-clamp-2">{p.description}</p>
                      
                      <div className="mt-auto pt-3 border-t border-neutral-800">
                         <Button onClick={() => initiateEdit(p)} className="w-full h-8 text-xs bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700">
                            <Edit2 size={12} className="mr-1"/> Edit / View
                         </Button>
                      </div>
                    </div>
                  </div>
               ))
             )}
          </div>
        </div>
      )}

      {(activeTab === 'create' || activeTab === 'edit') && (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-y-auto pb-10">
            {/* Form */}
            <Card className="bg-neutral-900 border-neutral-800 p-6 shadow-none h-fit">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">{activeTab === 'create' ? 'Create New Post' : 'Edit Post'}</h3>
                  <button onClick={() => {setActiveTab('list'); resetForm();}}><X size={20} className="text-neutral-500 hover:text-white"/></button>
               </div>
               
               <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Title</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:border-white" placeholder="Summer Special..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Description</label>
                    <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:border-white min-h-[100px]" placeholder="Details about the offer..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Offer Label</label>
                        <div className="relative">
                           <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"/>
                           <input type="text" value={discount} onChange={e => setDiscount(e.target.value)} className="w-full pl-10 p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:border-white" placeholder="e.g. 50% OFF / RM50 Credit" />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Status</label>
                        <select 
                          value={isActive ? 'active' : 'inactive'} 
                          onChange={(e) => setIsActive(e.target.value === 'active')}
                          className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:border-white"
                        >
                           <option value="active">Active</option>
                           <option value="inactive">Inactive</option>
                        </select>
                     </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase">Offer Range (Applicable Services)</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                       {services.map(s => (
                          <div 
                             key={s.id} 
                             onClick={() => toggleServiceSelection(s.id)}
                             className={`p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all flex items-center justify-between ${selectedServices.includes(s.id) ? 'bg-rose-900/40 border-rose-600 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}
                          >
                             <span className="truncate">{s.name}</span>
                             {selectedServices.includes(s.id) && <Check size={14} className="text-rose-500" />}
                          </div>
                       ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Start Date</label>
                       <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:border-white" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">End Date</label>
                       <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:border-white" />
                     </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Image URL</label>
                    <div className="relative">
                       <ImageIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"/>
                       <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full pl-10 p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:border-white" placeholder="https://..." />
                    </div>
                  </div>
                  
                  {/* Unified Button Style for Update and Publish */}
                  <Button 
                    onClick={handleCreateOrUpdate} 
                    className="w-full mt-4 h-12 bg-neutral-800 border border-white text-white hover:bg-neutral-700"
                  >
                     <Send size={18} className="mr-2"/> {activeTab === 'create' ? 'Publish Post' : 'Update Post'}
                  </Button>
               </div>
            </Card>

            <div className="flex flex-col gap-4">
               <h3 className="text-lg font-bold text-white flex items-center gap-2"><Eye size={20}/> Mobile Preview</h3>
               
               <div className="w-[320px] mx-auto bg-black rounded-[40px] border-8 border-neutral-800 p-4 h-[600px] overflow-hidden relative shadow-2xl">
                  <div className="flex justify-between items-center text-white px-2 mb-4 pt-1">
                     <span className="text-[10px] font-bold">9:41</span>
                     <div className="flex gap-1"><div className="w-3 h-3 bg-white rounded-full"></div><div className="w-3 h-3 bg-white rounded-full"></div></div>
                  </div>

                  <div className="bg-white h-full rounded-t-3xl p-4 overflow-y-auto">
                     <h4 className="font-bold text-black text-lg mb-4">Special Offers</h4>
                     <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-[16/9] group mb-4">
                        <img 
                          src={imageUrl || 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&q=80&w=600'} 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end">
                          <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded-md w-fit mb-1">{discount || 'Offer'}</span>
                          <h4 className="text-white font-bold text-lg leading-tight mb-1">{title || 'Post Title'}</h4>
                          <p className="text-gray-200 text-[10px] font-medium line-clamp-2">{desc || 'Description will appear here...'}</p>
                          <p className="text-gray-300 text-[9px] mt-1">
                             {startDate ? formatSGDate(startDate) : 'Start'} - {endDate ? formatSGDate(endDate) : 'End'}
                          </p>
                        </div>
                     </div>
                     <p className="text-xs text-gray-500 text-center">This is how it appears to clients.</p>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
