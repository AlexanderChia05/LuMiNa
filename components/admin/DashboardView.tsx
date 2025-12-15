
import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Calendar, Check, X, TrendingUp, Users, Clock } from 'lucide-react';
import { Card, Badge } from '../UI';
import { Staff, Appointment, Receipt } from '../../types';
import { formatSGDate, formatSGTime } from '../../utils/helpers';

interface DashboardViewProps {
  appointments: Appointment[];
  staffList: Staff[];
  setActiveTab: (tab: string) => void;
  handleStatusChange: (id: string, status: string) => void;
  stats: { revenue: number, count: number };
  transactions: Receipt[]; // Changed from recentTransactions
  clientsCount: number;
}

export const DashboardView = ({
  appointments,
  staffList,
  setActiveTab,
  handleStatusChange,
  stats,
  transactions,
  clientsCount
}: DashboardViewProps) => {
  const [revenueRange, setRevenueRange] = useState('Last 7 Days');
  const [lineChartData, setLineChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [adjustedRevenue, setAdjustedRevenue] = useState(0);

  useEffect(() => {
    // 1. Calculate Monthly Revenue (Current Month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    // Salon keeps the deposit amount (minus refunds), so Total Sales is net
    const totalRev = monthlyTransactions.reduce((sum, t) => sum + (t.depositCents - (t.refundCents || 0)), 0);
    setAdjustedRevenue(totalRev);

    // --- 2. GENERATE REVENUE CHART DATA (REAL DATA) ---
    // Uses ALL transactions to look back 7 days
    const days = 7;
    const chartData = [];
    
    for (let i = days - 1; i >= 0; i--) {
       const d = new Date();
       d.setDate(d.getDate() - i);
       
       // Format: 16/12 (Tue)
       const dayStr = d.toLocaleDateString('en-GB', { weekday: 'short' });
       const dateLabel = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} (${dayStr})`;
       
       const dayRevenue = transactions
         .filter(t => {
            const tDate = new Date(t.date);
            return tDate.getDate() === d.getDate() && 
                   tDate.getMonth() === d.getMonth() && 
                   tDate.getFullYear() === d.getFullYear();
         })
         .reduce((sum, t) => sum + ((t.depositCents - (t.refundCents || 0)) / 100), 0);
       
       chartData.push({ name: dateLabel, revenue: dayRevenue });
    }
    setLineChartData(chartData);

    // --- 3. GENERATE STAFF SALES DATA ---
    const staffRevenueMap: Record<string, number> = {};
    staffList.forEach(s => staffRevenueMap[s.name] = 0);

    transactions.forEach(t => {
       // Refund Logic: If transaction was refunded, staff receives NO sales attribution
       if (t.refundCents && t.refundCents > 0) {
           return;
       }
       
       const sName = t.staffName || 'Unknown';
       const netAmount = t.depositCents;
       
       if (staffRevenueMap[sName] !== undefined) {
          staffRevenueMap[sName] += netAmount;
       } else {
          staffRevenueMap[sName] = netAmount;
       }
    });

    const calculatedPieData = Object.keys(staffRevenueMap)
      .map(name => ({
         name,
         value: Math.max(0, staffRevenueMap[name]) // Ensure no negative slices
      }))
      .filter(item => item.value > 0);
      
    if (calculatedPieData.length === 0) {
        setPieData([{ name: 'No Data', value: 100 }]); 
    } else {
        setPieData(calculatedPieData);
    }

  }, [transactions, staffList]);

  const COLORS = ['#e65a78', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1'];

  const recentAppointments = [...appointments]
    .filter(a => a.status === 'confirmed')
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10);

  // Calculate total staff sales for percentage calculation
  const totalStaffSales = pieData.reduce((acc, curr) => acc + curr.value, 0);

  return (
  <div className="space-y-8 h-full overflow-y-auto pr-2 pb-20">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="bg-neutral-900 border-neutral-800 shadow-none">
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-white/5 rounded-2xl"><TrendingUp className="text-white" size={20} /></div>
             <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-lg">This Month</span>
          </div>
          <p className="text-neutral-500 text-sm font-medium">Total Sales</p>
          <h3 className="text-3xl font-bold text-white mt-1">RM {(adjustedRevenue / 100).toFixed(2)}</h3>
      </Card>
      
      <Card className="bg-neutral-900 border-neutral-800 shadow-none">
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-white/5 rounded-2xl"><Calendar className="text-white" size={20} /></div>
             <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-lg">Live</span>
          </div>
          <p className="text-neutral-500 text-sm font-medium">Total Appointments</p>
          <h3 className="text-3xl font-bold text-white mt-1">{stats.count}</h3>
      </Card>

      <Card className="bg-neutral-900 border-neutral-800 shadow-none">
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-white/5 rounded-2xl"><Users className="text-white" size={20} /></div>
             <span className="text-xs font-bold text-white bg-white/10 px-2 py-1 rounded-lg">Active</span>
          </div>
          <p className="text-neutral-500 text-sm font-medium">Total Clients</p>
          <h3 className="text-3xl font-bold text-white mt-1">{clientsCount}</h3>
      </Card>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* LINE CHART: Sales Overview */}
      <div className="lg:col-span-2 bg-neutral-900 p-6 rounded-3xl border border-neutral-800">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-white">Sales Overview</h3>
          <select 
            value={revenueRange}
            onChange={(e) => setRevenueRange(e.target.value)}
            className="text-sm border border-neutral-700 bg-white rounded-lg px-3 py-1 text-black outline-none focus:border-white focus:ring-1 focus:ring-white"
          >
            <option>Last 7 Days</option>
          </select>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 12}} tickFormatter={(val) => `RM${val}`} />
              <Tooltip 
                cursor={{stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2}}
                contentStyle={{ backgroundColor: '#111', borderRadius: '12px', border: '1px solid #333', color: '#fff' }}
                formatter={(val: number) => [`RM ${val.toFixed(2)}`, 'Sales']}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#e65a78" 
                strokeWidth={3} 
                dot={{r: 4, fill: '#e65a78', strokeWidth: 0}} 
                activeDot={{r: 6, fill: '#fff'}}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DONUT CHART: Staff Sales */}
      <Card className="bg-neutral-900 border-neutral-800 shadow-none flex flex-col">
        <h3 className="font-bold text-lg text-white mb-4">Staff Sales</h3>
        <div className="h-[200px] w-full relative">
           <ResponsiveContainer width="100%" height="100%">
             <PieChart>
               <Pie
                 data={pieData}
                 cx="50%"
                 cy="50%"
                 innerRadius={60}
                 outerRadius={80}
                 paddingAngle={5}
                 dataKey="value"
                 animationDuration={1000}
               >
                 {pieData.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                 ))}
               </Pie>
               <Tooltip 
                 contentStyle={{ backgroundColor: '#111', borderRadius: '12px', border: '1px solid #333', color: '#fff' }}
                 itemStyle={{ color: '#fff' }}
                 formatter={(value: number) => `RM ${(value/100).toFixed(0)}`}
               />
             </PieChart>
           </ResponsiveContainer>
           {/* Center Text */}
           <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-neutral-500 font-bold uppercase">Total</span>
              <span className="text-xl font-bold text-white">RM {(totalStaffSales / 100).toFixed(0)}</span>
           </div>
        </div>
        
        <div className="mt-4 space-y-2 flex-1 overflow-auto max-h-[150px] pr-2 custom-scrollbar">
           {pieData.map((entry, index) => {
              const percentage = totalStaffSales > 0 ? ((entry.value / totalStaffSales) * 100).toFixed(1) : '0.0';
              return (
                <div key={index} className="flex items-center justify-between text-sm">
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-white truncate max-w-[120px]">{entry.name}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-neutral-400 mr-2 text-xs">({percentage}%)</span>
                      <span className="text-white font-medium">RM {(entry.value/100).toFixed(0)}</span>
                   </div>
                </div>
              );
           })}
        </div>
        <button className="w-full mt-4 py-2 text-sm border border-neutral-700 rounded-xl text-white hover:bg-white hover:text-black transition-colors" onClick={() => setActiveTab('Staff')}>View All Staff</button>
      </Card>
    </div>

    {/* Recent Appointments */}
    <div className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden">
      <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
          <h3 className="font-bold text-lg text-white">Upcoming Confirmed Appointments</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-800/50 text-neutral-400 font-medium">
            <tr>
              <th className="px-6 py-4">Ref ID</th>
              <th className="px-6 py-4">Client</th>
              <th className="px-6 py-4">Staff</th>
              <th className="px-6 py-4">Date & Time</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {recentAppointments.map((appt, i) => {
              const staff = staffList.find(s => s.id === appt.staffId);
              return (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white font-mono">{appt.id}</td>
                  <td className="px-6 py-4 text-white font-bold">
                    {/* @ts-ignore */}
                    {appt.customerName || 'Walk-In'}
                  </td>
                  <td className="px-6 py-4 text-neutral-300">{staff?.name || 'Any Stylist'}</td>
                  <td className="px-6 py-4 text-neutral-400">
                     <div className="flex items-center gap-2">
                        <Calendar size={14} /> 
                        {formatSGDate(appt.date)}
                        <Clock size={14} className="ml-2" /> 
                        {formatSGTime(appt.date)}
                     </div>
                  </td>
                  <td className="px-6 py-4">
                     <Badge status={appt.status} />
                  </td>
                  <td className="px-6 py-4">
                     {appt.status === 'confirmed' && (
                        <div className="flex items-center gap-2">
                             <button 
                               onClick={() => handleStatusChange(appt.id, 'checked-in')}
                               className="p-2 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors"
                               title="Check In"
                             >
                               <Check size={16} />
                             </button>
                             <button 
                               onClick={() => handleStatusChange(appt.id, 'cancelled')} 
                               className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                               title="Cancel"
                             >
                               <X size={16} />
                             </button>
                        </div>
                     )}
                  </td>
                </tr>
              );
            })}
            {recentAppointments.length === 0 && (
               <tr><td colSpan={6} className="text-center py-10 text-neutral-600">No active upcoming appointments</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  );
};
