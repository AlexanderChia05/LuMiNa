
import { Service, Staff, User, UserRole, Appointment, AppointmentStatus, Reward } from './types';

export const MOCK_USER: User = {
  id: 'u1',
  name: 'Emily Rose',
  email: 'emily@example.com',
  role: UserRole.CUSTOMER,
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
  points: 1250,
  lifetimePoints: 3450, // Higher than current points to show history
};

export const SERVICES: Service[] = [
  { id: 's1', name: 'Wash & Blowdry', durationMinutes: 45, priceCents: 4500, category: 'Hair', description: 'Refreshing wash followed by a professional blowout.', imageUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&q=80&w=400' },
  { id: 's2', name: 'Wash & Cut', durationMinutes: 60, priceCents: 7500, category: 'Hair', description: 'Includes consultation, wash, massage, and precision cut.', imageUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&q=80&w=400' },
  { id: 's3', name: 'Colour / Semi-colour', durationMinutes: 120, priceCents: 18000, category: 'Color', description: 'Full head colour or semi-permanent gloss.', imageUrl: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&q=80&w=400' },
  { id: 's4', name: 'Colour Regrowth', durationMinutes: 90, priceCents: 14000, category: 'Color', description: 'Root touch-up to cover regrowth.', imageUrl: 'https://images.unsplash.com/photo-1620331311520-246422fd82f9?auto=format&fit=crop&q=80&w=400' },
  { id: 's5', name: 'Cut & Highlights', durationMinutes: 180, priceCents: 28000, category: 'Package', description: 'Full style transformation with highlights.', imageUrl: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=400' },
  { id: 's6', name: 'Treatments', durationMinutes: 30, priceCents: 12000, category: 'Care', description: 'Deep conditioning and scalp treatments.', imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=400' },
];

export const PROMOTIONS = [
  { id: 'p1', title: 'Summer Glow Package', discount: '20% OFF', description: 'Full body scrub & facial', imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=600' },
  { id: 'p2', title: 'Bring a Friend', discount: 'RM50 Credit', description: 'When you book together', imageUrl: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=600' }
];

export const REWARDS: Reward[] = [
  { id: 'r1', cost: 500, title: 'RM10 Voucher', description: 'RM10 off your next service.', imageUrl: '', discountCents: 1000 },
  { id: 'r2', cost: 1000, title: 'RM20 Voucher', description: 'RM20 off services over RM100.', imageUrl: '', discountCents: 2000 },
  { id: 'r3', cost: 2500, title: 'RM50 Voucher', description: 'RM50 off any premium package.', imageUrl: '', discountCents: 5000 },
  { id: 'r4', cost: 800, title: '5% Off', description: '5% discount on total bill.', imageUrl: '', discountCents: 0 }, 
  { id: 'r5', cost: 1500, title: '10% Off', description: '10% discount on total bill.', imageUrl: '', discountCents: 0 },
  { id: 'r6', cost: 3000, title: '20% Off', description: '20% off for VIP treatments.', imageUrl: '', discountCents: 0 },
];

export const STAFF: Staff[] = [
  { id: 'st1', name: 'Sarah Jenkins', specialties: ['Hair', 'Color'], rating: 5.0, avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200', rank: 'Senior Director Stylist' },
  { id: 'st2', name: 'Michael Chen', specialties: ['Skin', 'Massage'], rating: 4.8, avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', rank: 'Director Stylist' },
  { id: 'st3', name: 'Jessica Alva', specialties: ['Nails', 'Hair'], rating: 4.6, avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', rank: 'Senior Stylist' },
];

const today = new Date();
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 7);

// Helper to create mock dates
const getRelativeDate = (days: number, hour: number = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const MOCK_APPOINTMENTS: Appointment[] = [
  // Past/Completed
  { id: 'A1453', userId: 'u1', staffId: 'st1', serviceId: 's1', date: getRelativeDate(-2), status: AppointmentStatus.COMPLETED, paymentStatus: 'paid', rescheduleCount: 0, reviewed: false },
  // Upcoming Tomorrow (for reminder test)
  { id: 'A2641', userId: 'u1', staffId: 'st3', serviceId: 's2', date: getRelativeDate(1, 14), status: AppointmentStatus.CONFIRMED, paymentStatus: 'unpaid', rescheduleCount: 1 },
  // Far Future
  { id: 'A3974', userId: 'u1', staffId: 'st2', serviceId: 's3', date: getRelativeDate(10), status: AppointmentStatus.CONFIRMED, paymentStatus: 'paid', rescheduleCount: 3 },
  // Mock 'booked' slots for testing calendar blocking (Staff 1, 7 days from now, 10:00)
  { 
    id: 'A4987', userId: 'u_other', staffId: 'st1', serviceId: 's1', date: new Date(nextWeek.setHours(10, 0, 0, 0)).toISOString(), status: AppointmentStatus.CONFIRMED, paymentStatus: 'paid' 
  }
];

export const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];