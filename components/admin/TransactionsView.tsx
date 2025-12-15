

import React, { useState } from 'react';
import { Search, Download, CreditCard, Smartphone, DollarSign, Wallet, FileText, RotateCcw, Filter, Coins, X } from 'lucide-react';
import { Card, Button, Badge } from '../UI';
import { Receipt } from '../../types';
import { Api } from '../../services/api';
import { formatSGDate, formatSGTime } from '../../utils/helpers';

interface TransactionsViewProps {
  transactions: Receipt[];
}

export const TransactionsView = ({ transactions }: TransactionsViewProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [filterClient, setFilterClient] = useState('');
  const [filterStaff, setFilterStaff] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // Payment Status
  const [filterApptStatus, setFilterApptStatus] = useState('all'); // Appointment Status

  const clearFilters = () => {
     setFilterClient('');
     setFilterStaff('');
     setFilterDate('');
     setFilterMethod('all');
     setFilterStatus('all');
     setFilterApptStatus('all');
  };

  const filtered = transactions.filter(t => {
     // Text Search (ID)
     if (searchTerm && !t.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
     
     // Client Name
     if (filterClient && !t.customerName?.toLowerCase().includes(filterClient.toLowerCase())) return false;
     
     // Staff Name
     if (filterStaff && !t.staffName.toLowerCase().includes(filterStaff.toLowerCase())) return false;
     
     // Date
     if (filterDate) {
        // t.date is ISO string, filterDate is YYYY-MM-DD
        const tDate = new Date(t.date).toLocaleDateString('en-CA');
        if (tDate !== filterDate) return false;
     }
     
     // Payment Method
     if (filterMethod !== 'all') {
        if (filterMethod === 'card' && t.paymentMethod !== 'card' && t.paymentMethod !== 'Credit Card') return false;
        if (filterMethod === 'tng' && t.paymentMethod !== 'tng' && t.paymentMethod !== "Touch 'n Go") return false;
     }
     
     // Payment Status
     if (filterStatus !== 'all' && t.status !== filterStatus) return false;

     // Appointment Status
     if (filterApptStatus !== 'all' && t.appointmentStatus !== filterApptStatus) return false;

     return true;
  });

  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Ref ID', 'Client Name', 'Date', 'Staff', 'Service', 'Method', 'Appt Status', 'Amount (RM)', 'Payment Status', 'Refund (RM)'];
    const rows = filtered.map(t => [
      t.id,
      t.appointmentId || '-',
      t.customerName || 'Guest',
      formatSGDate(t.date) + ' ' + formatSGTime(t.date),
      t.staffName,
      t.serviceName,
      t.paymentMethod,
      t.appointmentStatus || 'N/A',
      (t.depositCents / 100).toFixed(2),
      t.status,
      ((t.refundCents || 0) / 100).toFixed(2)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
     const win = window.open('', '', 'width=900,height=900');
     if (win) {
         // Calculate Totals for Summary
         const totalTransactions = filtered.length;
         const totalRevenue = filtered.reduce((acc, t) => acc + (t.depositCents - (t.refundCents || 0)), 0) / 100;
         const totalRefunds = filtered.reduce((acc, t) => acc + (t.refundCents || 0), 0) / 100;

         const htmlContent = `
         <!DOCTYPE html>
         <html>
         <head>
           <title>Lumina Salon - Audit Transaction Report</title>
           <style>
             body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; font-size: 10px; }
             .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #e65a78; padding-bottom: 20px; margin-bottom: 30px; }
             .logo { display: flex; align-items: center; gap: 10px; }
             .logo-box { background-color: #e65a78; color: white; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px; border-radius: 8px; }
             .brand-name { font-size: 24px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 2px; }
             .report-title { font-size: 18px; font-weight: bold; text-align: right; text-transform: uppercase; color: #555; }
             .meta-info { text-align: right; font-size: 10px; color: #777; margin-top: 5px; }
             
             .summary-section { display: flex; gap: 20px; margin-bottom: 30px; }
             .summary-box { border: 1px solid #ddd; padding: 15px; border-radius: 8px; width: 150px; background: #f9f9f9; }
             .summary-label { font-size: 9px; text-transform: uppercase; font-weight: bold; color: #777; margin-bottom: 5px; }
             .summary-value { font-size: 16px; font-weight: bold; color: #000; }

             table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
             th { background-color: #f0f0f0; text-transform: uppercase; font-size: 9px; padding: 10px; border-bottom: 2px solid #ccc; text-align: left; }
             td { padding: 8px 10px; border-bottom: 1px solid #eee; }
             tr:nth-child(even) { background-color: #fafafa; }
             
             .amount { font-family: 'Courier New', Courier, monospace; font-weight: bold; }
             .negative { color: #dc2626; }
             .status-badge { font-size: 8px; font-weight: bold; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; display: inline-block; }
             .status-paid { background: #dcfce7; color: #166534; }
             .status-refunded { background: #fee2e2; color: #991b1b; }

             .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-style: italic; }
             .page-number { position: fixed; bottom: 20px; right: 40px; font-size: 9px; }
           </style>
         </head>
         <body>
            <div class="header">
               <div class="logo">
                  <div class="logo-box">L</div>
                  <div class="brand-name">Lumina</div>
               </div>
               <div>
                  <div class="report-title">Transaction Audit Report</div>
                  <div class="meta-info">Generated on: ${new Date().toLocaleString('en-GB')}</div>
                  <div class="meta-info">Report ID: TRX-${Date.now().toString().slice(-6)}</div>
               </div>
            </div>

            <div class="summary-section">
               <div class="summary-box">
                  <div class="summary-label">Total Transactions</div>
                  <div class="summary-value">${totalTransactions}</div>
               </div>
               <div class="summary-box">
                  <div class="summary-label">Net Revenue</div>
                  <div class="summary-value">RM ${totalRevenue.toFixed(2)}</div>
               </div>
               <div class="summary-box">
                  <div class="summary-label">Total Refunds</div>
                  <div class="summary-value negative">- RM ${totalRefunds.toFixed(2)}</div>
               </div>
            </div>

            <table>
               <thead>
                  <tr>
                     <th>ID</th>
                     <th>Ref ID</th>
                     <th>Date</th>
                     <th>Client</th>
                     <th>Staff</th>
                     <th>Service</th>
                     <th>Method</th>
                     <th>Amount</th>
                     <th>Refund</th>
                     <th>Status</th>
                  </tr>
               </thead>
               <tbody>
                  ${filtered.map(t => `
                    <tr>
                       <td>${t.id}</td>
                       <td>${t.appointmentId || '-'}</td>
                       <td>${formatSGDate(t.date)} <br/> <span style="color:#777;font-size:8px">${formatSGTime(t.date)}</span></td>
                       <td>${t.customerName}</td>
                       <td>${t.staffName}</td>
                       <td>${t.serviceName}</td>
                       <td>${t.paymentMethod}</td>
                       <td class="amount">RM ${(t.depositCents/100).toFixed(2)}</td>
                       <td class="amount negative">${t.refundCents && t.refundCents > 0 ? '- RM ' + (t.refundCents/100).toFixed(2) : '-'}</td>
                       <td><span class="status-badge ${t.status === 'paid' ? 'status-paid' : 'status-refunded'}">${t.status}</span></td>
                    </tr>
                  `).join('')}
               </tbody>
            </table>

            <div class="footer">
               *** This document is auto-generated by the Lumina Salon Management System and is valid without a signature. ***
            </div>
         </body>
         </html>
         `;

         win.document.write(htmlContent);
         win.document.close();
         win.focus();
         setTimeout(() => {
           win.print();
           win.close();
         }, 500);
     }
  };

  return (
    <div className="animate-fadeIn h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-xl font-bold text-white">Transactions</h2>
         <div className="flex gap-3">
            <div className="relative">
               <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
               <input 
                 type="text" 
                 placeholder="Search ID..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-10 pr-4 py-2 bg-white rounded-xl border border-neutral-800 outline-none focus:border-white focus:ring-1 focus:ring-white w-64 text-black placeholder-neutral-600" 
               />
            </div>
            
            <Button 
               variant="secondary" 
               className={`border-none ${showFilters ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-neutral-800 text-white hover:bg-neutral-700'}`}
               onClick={() => setShowFilters(!showFilters)}
            >
               <Filter size={16} className="mr-2" /> {showFilters ? 'Hide Filters' : 'Filter'}
            </Button>
            
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-white hover:bg-neutral-800 text-sm font-bold">
               <Download size={16} /> Export CSV
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-white hover:bg-neutral-800 text-sm font-bold">
               <FileText size={16} /> Export PDF
            </button>
         </div>
      </div>

      {showFilters && (
         <div className="mb-6 bg-neutral-900 border border-neutral-800 p-4 rounded-xl grid grid-cols-1 md:grid-cols-7 gap-4 animate-fadeIn">
            <div>
               <label className="block text-xs font-bold text-neutral-500 mb-1">Client Name</label>
               <input type="text" value={filterClient} onChange={e => setFilterClient(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white" />
            </div>
            <div>
               <label className="block text-xs font-bold text-neutral-500 mb-1">Staff Name</label>
               <input type="text" value={filterStaff} onChange={e => setFilterStaff(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white" />
            </div>
            <div>
               <label className="block text-xs font-bold text-neutral-500 mb-1">Date</label>
               <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white cursor-pointer" />
            </div>
            <div>
               <label className="block text-xs font-bold text-neutral-500 mb-1">Payment Method</label>
               <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white cursor-pointer">
                  <option value="all">All</option>
                  <option value="card">Cards</option>
                  <option value="tng">Touch 'n Go</option>
               </select>
            </div>
            <div>
               <label className="block text-xs font-bold text-neutral-500 mb-1">Appt Status</label>
               <select value={filterApptStatus} onChange={e => setFilterApptStatus(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white cursor-pointer">
                  <option value="all">All</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="checked-in">Checked In</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="absence">Absence</option>
               </select>
            </div>
            <div>
               <label className="block text-xs font-bold text-neutral-500 mb-1">Payment Status</label>
               <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white cursor-pointer">
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
               </select>
            </div>
            <div className="flex items-end">
               <button 
                 onClick={clearFilters}
                 className="w-full bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
               >
                 <RotateCcw size={14} /> Reset
               </button>
            </div>
         </div>
      )}

      <Card className="bg-neutral-900 border-neutral-800 flex-1 overflow-hidden flex flex-col shadow-none" noPadding>
          <div className="overflow-y-auto flex-1">
             <table id="transactions-table" className="w-full text-left text-sm">
                <thead className="bg-neutral-800/50 text-neutral-400 sticky top-0 z-10">
                   <tr>
                      <th className="px-6 py-4">Transaction ID</th>
                      <th className="px-6 py-4">Ref ID</th>
                      <th className="px-6 py-4">Client</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Staff</th>
                      <th className="px-6 py-4">Service</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4">Appt Status</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Pay Status</th>
                      <th className="px-6 py-4">Refund</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                   {filtered.map((t, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                         <td className="px-6 py-4 text-white font-mono text-xs">{t.id}</td>
                         <td className="px-6 py-4 text-white font-mono text-xs text-rose-400">{t.appointmentId || '-'}</td>
                         <td className="px-6 py-4 text-white font-bold">{t.customerName}</td>
                         <td className="px-6 py-4 text-neutral-400 text-xs">
                            {formatSGDate(t.date)}<br/>{formatSGTime(t.date)}
                         </td>
                         <td className="px-6 py-4 text-neutral-300">{t.staffName}</td>
                         <td className="px-6 py-4 text-neutral-300">{t.serviceName}</td>
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-neutral-300">
                               {t.paymentMethod === 'card' || t.paymentMethod === 'Credit Card' ? <CreditCard size={16}/> : <Wallet size={16}/>}
                               <span className="capitalize">{t.paymentMethod === 'tng' ? "Touch 'n Go" : t.paymentMethod}</span>
                            </div>
                         </td>
                         <td className="px-6 py-4">
                            <Badge status={t.appointmentStatus || 'unknown'} />
                         </td>
                         <td className="px-6 py-4 font-bold text-white">RM {(t.depositCents / 100).toFixed(2)}</td>
                         <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${t.status === 'paid' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                               {t.status}
                            </span>
                         </td>
                         <td className="px-6 py-4 text-red-400 font-bold">
                            {t.refundCents && t.refundCents > 0 ? `RM -${(t.refundCents / 100).toFixed(2)}` : '-'}
                         </td>
                      </tr>
                   ))}
                   {filtered.length === 0 && (
                      <tr><td colSpan={11} className="text-center py-10 text-neutral-600">No transactions found</td></tr>
                   )}
                </tbody>
             </table>
          </div>
      </Card>
    </div>
  );
};