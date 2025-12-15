

import React, { useState } from 'react';
import { Card } from '../UI';
import { Receipt } from '../../types';
import { formatSGDate, formatSGTime } from '../../utils/helpers';

interface ReceiptCardProps {
  receipt: Receipt;
}

export const ReceiptCard = ({ receipt }: ReceiptCardProps) => {
  const getFormattedDateTime = (dateStr?: string) => {
    if(!dateStr) return 'N/A';
    return `${formatSGDate(dateStr)} ${formatSGTime(dateStr)}`;
  };

  return (
    <Card className="w-full bg-white dark:bg-neutral-800 border-gray-200 dark:border-white/10 p-0 overflow-hidden relative shadow-lg mb-4 h-auto text-sm">
      <div className="bg-gray-100 dark:bg-neutral-900 p-4 border-b border-dashed border-gray-300 dark:border-white/20 text-center relative z-10">
          <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white font-bold text-xs mx-auto mb-2">L</div>
          <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-sm">Lumina Salon</h4>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Payment Receipt</p>
      </div>
      
      <div className="p-6 pb-32 space-y-4">

          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">Receipt No.</span>
            <span className="font-mono font-bold text-gray-900 dark:text-white">{receipt.id}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">Booking Date</span>
            <span className="font-medium text-gray-900 dark:text-white">{getFormattedDateTime(receipt.bookingDate)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">Appt Date</span>
            <span className="font-medium text-gray-900 dark:text-white">{getFormattedDateTime(receipt.appointmentDate)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">Payment Method</span>
            <span className="font-medium text-gray-900 dark:text-white">{receipt.paymentMethod}</span>
          </div>
          <div className="border-t border-gray-100 dark:border-white/5 my-2"></div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Service Details</p>
            <div className="flex justify-between">
                <span className="font-bold text-gray-900 dark:text-white text-sm">{receipt.serviceName}</span>
                <span className="font-medium text-gray-900 dark:text-white">RM {(receipt.totalCents / 100).toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-400">Stylist: {receipt.staffName}</p>
          </div>
          
          {receipt.surchargeCents && receipt.surchargeCents > 0 ? (
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
              <span>Stylist Surcharge</span>
              <span>RM {(receipt.surchargeCents / 100).toFixed(2)}</span>
            </div>
          ) : null}

          <div className="border-t border-gray-100 dark:border-white/5 my-2"></div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between font-bold">
                <span className="text-gray-600 dark:text-gray-300">Subtotal</span>
                <span className="text-gray-900 dark:text-white">RM {(((receipt.totalCents + (receipt.surchargeCents || 0)) / 100)).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500">
                <span>SST (8%)</span>
                <span>RM {(receipt.sstCents ? receipt.sstCents / 100 : 0).toFixed(2)}</span>
            </div>

            {receipt.discountCents > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Voucher Discount</span>
                  <span>- RM {(receipt.discountCents / 100).toFixed(2)}</span>
                </div>
            )}
            
            {receipt.roundingCents !== undefined && receipt.roundingCents !== 0 && (
              <div className="flex justify-between text-xs text-gray-400 italic">
                  <span>Rounding Adjustment</span>
                  <span>{receipt.roundingCents > 0 ? '+' : ''}RM {(receipt.roundingCents / 100).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-rose-600 dark:text-rose-400 pt-2 border-t border-dashed border-gray-200 dark:border-white/10 text-lg">
                <span>Total Payable</span>
                <span>RM {(receipt.depositCents / 100).toFixed(2)}</span>
            </div>
          </div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-6 bg-gray-100 dark:bg-neutral-900" style={{ backgroundImage: 'linear-gradient(45deg, transparent 50%, #ffffff 50%), linear-gradient(-45deg, transparent 50%, #ffffff 50%)', backgroundSize: '20px 20px', backgroundRepeat: 'repeat-x', backgroundPosition: '0 bottom' }}></div>
    </Card>
  );
};