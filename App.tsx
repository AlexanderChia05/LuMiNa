
import React, { useState, useEffect } from 'react';
import { ClientBooking } from './pages/ClientBooking';
import { AdminDashboard } from './pages/AdminDashboard';
import { StaffApp } from './pages/StaffApp'; // New Staff App
import { AuthUI } from './components/AuthUI';
import { AuthService } from './services/auth';
import { Loader } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'client' | 'staff' | 'admin'>('client');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('customer');
  const [resetPending, setResetPending] = useState(false);

  useEffect(() => {
    // Check initial reset pending state
    setResetPending(localStorage.getItem('lumina_reset_pending') === 'true');

    // FORCE LOGOUT ON APP LOAD to ensure we start at Login Page
    const initSession = async () => {
       await AuthService.signOut();
       setSession(null);
       setLoading(false);
    };
    initSession();

    // Listen for auth changes (login/logout events)
    const { data: { subscription } } = AuthService.supabase.auth.onAuthStateChange((_event, session) => {
      // Sync pending state on auth change
      setResetPending(localStorage.getItem('lumina_reset_pending') === 'true');
      
      setSession(session);
      if (session?.user?.user_metadata?.role) {
         setUserRole(session.user.user_metadata.role);
         // If user logs in, sync the view to their role to ensure correct app is shown
         // unless it's a generic customer, which defaults to client view
         const role = session.user.user_metadata.role;
         if (role === 'staff') setView('staff');
         else if (role === 'admin') setView('admin');
         else setView('client');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleContextSwitch = async (newView: 'client' | 'staff' | 'admin') => {
      // Optimistically clear session to force logout UI immediately
      setSession(null);
      // Set the new view so AuthUI renders with correct defaultMode
      setView(newView);
      // Perform actual sign out
      await AuthService.signOut();
  };

  const onLoginSuccess = () => {
      // Callback to clear reset pending state if AuthUI finishes successfully
      setResetPending(false);
  };

  if (loading) {
    return <div className="w-screen h-screen flex items-center justify-center bg-[#F2F2F7] dark:bg-black"><Loader className="animate-spin text-gray-400" /></div>;
  }

  // If no session OR if a password reset is pending, show Auth UI based on selected view mode
  if (!session || resetPending) {
    return (
      <div className="font-sans text-gray-900 antialiased w-screen h-screen overflow-hidden relative">
        <AuthUI key={view} onLoginSuccess={onLoginSuccess} defaultMode={view} />
        
        {/* Context Switcher for Login Screen - Now matches Authenticated View (Bottom-Right, Hidden) */}
        {!resetPending && (
          <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-auto opacity-0 hover:opacity-100 transition-opacity duration-300">
             <button 
               onClick={() => setView('client')}
               className={`px-4 py-2 rounded-full shadow-lg backdrop-blur-md text-sm font-semibold border border-white/20 ${view === 'client' ? 'bg-rose-500 text-white' : 'bg-black/60 text-white hover:bg-black/80'}`}
             >
               Client App
             </button>
             <button 
               onClick={() => setView('staff')} 
               className={`px-4 py-2 rounded-full shadow-lg backdrop-blur-md text-sm font-semibold border border-white/20 ${view === 'staff' ? 'bg-rose-500 text-white' : 'bg-black/60 text-white hover:bg-black/80'}`}
             >
               Staff App
             </button>
             <button 
               onClick={() => setView('admin')} 
               className={`px-4 py-2 rounded-full shadow-lg backdrop-blur-md text-sm font-semibold border border-white/20 ${view === 'admin' ? 'bg-rose-500 text-white' : 'bg-black/60 text-white hover:bg-black/80'}`}
             >
               Admin Portal
             </button>
          </div>
        )}
      </div>
    );
  }

  // Authenticated View
  return (
    <div className="font-sans text-gray-900 antialiased w-screen h-screen overflow-hidden">
      {/* Context Switcher - Only visible for demo or if role handling is flexible */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-auto opacity-0 hover:opacity-100 transition-opacity duration-300">
        <button 
          onClick={() => handleContextSwitch('client')}
          className={`px-4 py-2 rounded-full shadow-lg backdrop-blur-md text-sm font-semibold border border-white/20 ${view === 'client' ? 'bg-rose-500 text-white' : 'bg-black/60 text-white hover:bg-black/80'}`}
        >
          Client App
        </button>
        <button 
          onClick={() => handleContextSwitch('staff')}
          className={`px-4 py-2 rounded-full shadow-lg backdrop-blur-md text-sm font-semibold border border-white/20 ${view === 'staff' ? 'bg-rose-500 text-white' : 'bg-black/60 text-white hover:bg-black/80'}`}
        >
          Staff App
        </button>
        <button 
          onClick={() => handleContextSwitch('admin')} 
          className={`px-4 py-2 rounded-full shadow-lg backdrop-blur-md text-sm font-semibold border border-white/20 ${view === 'admin' ? 'bg-rose-500 text-white' : 'bg-black/60 text-white hover:bg-black/80'}`}
        >
          Admin Portal
        </button>
      </div>

      {view === 'client' ? <ClientBooking userId={session.user.id} /> : view === 'staff' ? <StaffApp /> : <AdminDashboard />}
    </div>
  );
}
