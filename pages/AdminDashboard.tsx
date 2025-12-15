
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Users, DollarSign, Settings, Search, Bell, 
  Menu, LogOut, Loader, FileText, MessageSquare, Megaphone, CheckCircle
} from 'lucide-react';
import { Avatar, Button } from '../components/UI';
import { Staff, Appointment, User, Receipt, Service, Notification } from '../types';
import { Api } from '../services/api';
import { supabase } from '../services/supabase';
import { AuthService } from '../services/auth';

// Import Views
import { DashboardView } from '../components/admin/DashboardView';
import { StaffView } from '../components/admin/StaffView';
import { ClientsView } from '../components/admin/ClientsView';
import { TransactionsView } from '../components/admin/TransactionsView';
import { SettingsView } from '../components/admin/SettingsView';
import { AppointmentsView } from '../components/admin/AppointmentsView'; 
import { ReviewsView } from '../components/admin/ReviewsView';
import { PostsView } from '../components/admin/PostsView';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Alerts State
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState<Notification[]>([]);
  const [alertFilter, setAlertFilter] = useState<'all' | 'booking' | 'system' | 'review'>('all');

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.add('theme-dark');
  }, []);

  const handleLogout = async () => {
    await AuthService.signOut();
  };

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Receipt[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [stats, setStats] = useState({ revenue: 0, count: 0 });

  const loadData = async () => {
    setLoading(true);
    try {
      const [appts, staff, custs, trans, servs, notifs] = await Promise.all([
        Api.getAllAppointments(),
        Api.getStaff(),
        Api.getAllCustomers(),
        Api.getAllTransactions(),
        Api.getServices(),
        Api.getAdminNotifications()
      ]);

      setAppointments(appts);
      setStaffList(staff);
      setClients(custs);
      setTransactions(trans);
      setServices(servs);
      setAdminNotifications(notifs);

      const totalRev = trans.reduce((sum, t) => sum + t.depositCents, 0);
      setStats({ revenue: totalRev, count: appts.length });

    } catch (e) {
      console.error("Failed to load admin data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const subAppt = supabase.channel('admin-appts').on('postgres_changes', { event: '*', schema: 'public', table: 'appointment' }, () => loadData()).subscribe();
    const subCust = supabase.channel('admin-cust').on('postgres_changes', { event: '*', schema: 'public', table: 'customer' }, () => loadData()).subscribe();
    const subStaff = supabase.channel('admin-staff').on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => loadData()).subscribe();
    const subOrder = supabase.channel('admin-order').on('postgres_changes', { event: '*', schema: 'public', table: 'order_table' }, () => loadData()).subscribe();
    const subNotif = supabase.channel('admin-notifs').on('postgres_changes', { event: '*', schema: 'public', table: 'notification' }, () => {
       Api.getAdminNotifications().then(setAdminNotifications);
    }).subscribe();

    return () => {
      supabase.removeChannel(subAppt);
      supabase.removeChannel(subCust);
      supabase.removeChannel(subStaff);
      supabase.removeChannel(subOrder);
      supabase.removeChannel(subNotif);
    };
  }, []);

  const handleStatusChange = async (refId: string, newStatus: string) => {
    const appt = appointments.find(a => a.id === refId);
    if (appt?.dbId) {
       await Api.updateAppointmentStatus(appt.dbId, newStatus);
    }
  };
  
  const handleSaveStaff = async (staffData: any) => {
    if (staffData.staff_id) {
       await Api.updateStaff(staffData.staff_id, {
         name: staffData.name,
         rank: staffData.specialties[0]
       });
    } else {
       await Api.addStaff({
         name: staffData.name,
         rank: staffData.specialties[0],
         avatar_url: `https://i.pravatar.cc/150?u=${Date.now()}`,
         rating: 5.0
       });
    }
    loadData();
  };

  // Filter Logic for Alerts
  const filteredAlerts = adminNotifications.filter(n => {
     if (alertFilter === 'all') return true;
     return n.type === alertFilter;
  });

  const NavItem = ({ icon: Icon, label }: { icon: any, label: string }) => (
    <button 
      onClick={() => { setActiveTab(label); setMobileMenuOpen(false); }}
      className={`w-full flex items-center p-3 rounded-xl text-sm font-bold transition-all ${
        activeTab === label 
          ? 'bg-white text-black shadow-lg shadow-white/10' 
          : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
      }`}
    >
      <Icon size={18} className="mr-3" />
      {label}
    </button>
  );

  if (loading) return <div className="h-screen w-full bg-black flex items-center justify-center text-white"><Loader className="animate-spin mr-2"/> Loading Admin Portal...</div>;

  return (
    // Full screen container for Admin Portal - w-screen h-screen ensures full viewport usage
    <div className="w-screen h-screen bg-black text-white flex font-sans overflow-hidden relative">
      
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          absolute md:relative z-50 h-full w-72 bg-neutral-900/50 backdrop-blur-xl border-r border-neutral-800 flex flex-col transition-transform duration-300 ease-in-out shrink-0
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-8 flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-black font-black text-xl shadow-lg shadow-white/20">L</div>
              <span className="text-2xl font-bold text-white tracking-tight">Lumina</span>
          </div>
          
          <nav className="flex-1 px-6 space-y-2 mt-4 overflow-y-auto no-scrollbar">
            <NavItem icon={Calendar} label="Dashboard" />
            <NavItem icon={FileText} label="Appointments" /> 
            <NavItem icon={Megaphone} label="Posts" /> 
            <NavItem icon={Users} label="Staff" />
            <NavItem icon={Users} label="Clients" />
            <NavItem icon={MessageSquare} label="Reviews" /> 
            <NavItem icon={DollarSign} label="Transactions" />
            <NavItem icon={Settings} label="Settings" />
          </nav>

          <div className="p-6 border-t border-neutral-800 space-y-2 mt-auto">
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-800 cursor-pointer transition-colors border border-transparent hover:border-neutral-700">
                <Avatar src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200" alt="Admin" size="md" />
                <div className="text-sm">
                  <p className="font-bold text-white">Admin User</p>
                  <p className="text-xs text-neutral-500">Super Admin</p>
                </div>
              </div>
              <Button onClick={handleLogout} variant="outline" className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 border-red-900/30 hover:border-red-500/50 mt-2">
                <LogOut size={16} /> Logout
              </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-black relative">
          <header className="px-6 md:px-8 py-6 flex justify-between items-center border-b border-neutral-800 bg-black/50 backdrop-blur-sm z-20">
            <div className="flex items-center gap-4">
              <button className="md:hidden p-2 -ml-2 text-white" onClick={() => setMobileMenuOpen(true)}><Menu size={24} /></button>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{activeTab}</h1>
            </div>
            
            <div className="flex items-center gap-6">
              
              {/* ALERTS BUTTON with Filter */}
              <div className="relative">
                  <button 
                    onClick={() => setAlertsOpen(!alertsOpen)}
                    className={`p-3 rounded-full hover:bg-neutral-800 relative transition-colors border ${alertsOpen ? 'bg-neutral-800 border-neutral-600' : 'border-neutral-800'}`}
                  >
                    <Bell size={20} className="text-neutral-400" />
                    {adminNotifications.some(n => !n.read) && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>}
                  </button>
                  
                  {alertsOpen && (
                    <div className="absolute right-0 top-14 w-80 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                        <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-black/20">
                          <h4 className="font-bold text-white">Notifications</h4>
                          <span className="text-xs text-neutral-500">{filteredAlerts.length} total</span>
                        </div>
                        
                        {/* Filter Tabs */}
                        <div className="flex p-2 gap-1 border-b border-neutral-800">
                          <button onClick={() => setAlertFilter('all')} className={`flex-1 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${alertFilter === 'all' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}>All</button>
                          <button onClick={() => setAlertFilter('booking')} className={`flex-1 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${alertFilter === 'booking' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}>Bookings</button>
                          <button onClick={() => setAlertFilter('system')} className={`flex-1 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${alertFilter === 'system' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}>System</button>
                        </div>

                        <div className="max-h-80 overflow-y-auto">
                          {filteredAlerts.length === 0 ? (
                              <div className="text-center py-8 text-neutral-600 text-xs">No notifications.</div>
                          ) : (
                              filteredAlerts.map(notif => (
                                <div key={notif.id} className="p-4 border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${notif.type === 'booking' ? 'bg-rose-500/20 text-rose-500' : 'bg-blue-500/20 text-blue-500'}`}>{notif.type}</span>
                                      <span className="text-[10px] text-neutral-500">{notif.date}</span>
                                    </div>
                                    <p className="text-sm font-bold text-white">{notif.title}</p>
                                    <p className="text-xs text-neutral-400 mt-1">{notif.message}</p>
                                </div>
                              ))
                          )}
                        </div>
                        <div className="p-2 border-t border-neutral-800 text-center">
                          <button onClick={() => setAlertsOpen(false)} className="text-xs font-bold text-neutral-500 hover:text-white w-full py-2">Close</button>
                        </div>
                    </div>
                  )}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-4 md:p-8 relative">
            <div className="w-full h-full animate-fadeIn pb-10">
              {activeTab === 'Dashboard' && 
                <DashboardView 
                  appointments={appointments}
                  staffList={staffList}
                  setActiveTab={setActiveTab}
                  handleStatusChange={handleStatusChange}
                  stats={stats}
                  transactions={transactions} 
                  clientsCount={clients.length}
                />
              }
              {activeTab === 'Appointments' && 
                <AppointmentsView 
                  appointments={appointments}
                  staffList={staffList}
                  handleStatusChange={handleStatusChange}
                />
              }
              {activeTab === 'Posts' && 
                  <PostsView />
              }
              {activeTab === 'Staff' && 
                <StaffView 
                  staffList={staffList}
                  onSaveStaff={handleSaveStaff}
                  appointments={appointments}
                />
              }
              {activeTab === 'Clients' && 
                <ClientsView 
                  clients={clients}
                  appointments={appointments}
                />
              }
              {activeTab === 'Reviews' && 
                  <ReviewsView />
              }
              {activeTab === 'Transactions' && 
                  <TransactionsView 
                    transactions={transactions}
                  />
              }
              {activeTab === 'Settings' && 
                  <SettingsView />
              }
            </div>
          </div>
        </main>
    </div>
  );
};
