
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, CheckCircle, Clock, LogOut, QrCode, User, X, CreditCard, Settings, HelpCircle, ChevronRight, ScanLine, Tag } from 'lucide-react';
import { Card, Button, Avatar, Badge } from '../components/UI';
import { Appointment, Staff } from '../types';
import { Api } from '../services/api';
import { AuthService } from '../services/auth';
import { supabase } from '../services/supabase';
import { formatSGDate, formatSGTime } from '../utils/helpers';
// @ts-ignore
import jsQR from 'jsqr';

type Tab = 'schedule' | 'scan' | 'profile';

export const StaffApp = () => {
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffProfile, setStaffProfile] = useState<Staff | null>(null);
  const [scanResult, setScanResult] = useState<string>('');
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scanMessage, setScanMessage] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const isScanningRef = useRef(false); // Track if scanning tab is active

  useEffect(() => {
    // Force Light Mode for Staff App
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.remove('theme-dark');
    document.documentElement.style.colorScheme = 'light';

    const init = async () => {
      setLoading(true);
      // Run auto-processes for Absence and Reminders
      await Api.processAbsences();
      await Api.processCompletions(); // NEW: Process completions automatically
      await Api.checkReminders();

      const session = await AuthService.getSession();
      if (session?.user?.email) {
          const profile = await Api.getStaffByEmail(session.user.email);
          if (profile) {
              setStaffProfile(profile);
              const appts = await Api.getStaffAppointments(profile.id);
              // Filter out cancelled, sort by date
              const sorted = appts
                 .filter(a => a.status !== 'cancelled')
                 .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              setAppointments(sorted);
          }
      }
      setLoading(false);
    };
    init();

    const sub = supabase.channel('staff-appts').on('postgres_changes', { event: '*', schema: 'public', table: 'appointment' }, () => init()).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  // Handle Camera Start/Stop based on Tab
  useEffect(() => {
    if (activeTab === 'scan') {
       isScanningRef.current = true;
       startCamera();
    } else {
       isScanningRef.current = false;
       stopCamera();
       if (requestRef.current) {
           cancelAnimationFrame(requestRef.current);
           requestRef.current = null;
       }
    }
    return () => {
      isScanningRef.current = false;
      stopCamera();
      if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
          requestRef.current = null;
      }
    };
  }, [activeTab]);

  const startCamera = async () => {
     if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (isScanningRef.current) {
            setScanStatus('error');
            setScanMessage("Camera not supported in this browser.");
        }
        return;
     }

     try {
       const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
       
       // Check if user switched tabs while we were waiting for permissions
       if (!isScanningRef.current) {
           stream.getTracks().forEach(t => t.stop());
           return;
       }

       if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to be ready to start scanning
          videoRef.current.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
          
          // Use catch to prevent "play() request was interrupted" errors
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
              playPromise.catch(e => {
                  if (e.name !== 'AbortError') {
                      console.error("Video play error:", e);
                  }
              });
          }
          
          requestRef.current = requestAnimationFrame(tick);
       }
       if (isScanningRef.current) setScanStatus('idle'); 
     } catch (err) {
       console.error("Camera access denied or unavailable", err);
       if (isScanningRef.current) {
           setScanStatus('error');
           setScanMessage("Camera access denied. Please enable permissions or use manual ID entry below.");
       }
     }
  }

  const stopCamera = () => {
     if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
         videoRef.current.srcObject = null;
     }
  }

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.height = videoRef.current.videoHeight;
                canvas.width = videoRef.current.videoWidth;
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Attempt to decode QR
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });

                if (code) {
                    try {
                        const rawData = code.data;
                        let refId = rawData;
                        // Try to parse JSON if complex data
                        if (rawData.trim().startsWith('{') || rawData.trim().startsWith('%7B')) {
                            const decoded = decodeURIComponent(rawData);
                            const json = JSON.parse(decoded);
                            if (json.id) refId = json.id;
                        }
                        
                        // If valid ID found and we aren't already processing/success
                        if (refId && scanStatus === 'idle') {
                            processScan(refId);
                            return; // Stop scanning momentarily
                        }
                    } catch (e) {
                        // ignore parsing error
                    }
                }
            }
        }
    }
    // Continue loop
    if (activeTab === 'scan' && isScanningRef.current && scanStatus !== 'success') {
       requestRef.current = requestAnimationFrame(tick);
    }
  };

  // Resume scanning after success/error timeout
  useEffect(() => {
     if (activeTab === 'scan' && scanStatus === 'idle' && videoRef.current && !requestRef.current) {
         requestRef.current = requestAnimationFrame(tick);
     }
  }, [scanStatus, activeTab]);

  const handleLogout = async () => {
    await AuthService.signOut();
  };

  const handleManualCodeEntry = async () => {
    if (!scanResult || !staffProfile) return;
    processScan(scanResult);
  };
  
  const processScan = async (refId: string) => {
     if(!staffProfile) return;
     
     // Optimistic check to avoid duplicate API calls
     if (scanStatus === 'success') return;

     const { success, message } = await Api.markAppointmentPresence(refId, staffProfile.id);
     
     if (success) {
         setScanStatus('success');
         setScanMessage(message);
         
         // Immediately update local state for UI responsiveness
         setAppointments(prev => prev.map(a => 
            a.id === refId ? { ...a, status: 'checked-in' as any } : a
         ));

         setTimeout(() => {
            if (isScanningRef.current) {
                setScanStatus('idle');
                setScanResult('');
            }
         }, 3000);
     } else {
         setScanStatus('error');
         setScanMessage(message);
         setTimeout(() => {
             if (isScanningRef.current) setScanStatus('idle');
         }, 3000);
     }
  };

  if (loading) return <div className="h-screen bg-gray-200 flex items-center justify-center text-gray-500">Loading Staff App...</div>;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-200 p-0 md:p-8">
      {/* Mobile Container matched to Client App Dimensions */}
      <div className="w-full h-full md:w-[440px] md:h-[956px] shrink-0 md:rounded-[60px] relative bg-white shadow-2xl overflow-hidden flex flex-col border-0 md:border-[8px] border-neutral-900/5 ring-1 ring-black/5">
         
         <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-b-3xl z-50"></div>
         
         {/* Main Content Area */}
         <main className={`flex-1 pt-8 md:pt-12 pb-28 scroll-smooth no-scrollbar relative z-0 bg-white ${activeTab === 'scan' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            
            {/* Header (Visible on Schedule & Scan) */}
            {activeTab !== 'profile' && (
                <div className="px-6 mb-6 flex justify-between items-center">
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">Stylist Portal</p>
                        <h2 className="text-2xl font-black text-gray-900">Hello, {staffProfile?.name.split(' ')[0]}</h2>
                    </div>
                    <Avatar src={staffProfile?.avatarUrl || ''} alt="Profile" size="md" />
                </div>
            )}

            {/* SCHEDULE TAB */}
            {activeTab === 'schedule' && (
                <div className="px-6 space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg text-gray-900">Upcoming Appointments</h3>
                        <span className="bg-rose-100 text-rose-600 px-2 py-1 rounded-lg text-xs font-bold">{appointments.filter(a => a.status === 'confirmed' || a.status === 'checked-in').length} Active</span>
                    </div>

                    {appointments.filter(a => a.status === 'confirmed' || a.status === 'checked-in' || a.status === 'absence').length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-3xl border border-gray-100">
                           <Calendar size={48} className="text-gray-300 mx-auto mb-4" />
                           <p className="text-gray-500 font-medium">No active appointments.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {appointments.filter(a => a.status === 'confirmed' || a.status === 'checked-in' || a.status === 'absence').map(appt => {
                                const isToday = new Date(appt.date).getDate() === new Date().getDate();
                                return (
                                    <div key={appt.id} className="group relative bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all">
                                        <div className="absolute top-5 right-5">
                                            <Badge status={appt.status} />
                                        </div>
                                        
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl ${isToday ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
                                                <span className="text-xs font-bold uppercase leading-none mb-1">{new Date(appt.date).toLocaleDateString('en-GB', { month: 'short' })}</span>
                                                <span className="text-xl font-black leading-none">{new Date(appt.date).getDate()}</span>
                                            </div>
                                            <div>
                                                {/* @ts-ignore */}
                                                <h4 className="font-bold text-gray-900 text-lg">{appt.customerName || 'Walk-In'}</h4>
                                                <div className="flex items-center gap-1 text-gray-500 text-xs font-medium">
                                                    <Clock size={12} />
                                                    {formatSGTime(appt.date)}
                                                    {appt.duration && ` (${appt.duration} mins)`}
                                                </div>
                                                {appt.serviceName && (
                                                    <div className="mt-1 flex items-center gap-1 text-rose-500 text-xs font-bold uppercase">
                                                       <Tag size={12} /> {appt.serviceName}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex justify-between items-center">
                                            <div className="text-xs">
                                                <p className="text-gray-400 font-bold uppercase tracking-wide">Ref ID</p>
                                                <p className="text-gray-900 font-mono font-bold">{appt.id}</p>
                                            </div>
                                            {(appt.status === 'confirmed' || appt.status === 'checked-in') && (
                                               <div className={`w-8 h-8 rounded-full flex items-center justify-center ${appt.status === 'checked-in' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                                  <CheckCircle size={16} />
                                               </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* SCAN TAB */}
            {activeTab === 'scan' && (
                <div className="px-6 flex flex-col h-full animate-fadeIn">
                    <div className="text-center mb-8 mt-4">
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Check-in Client</h3>
                        <p className="text-gray-500 text-sm">Scan the customer's QR code or enter Ref ID to mark attendance.</p>
                    </div>

                    <div className="relative w-full aspect-square bg-black rounded-[40px] overflow-hidden shadow-2xl mb-8 flex items-center justify-center group">
                        {/* Hidden Canvas for Processing */}
                        <canvas ref={canvasRef} className="hidden"></canvas>

                        {/* Camera Video Feed */}
                        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                        
                        {/* Scanner Overlay */}
                        <div className="absolute inset-8 border-2 border-white/30 rounded-3xl z-10 pointer-events-none">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-rose-500 rounded-tl-xl"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-rose-500 rounded-tr-xl"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-rose-500 rounded-bl-xl"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-rose-500 rounded-br-xl"></div>
                            
                            {/* Scanning Animation */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.8)] animate-[scan_2s_linear_infinite]"></div>
                        </div>

                        {/* Simulated Scan Trigger (Hidden but tappable for testing if camera fails) */}
                        <div className="absolute inset-0 z-0" onClick={() => processScan('A1453')} style={{ pointerEvents: scanStatus === 'error' ? 'auto' : 'none' }}></div>

                        {scanStatus === 'success' ? (
                           <div className="absolute inset-0 bg-blue-500/90 z-20 flex flex-col items-center justify-center animate-fadeIn">
                               <CheckCircle size={64} className="text-white mb-4 drop-shadow-md" />
                               <h4 className="text-white font-black text-2xl">Checked In!</h4>
                               <p className="text-white/80 font-medium text-sm mt-2 text-center px-4">{scanMessage}</p>
                           </div>
                        ) : scanStatus === 'error' ? (
                           <div className="absolute inset-0 bg-red-500/90 z-20 flex flex-col items-center justify-center animate-fadeIn">
                               <X size={64} className="text-white mb-4 drop-shadow-md" />
                               <h4 className="text-white font-black text-2xl">Error</h4>
                               <p className="text-white/80 font-medium text-sm mt-2 text-center px-4">{scanMessage}</p>
                           </div>
                        ) : (
                            <p className="relative z-10 text-white/50 text-xs font-bold uppercase tracking-widest pointer-events-none">Scanning...</p>
                        )}
                    </div>

                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 text-center">Or enter manually</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={scanResult}
                                onChange={(e) => setScanResult(e.target.value.toUpperCase())}
                                placeholder="A1234"
                                maxLength={5}
                                className="flex-1 bg-white border-none rounded-2xl px-4 text-center font-mono font-bold text-xl text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-rose-500"
                            />
                            <button 
                                onClick={handleManualCodeEntry}
                                disabled={!scanResult}
                                className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-500/30 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && staffProfile && (
                <div className="px-6 animate-fadeIn space-y-6">
                    <div className="text-center pt-8 mb-8">
                        <div className="w-28 h-28 mx-auto bg-gray-100 rounded-full p-1 border-2 border-dashed border-rose-300 mb-4 relative">
                            <img src={staffProfile.avatarUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                            <div className="absolute bottom-0 right-0 bg-rose-500 text-white p-2 rounded-full border-4 border-white">
                                <Settings size={14} />
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900">{staffProfile.name}</h2>
                        <p className="text-rose-500 font-bold text-sm uppercase tracking-wide mt-1">{staffProfile.rank}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
                            <p className="text-xs text-gray-400 font-bold uppercase">Rating</p>
                            <p className="text-xl font-black text-gray-900 mt-1">{staffProfile.rating} <span className="text-sm text-yellow-400">★</span></p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
                            <p className="text-xs text-gray-400 font-bold uppercase">Appts Today</p>
                            <p className="text-xl font-black text-gray-900 mt-1">
                                {appointments.filter(a => new Date(a.date).getDate() === new Date().getDate()).length}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Card className="flex items-center justify-between group hover:bg-gray-50 transition-colors border border-gray-100 shadow-sm cursor-pointer py-4">
                            <div className="flex items-center gap-3"><User size={20} className="text-rose-500" /><span className="font-medium text-gray-900">Personal Details</span></div>
                            <ChevronRight size={16} className="text-gray-400 group-hover:text-rose-500" />
                        </Card>
                        <Card className="flex items-center justify-between group hover:bg-gray-50 transition-colors border border-gray-100 shadow-sm cursor-pointer py-4">
                            <div className="flex items-center gap-3"><CreditCard size={20} className="text-rose-500" /><span className="font-medium text-gray-900">Payroll Info</span></div>
                            <ChevronRight size={16} className="text-gray-400 group-hover:text-rose-500" />
                        </Card>
                        <Card className="flex items-center justify-between group hover:bg-gray-50 transition-colors border border-gray-100 shadow-sm cursor-pointer py-4">
                            <div className="flex items-center gap-3"><HelpCircle size={20} className="text-rose-500" /><span className="font-medium text-gray-900">Support</span></div>
                            <ChevronRight size={16} className="text-gray-400 group-hover:text-rose-500" />
                        </Card>
                    </div>

                    <Button onClick={handleLogout} variant="outline" className="w-full border-red-200 text-red-500 hover:bg-red-50 h-12 gap-2 mt-4">
                        <LogOut size={18} /> Sign Out
                    </Button>
                </div>
            )}
         </main>

         {/* Bottom Tab Bar */}
         <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-[360px] z-50">
             <div className="bg-white/90 backdrop-blur-xl border border-gray-200 p-1 rounded-full flex items-center justify-between shadow-2xl relative">
                {/* Active Indicator Blob */}
                <div 
                  className="absolute top-1 bottom-1 bg-gray-900 rounded-full shadow-md transition-all duration-300 ease-out z-0"
                  style={{ 
                      left: `${(activeTab === 'schedule' ? 0 : activeTab === 'scan' ? 1 : 2) * (100 / 3) + 0.5}%`, 
                      width: `${100 / 3 - 1}%` 
                  }}
                />

                <button 
                   onClick={() => setActiveTab('schedule')}
                   className={`relative flex-1 h-12 flex flex-col items-center justify-center gap-0.5 rounded-full z-10 transition-colors duration-200 ${activeTab === 'schedule' ? 'text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                   <Calendar size={20} strokeWidth={activeTab === 'schedule' ? 2.5 : 2} />
                   <span className="text-[10px] font-bold">Schedule</span>
                </button>

                <button 
                   onClick={() => setActiveTab('scan')}
                   className={`relative flex-1 h-12 flex flex-col items-center justify-center gap-0.5 rounded-full z-10 transition-colors duration-200 ${activeTab === 'scan' ? 'text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                   <ScanLine size={20} strokeWidth={activeTab === 'scan' ? 2.5 : 2} />
                   <span className="text-[10px] font-bold">Scan</span>
                </button>

                <button 
                   onClick={() => setActiveTab('profile')}
                   className={`relative flex-1 h-12 flex flex-col items-center justify-center gap-0.5 rounded-full z-10 transition-colors duration-200 ${activeTab === 'profile' ? 'text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                   <User size={20} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
                   <span className="text-[10px] font-bold">Profile</span>
                </button>
             </div>
         </div>

      </div>
    </div>
  );
};
