

export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff',
  CUSTOMER = 'customer',
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  points: number; // Spendable points
  lifetimePoints: number; // Tier progress points
  themePreference?: 'light' | 'dark'; // Added for persistent theme
  hasPin?: boolean; // Indicates if user has set up a 6-digit PIN
}

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  category: string;
  description: string;
  imageUrl?: string;
}

export type StylistRank = 'Senior Director Stylist' | 'Director Stylist' | 'Senior Stylist';

// 3NF: Represents the new staff_ranks table
export interface StaffRank {
  rankName: string;
  surcharge: number;
  commissionRate: number;
}

export interface Staff {
  id: string;
  name: string;
  specialties: string[];
  avatarUrl: string;
  rating: number;
  rank: StylistRank;
  // Normalized data flattened for UI convenience
  commissionRate?: number;
  hireDate?: string;
}

export interface TimeOff {
  id: number;
  date: string;
  reason: string;
  customerName?: string;
}

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked-in', 
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ABSENCE = 'absence', 
}

export interface Appointment {
  id: string; // The Ref ID (A1234)
  dbId?: string; // The UUID from Database
  userId: string;
  staffId: string;
  serviceId: string;
  date: string; // ISO string
  status: AppointmentStatus;
  paymentStatus: 'paid' | 'unpaid';
  rescheduleCount?: number;
  reviewed?: boolean;
  customerName?: string; // Added for UI display
  serviceName?: string; // Added for UI display
  duration?: number; // Added for UI display
  pricePaid?: number; // Added: Total Payable from Receipt
}

// 1NF/3NF Normalization Types
export interface AppointmentService {
  appointmentId: string;
  serviceId: string;
  quantity: number;
  priceEach: number;
}

export interface Order {
  orderId: string;
  appointmentId: string;
  subtotalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: string;
  status: 'paid' | 'refunded';
  transactionRef?: string; // HitPay or Gateway Ref
}

export interface Payment {
  paymentId: string;
  appointmentId: string;
  amount: number;
  method: string;
  status: string;
  datePaid: string;
}

export interface Review {
  reviewId: string;
  appointmentId: string;
  rating: number;
  comment: string;
  reply?: string; // Added Reply field
  compensation?: string; // Added Compensation field
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface Reward {
  id: string;
  cost: number;
  title: string;
  description: string;
  imageUrl: string;
  discountCents: number; // Value to deduct from service price
  expiryDate?: string; // For claimed vouchers
  serialNumber?: string; // Voucher serial number
}

export interface CreditCard {
  id: string;
  last4: string;
  brand: 'visa' | 'mastercard' | 'amex';
  expiry: string; // MM/YY
  holderName: string;
}

export interface Receipt {
  id: string;
  date: string;
  serviceName: string;
  staffName: string;
  customerName?: string; // Added Client Name
  totalCents: number;
  discountCents: number;
  depositCents: number;
  balanceCents: number;
  paymentMethod: string;
  bookingDate?: string;
  appointmentDate?: string;
  appointmentId?: string; // Added for QR Code generation
  surchargeCents?: number;
  sstCents?: number;
  roundingCents?: number;
  status: 'paid' | 'refunded';
  transactionRef?: string; 
  refundCents?: number; // New field for partial refunds
  appointmentStatus?: string; // Added appointment status
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'info' | 'receipt' | 'promo' | 'reminder' | 'review' | 'system' | 'booking';
  read: boolean;
  data?: any; // Generic jsonb data
}

export interface RewardHistoryItem {
  id: string;
  title: string;
  date: string;
  pts: string;
  type: 'earn' | 'spend';
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  discount: string; // Display text like "20% OFF"
  startDate: string;
  endDate: string;
  active: boolean;
  applicableServices?: string[]; // New: List of Service IDs this promo applies to
}