
import { supabase } from "./supabase";
import { Appointment, Service, Staff, User, AppointmentStatus, Reward, StylistRank, UserRole, Receipt, CreditCard, Notification, RewardHistoryItem, Promotion } from "../types";
import { formatSGDate, formatSGTime, generateRefId } from "../utils/helpers";

// --- MAPPING HELPERS ---

const mapUser = (data: any): User => {
  if (!data) throw new Error("User data is missing");
  
  return {
    id: data.user_id || data.id, 
    name: data.name || 'Valued Client',
    email: data.email || '',
    phone: data.phone || '',
    role: UserRole.CUSTOMER,
    avatarUrl: data.avatar_url || 'https://i.pravatar.cc/150',
    points: data.total_points || 0,
    lifetimePoints: data.lifetime_points || data.total_points || 0,
    themePreference: data.theme_preference || 'light',
    hasPin: !!data.tng_pin // Check if pin exists
  };
};

const mapService = (data: any): Service => ({
  id: data.service_id,
  name: data.service_name || 'Service',
  description: data.description || '',
  durationMinutes: data.duration || 0,
  priceCents: data.price || 0,
  category: data.category || 'General', 
  imageUrl: data.image_url
});

const mapStaff = (data: any): Staff => ({
  id: data.staff_id,
  name: data.name || 'Staff Member',
  specialties: data.specialties || [data.rank || 'Stylist'],
  avatarUrl: data.avatar_url || 'https://i.pravatar.cc/150',
  rating: data.rating ? parseFloat(data.rating) : 5.0,
  rank: (data.rank as StylistRank) || 'Senior Stylist',
  commissionRate: 0, 
  hireDate: data.joined_at || new Date().toISOString()
});

const mapAppointment = (data: any): Appointment => {
  const dateTimeString = `${data.date}T${data.start_time}`;
  
  const serviceId = data.appointmentservice && data.appointmentservice.length > 0 ? data.appointmentservice[0].service_id : '';
  const isReviewed = data.review && data.review.length > 0;
  const paymentStatus = data.order_table && data.order_table.length > 0 ? 'paid' : 'unpaid';
  const pricePaid = data.order_table?.[0]?.total_payable_cents;

  // Prefer database ref_id, fallback to generic logic if missing
  const refId = data.ref_id || data.appointment_id.substring(0, 5).toUpperCase();

  return {
    id: refId, 
    dbId: data.appointment_id,
    userId: data.customer?.user_id || '',
    staffId: data.staff_id,
    serviceId: serviceId,
    date: dateTimeString,
    status: (data.status as AppointmentStatus) || AppointmentStatus.PENDING,
    paymentStatus: paymentStatus,
    rescheduleCount: data.reschedule_count || 0,
    reviewed: isReviewed,
    pricePaid: pricePaid, // Map pricePaid
    // Inject customer name into generic object if needed for UI, though proper Type implies checking userId
    // We attach it loosely for the dashboard mapping
    // @ts-ignore
    customerName: data.customer?.name || 'Unknown' 
  };
};

const mapReward = (data: any): Reward => ({
  id: data.id,
  title: data.title || 'Reward',
  description: data.description || '',
  cost: 0, 
  discountCents: data.discount_type === 'percentage' ? data.discount_cents : data.discount_cents, 
  imageUrl: '',
  expiryDate: data.expiry_date ? new Date(data.expiry_date).toLocaleDateString() : 'No Expiry',
  serialNumber: data.serial_number || 'N/A'
});

const mapTransaction = (data: any): Receipt => {
  const appt = data.appointment || {};
  const service = appt.appointmentservice?.[0]?.service || {};
  const staff = appt.staff || {};
  const customer = appt.customer || {};
  const price = service.price || 0;
  
  const discountItem = data.orderdiscount?.[0];
  let discount = 0;
  if (discountItem) {
     discount = discountItem.discount_type === 'percentage' 
       ? (price * (discountItem.discount_value / 100)) 
       : discountItem.discount_value;
  }
  
  // Try to use stored extended info if available, otherwise calculate basic
  const sstCents = data.sstCents || data.sst_cents || 0;
  const surchargeCents = data.surchargeCents || data.surcharge_cents || 0;
  const roundingCents = data.roundingCents || data.rounding_cents || 0;
  const totalPayable = data.total_payable_cents || (price - discount);

  return {
    id: data.order_id,
    date: data.created_at,
    serviceName: service.service_name || 'Unknown Service',
    staffName: staff.name || 'Unknown Staff',
    customerName: customer.name || 'Unknown Client',
    totalCents: price,
    discountCents: discount,
    depositCents: totalPayable,
    balanceCents: 0,
    paymentMethod: data.payment_method || 'card',
    sstCents: sstCents,
    surchargeCents: surchargeCents,
    roundingCents: roundingCents,
    appointmentDate: appt.date ? `${appt.date}T${appt.start_time}` : undefined,
    appointmentId: appt.ref_id || (data.appointment_id ? data.appointment_id.substring(0, 5).toUpperCase() : undefined),
    bookingDate: data.created_at,
    status: data.status || 'paid',
    transactionRef: data.transaction_ref,
    refundCents: data.refund_cents || 0,
    appointmentStatus: appt.status || 'unknown'
  };
};

const mapNotification = (data: any): Notification => {
  // Relative Date Logic
  const date = new Date(data.created_at);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  let dateStr = 'Just now';
  if (diffDays > 0) dateStr = `${diffDays}d ago`;
  else if (diffHours > 0) dateStr = `${diffHours}h ago`;
  else if (diffMs > 60000) dateStr = `${Math.floor(diffMs/60000)}m ago`;

  return {
    id: data.id,
    title: data.title,
    message: data.message,
    date: dateStr,
    type: data.type,
    read: data.read,
    data: data.data
  };
};

const mapHistory = (data: any): RewardHistoryItem => ({
  id: data.id,
  title: data.title,
  date: new Date(data.created_at).toLocaleDateString(),
  pts: `${data.type === 'spend' ? '-' : '+'}${data.points}`,
  type: data.type
});

// --- API METHODS ---

export const Api = {
  // Verify Payment PIN
  verifyTransactionPin: async (userId: string, pin: string): Promise<boolean> => {
     const { data } = await supabase
        .from('customer')
        .select('tng_pin')
        .eq('user_id', userId)
        .single();
     
     if (data && data.tng_pin === pin) {
        return true;
     }
     return false;
  },

  updateTransactionPin: async (userId: string, pin: string): Promise<boolean> => {
    const { error } = await supabase
      .from('customer')
      .update({ tng_pin: pin })
      .eq('user_id', userId);
    return !error;
  },

  // Process Absent Appointments
  processAbsences: async () => {
     const now = new Date();
     const dateStr = now.toLocaleDateString('en-CA');
     const timeStr = now.toTimeString().split(' ')[0];

     const { data: expired } = await supabase
        .from('appointment')
        .select('appointment_id, date, end_time')
        .eq('status', 'confirmed')
        .lte('date', dateStr);
        
     if (!expired) return;

     const idsToUpdate: string[] = [];
     
     expired.forEach(a => {
        const endDateTime = new Date(`${a.date}T${a.end_time}`);
        if (endDateTime < now) {
           idsToUpdate.push(a.appointment_id);
        }
     });

     if (idsToUpdate.length > 0) {
        await supabase
           .from('appointment')
           .update({ status: 'absence' })
           .in('appointment_id', idsToUpdate);
     }
  },

  // Process Completed Appointments
  processCompletions: async () => {
     const now = new Date();
     const dateStr = now.toLocaleDateString('en-CA');

     const { data: expired } = await supabase
        .from('appointment')
        .select('appointment_id, date, end_time')
        .eq('status', 'checked-in')
        .lte('date', dateStr);

     if (!expired) return;

     const idsToUpdate: string[] = [];

     expired.forEach(a => {
        const endDateTime = new Date(`${a.date}T${a.end_time}`);
        if (endDateTime < now) {
           idsToUpdate.push(a.appointment_id);
        }
     });

     if (idsToUpdate.length > 0) {
        await supabase
           .from('appointment')
           .update({ status: 'completed' })
           .in('appointment_id', idsToUpdate);
     }
  },
  
  // Check for 24h Reminders
  checkReminders: async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const startRange = new Date(tomorrow.getTime() - 60 * 60 * 1000);
      const endRange = new Date(tomorrow.getTime() + 60 * 60 * 1000);
      
      const dateStr = tomorrow.toLocaleDateString('en-CA');
      
      const { data: appts } = await supabase
         .from('appointment')
         .select(`
            appointment_id, 
            date, 
            start_time, 
            customer(user_id), 
            staff(name),
            appointmentservice(service(service_name))
         `)
         .eq('status', 'confirmed')
         .eq('date', dateStr);
         
      if (!appts) return;
      
      for (const appt of appts) {
          const apptTime = new Date(`${appt.date}T${appt.start_time}`);
          
          if (apptTime >= startRange && apptTime <= endRange) {
              const custUserId = (appt.customer as any)?.user_id;
              if (!custUserId) continue;

              const { data: existing } = await supabase
                 .from('notification')
                 .select('id')
                 .eq('user_id', custUserId)
                 .eq('type', 'reminder')
                 .ilike('message', '%tomorrow%')
                 .maybeSingle();

              if (!existing) {
                 const serviceName = (appt.appointmentservice as any)?.[0]?.service?.service_name || 'Service';
                 const staffName = (appt.staff as any)?.name || 'Stylist';
                 
                 await supabase.from('notification').insert([{
                    user_id: custUserId,
                    title: 'Appointment Reminder',
                    message: `You have a booking for ${serviceName} with ${staffName} tomorrow at ${appt.start_time.substring(0,5)}.`,
                    type: 'reminder',
                    read: false
                 }]);
              }
          }
      }
  },

  getUserProfile: async (userId: string): Promise<User | null> => {
    try {
      const { data: customer, error } = await supabase
        .from('customer')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (customer) {
        return mapUser(customer);
      }

      if (!customer && !error) {
         const { data: { user } } = await supabase.auth.getUser();
         
         if (user && user.id === userId) {
            const { data: newCustomer } = await supabase.from('customer').insert([{
               user_id: user.id,
               email: user.email,
               name: user.user_metadata?.name || 'Valued Client',
               phone: user.user_metadata?.phone || '',
               total_points: 0,
               lifetime_points: 0,
               theme_preference: 'light'
            }]).select().single();
            
            if (newCustomer) {
               const expiry = new Date();
               expiry.setMonth(expiry.getMonth() + 2);
               
               const { data: existingVoucher } = await supabase.from('user_rewards')
                  .select('id')
                  .eq('user_id', user.id)
                  .ilike('title', '%Welcome%')
                  .maybeSingle();

               if (!existingVoucher) {
                  await supabase.from('user_rewards').insert([{
                      user_id: user.id,
                      title: '40% OFF Welcome Gift',
                      description: 'Enjoy 40% off your first service!',
                      discount_cents: 40,
                      discount_type: 'percentage',
                      serial_number: `WELCOME-${user.id.substring(0,4).toUpperCase()}`,
                      expiry_date: expiry.toISOString()
                  }]);

                  await supabase.from('notification').insert([{
                     user_id: user.id,
                     title: 'Welcome to Lumina!',
                     message: 'We are delighted to have you. Enjoy a 40% discount voucher on your first visit!',
                     type: 'promo',
                     read: false
                  }]);
               }
               return mapUser(newCustomer);
            }
         }
      }
      return null;
    } catch (e) {
      console.error("Mapping Error (getUserProfile):", e);
      return null;
    }
  },

  updateUserTheme: async (userId: string, theme: 'light' | 'dark'): Promise<boolean> => {
     const { error } = await supabase
       .from('customer')
       .update({ theme_preference: theme })
       .eq('user_id', userId);
     return !error;
  },

  getServices: async (): Promise<Service[]> => {
    const { data, error } = await supabase.from('service').select('*');
    if (error) return [];
    return (data || []).map(mapService);
  },

  getStaff: async (): Promise<Staff[]> => {
    const { data, error } = await supabase.from('staff').select('*');
    if (error) return [];
    return (data || []).map(mapStaff);
  },
  
  getStaffByEmail: async (email: string): Promise<Staff | null> => {
    const { data, error } = await supabase.from('staff').select('*').eq('email', email).maybeSingle();
    if (error || !data) return null;
    return mapStaff(data);
  },

  getAllCustomers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('customer').select('*');
    if (error) return [];
    return (data || []).map(mapUser);
  },

  getUserAppointments: async (userId: string): Promise<Appointment[]> => {
    await Api.processAbsences();
    await Api.processCompletions();
    await Api.checkReminders();

    const { data: customer } = await supabase.from('customer').select('customer_id').eq('user_id', userId).single();
    if (!customer) return [];

    const { data, error } = await supabase
      .from('appointment')
      .select(`
        *,
        appointmentservice(service_id),
        order_table(payment_method, total_payable_cents),
        review(review_id)
      `)
      .eq('customer_id', customer.customer_id)
      .order('date', { ascending: true }) 
      .order('start_time', { ascending: true });
    
    if (error) return [];
    return (data || []).map(mapAppointment);
  },
  
  getStaffAppointments: async (staffId: string): Promise<Appointment[]> => {
    await Api.processAbsences();
    await Api.processCompletions();

    const { data, error } = await supabase
      .from('appointment')
      .select(`
        *,
        customer(user_id, name), 
        appointmentservice(
           service(service_name, duration)
        )
      `)
      .eq('staff_id', staffId)
      .neq('status', 'cancelled'); 
      
    if (error) return [];
    
    return (data || []).map(row => {
       const appt = mapAppointment(row);
       const serviceData = row.appointmentservice?.[0]?.service;
       if (serviceData) {
           // @ts-ignore
           appt.serviceName = serviceData.service_name;
           // @ts-ignore
           appt.duration = serviceData.duration;
       }
       return appt;
    });
  },
  
  markAppointmentPresence: async (apptRefId: string, staffId: string): Promise<{success: boolean, message: string}> => {
     const { data: appt } = await supabase
        .from('appointment')
        .select('appointment_id, staff_id, status, customer(name)')
        .eq('ref_id', apptRefId)
        .maybeSingle();

     if (!appt) return { success: false, message: 'Appointment not found.' };
     
     if (appt.staff_id !== staffId) return { success: false, message: 'Appointment belongs to another stylist.' };
     
     if (appt.status === 'completed') return { success: false, message: 'Appointment already completed.' };
     if (appt.status === 'checked-in') return { success: false, message: 'Customer already checked in.' };
     if (appt.status === 'cancelled') return { success: false, message: 'Appointment was cancelled.' };
     if (appt.status === 'absence') return { success: false, message: 'Appointment marked as Absence.' };

     const { error } = await supabase
        .from('appointment')
        .update({ status: 'checked-in' })
        .eq('appointment_id', appt.appointment_id);
     
     // @ts-ignore
     const customerName = appt.customer?.name || 'Customer';
     
     if (error) return { success: false, message: 'Database error.' };
     
     return { success: true, message: `${customerName} Checked-In Successfully.` };
  },

  getAllAppointments: async (): Promise<Appointment[]> => {
    await Api.processAbsences();
    await Api.processCompletions();
    
    const { data, error } = await supabase
      .from('appointment')
      .select(`
        *,
        customer(name, user_id),
        appointmentservice(service_id, service(service_name)),
        order_table(payment_method),
        review(review_id)
      `)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });
      
    if (error) return [];
    
    return (data || []).map(row => {
       const appt = mapAppointment(row);
       // @ts-ignore
       const serviceName = row.appointmentservice?.[0]?.service?.service_name;
       if (serviceName) appt.serviceName = serviceName;
       return appt;
    });
  },
  
  getAllReviews: async (): Promise<any[]> => {
    const { data, error } = await supabase
      .from('review')
      .select(`
        *,
        appointment (
           appointment_id,
           date,
           staff (name, avatar_url),
           customer (name, user_id),
           appointmentservice(service(service_name))
        )
      `)
      .order('created_at', { ascending: false });
      
    if (error) return [];
    return data.map((r: any) => {
       const serviceNode = r.appointment?.appointmentservice?.[0]?.service;
       // Force cast to any to handle the polymorphic return type from Supabase joins without confusing TS
       const serviceObj = (Array.isArray(serviceNode) ? serviceNode[0] : serviceNode) as any;
       const serviceName = serviceObj?.service_name;

       return {
       id: r.review_id,
       rating: r.rating,
       comment: r.comment,
       reply: r.reply, 
       compensation: r.compensation,
       date: r.created_at,
       staffName: r.appointment?.staff?.name || 'Unknown',
       staffAvatar: r.appointment?.staff?.avatar_url || '',
       customerName: r.appointment?.customer?.name || 'Guest',
       userId: r.appointment?.customer?.user_id,
       serviceName: serviceName || 'Service'
    }});
  },

  getAllTransactions: async (): Promise<Receipt[]> => {
    const { data, error } = await supabase
      .from('order_table')
      .select(`
        *,
        appointment (
           appointment_id,
           ref_id,
           date,
           start_time,
           status,
           staff (name),
           customer (name),
           appointmentservice (
              service (service_name, price)
           )
        ),
        orderdiscount (discount_type, discount_value)
      `)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map(mapTransaction);
  },

  createAppointment: async (appointment: Partial<Appointment>, pricePaid: number, voucher?: Reward, receiptData?: any): Promise<string | null> => {
    if (!appointment.userId || !appointment.serviceId || !appointment.staffId || !appointment.date) return null;
    
    const { data: customer } = await supabase.from('customer').select('customer_id, name').eq('user_id', appointment.userId).single();
    if (!customer) return null;

    const dateObj = new Date(appointment.date);
    const dateStr = dateObj.toLocaleDateString('en-CA');
    const startTimeStr = dateObj.toTimeString().split(' ')[0] || '';

    const { data: service } = await supabase.from('service').select('*').eq('service_id', appointment.serviceId).single();
    const duration = service?.duration || 60;
    const endTimeObj = new Date(dateObj.getTime() + duration * 60000);
    const endTimeStr = endTimeObj.toTimeString().split(' ')[0] || '';
    
    const { data: conflicts } = await supabase
      .from('appointment')
      .select('appointment_id')
      .eq('staff_id', appointment.staffId)
      .eq('date', dateStr)
      .eq('start_time', startTimeStr)
      .neq('status', 'cancelled');
      
    if (conflicts && conflicts.length > 0) return null;
    
    const refId = generateRefId();

    const { data: apptData, error: apptError } = await supabase.from('appointment').insert([{
      customer_id: customer.customer_id,
      staff_id: appointment.staffId,
      date: dateStr,
      start_time: startTimeStr,
      end_time: endTimeStr,
      status: 'confirmed',
      ref_id: refId
    }]).select().single();

    if (apptError || !apptData) return null;

    const apptId = apptData.appointment_id;

    await supabase.from('appointmentservice').insert([{
        appointment_id: apptId,
        service_id: appointment.serviceId,
        quantity: 1,
        service_price: pricePaid
    }]);
    
    const { data: orderData } = await supabase.from('order_table').insert([{
        appointment_id: apptId,
        payment_method: receiptData?.paymentMethod === 'Touch \'n Go' ? 'tng' : 'card',
        sst_cents: receiptData?.sstCents || 0,
        rounding_cents: receiptData?.roundingCents || 0,
        surcharge_cents: receiptData?.surchargeCents || 0,
        total_payable_cents: pricePaid,
        status: 'paid',
        transaction_ref: receiptData?.transactionRef || null // Store Stripe/HitPay Ref
    }]).select().single();

    if (orderData && voucher) {
      await supabase.from('orderdiscount').insert([{
        order_id: orderData.order_id,
        discount_type: voucher.title.includes('%') ? 'percentage' : 'fixed',
        discount_value: voucher.discountCents,
        voucher_id: voucher.id
      }]);
      await supabase.from('user_rewards').update({ used: true }).eq('id', voucher.id);
    }

    const points = Math.floor(pricePaid / 100);
    const { data: custData } = await supabase.from('customer').select('total_points, lifetime_points').eq('customer_id', customer.customer_id).single();
    if (custData) {
         await supabase.from('customer').update({ 
           total_points: (custData.total_points || 0) + points,
           lifetime_points: (custData.lifetime_points || 0) + points
         }).eq('customer_id', customer.customer_id);
         
         await supabase.from('point_history').insert([{
           user_id: appointment.userId,
           title: 'Service Earned',
           points: points,
           type: 'earn'
         }]);
    }
    
    const finalReceipt: Receipt = {
        ...receiptData,
        id: orderData?.order_id || 'N/A',
        appointmentId: refId,
        status: 'paid'
    };

    await supabase.from('notification').insert([{
       user_id: appointment.userId,
       title: 'Booking Confirmed',
       message: 'Your appointment has been successfully booked.',
       type: 'receipt',
       data: finalReceipt 
    }]);

    await supabase.from('notification').insert([{
       title: 'New Booking',
       message: `${customer.name || 'Client'} booked a service for ${dateStr} ${startTimeStr}.`,
       type: 'booking',
       read: false,
    }]);

    return refId;
  },

  updateAppointmentStatus: async (dbId: string, status: string): Promise<boolean> => {
    if (status === 'completed') {
        const { data: currentAppt } = await supabase
            .from('appointment')
            .select('status')
            .eq('appointment_id', dbId)
            .single();
            
        if (!currentAppt || currentAppt.status !== 'checked-in') {
            return false;
        }
    }
    
    // Use new RPC for cancellations to handle refunds properly
    if (status === 'cancelled') {
        return Api.cancelAppointment(dbId);
    }

    const { error } = await supabase
      .from('appointment')
      .update({ status: status })
      .eq('appointment_id', dbId);
      
    return !error;
  },

  cancelAppointment: async (dbId: string): Promise<boolean> => {
     // Use new v2 RPC to prevent PGRST116 errors and handle 3-day logic atomically
     // maybeSingle() handles 0 or 1 row gracefully
     const { data, error } = await supabase
        .rpc('execute_auto_refund_v2', { appointment_id_input: dbId })
        .maybeSingle();
        
     const result = data as any;
     return !error && result && result.success;
  },

  rescheduleAppointment: async (dbId: string, newDate: string, newStaffId: string): Promise<boolean> => {
    const { data: oldAppt } = await supabase.from('appointment').select('date, start_time').eq('appointment_id', dbId).single();
    
    const dateObj = new Date(newDate);
    const dateStr = dateObj.toLocaleDateString('en-CA');
    const startTimeStr = dateObj.toTimeString().split(' ')[0] || '';
    const endTimeObj = new Date(dateObj.getTime() + 60 * 60000); 
    const endTimeStr = endTimeObj.toTimeString().split(' ')[0] || '';

    const { data: conflicts } = await supabase
      .from('appointment')
      .select('appointment_id')
      .eq('staff_id', newStaffId)
      .eq('date', dateStr)
      .eq('start_time', startTimeStr)
      .neq('status', 'cancelled')
      .neq('appointment_id', dbId); 
      
    if (conflicts && conflicts.length > 0) return false;

    const { data: appt } = await supabase.from('appointment').select('reschedule_count, customer(user_id), appointmentservice(service(service_name))').eq('appointment_id', dbId).single();
    const currentCount = appt?.reschedule_count || 0;
    
    if (currentCount >= 3) return false;

    const { error } = await supabase
      .from('appointment')
      .update({ 
        date: dateStr, 
        start_time: startTimeStr, 
        end_time: endTimeStr,
        staff_id: newStaffId,
        reschedule_count: currentCount + 1
      })
      .eq('appointment_id', dbId);
    
    const customer = appt?.customer && (Array.isArray(appt.customer) ? appt.customer[0] : appt.customer);

    if (!error && customer?.user_id) {
        const oldDateFormatted = oldAppt ? `${oldAppt.date} ${oldAppt.start_time}` : 'Original Date';
        const newDateFormatted = `${dateStr} ${startTimeStr}`;
        const serviceName = appt?.appointmentservice?.[0]?.service?.service_name || 'Appointment';

        await supabase.from('notification').insert([{
           user_id: customer.user_id,
           title: 'Appointment Rescheduled',
           message: `${serviceName} rescheduled from ${oldDateFormatted} to ${newDateFormatted}. ${3 - (currentCount + 1)} reschedule(s) left.`,
           type: 'info'
        }]);
    }

    return !error;
  },

  submitReview: async (apptId: string, rating: number, comment: string, userId: string): Promise<boolean> => {
    const { error } = await supabase.from('review').insert([{
        appointment_id: apptId,
        rating: rating,
        comment: comment
    }]);
    
    if (!error) {
       const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
       await supabase.from('user_rewards').insert([{
         user_id: userId,
         title: 'RM5 Voucher',
         description: 'Review Reward',
         discount_cents: 500,
         discount_type: 'fixed',
         serial_number: `REV-${Date.now().toString().slice(-4)}`,
         expiry_date: expiry.toISOString()
       }]);

       await supabase.from('notification').insert([{
          title: 'New Review Submitted',
          message: `A client left a ${rating}-star review.`,
          type: 'review',
          read: false
       }]);
    }
    return !error;
  },

  replyToReview: async (reviewId: string, replyText: string): Promise<boolean> => {
      // Get the comment and user ID
      const { data: review } = await supabase.from('review').select('comment, appointment(customer(user_id))').eq('review_id', reviewId).single();
      
      const { error } = await supabase.from('review').update({ reply: replyText }).eq('review_id', reviewId);
      
      if (!error && review) {
         // @ts-ignore
         const userId = review.appointment?.customer?.user_id;
         if (userId) {
             await supabase.from('notification').insert([{
                 user_id: userId,
                 title: 'Admin Replied to Review',
                 message: `The salon management replied: "${replyText}"`,
                 type: 'review',
                 data: { originalComment: review.comment } // Store the original comment in the notification data
             }]);
         }
      }
      return !error;
  },
  
  sendCompensationVoucher: async (userId: string, type: 'RM100' | '50%' | '75%', reviewId?: string): Promise<boolean> => {
     let title = '';
     let discountCents = 0;
     let discountType = 'fixed';
     let description = 'Customer Care Compensation';
     
     if (type === 'RM100') {
        title = 'RM100 Voucher';
        discountCents = 10000;
        discountType = 'fixed';
     } else if (type === '50%') {
        title = '50% OFF';
        discountCents = 50;
        discountType = 'percentage';
        description = '50% Off your next visit';
     } else if (type === '75%') {
        title = '75% OFF';
        discountCents = 75;
        discountType = 'percentage';
        description = '75% Off your next visit';
     }

     const expiry = new Date(); expiry.setMonth(expiry.getMonth() + 6);
     
     const { error } = await supabase.from('user_rewards').insert([{
         user_id: userId,
         title: title,
         description: description,
         discount_cents: discountCents,
         discount_type: discountType,
         serial_number: `COMP-${Date.now().toString().slice(-4)}`,
         expiry_date: expiry.toISOString()
     }]);
     
     if (!error) {
         await supabase.from('notification').insert([{
             user_id: userId,
             title: 'Compensation Voucher Received',
             message: `We apologize for any inconvenience. A ${title} has been added to your account.`,
             type: 'promo'
         }]);
         
         if (reviewId) {
             await supabase.from('review').update({ compensation: title }).eq('review_id', reviewId);
         }
     }
     
     return !error;
  },

  getUserVouchers: async (userId: string): Promise<Reward[]> => {
    const { data, error } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('user_id', userId)
      .eq('used', false);
    
    if (error) return [];
    return (data || []).map(mapReward);
  },

  redeemPointsForVoucher: async (userId: string, rewardConfig: any): Promise<Reward | null> => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    const serial = `RWD-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const { data, error } = await supabase.from('user_rewards').insert([{
      user_id: userId,
      title: rewardConfig.title,
      description: rewardConfig.description,
      discount_cents: rewardConfig.discountCents,
      discount_type: 'fixed',
      serial_number: serial,
      expiry_date: expiry.toISOString()
    }]).select().single();

    if (error) return null;

    const { data: customer } = await supabase.from('customer').select('customer_id, total_points').eq('user_id', userId).single();
    if (customer) {
      await supabase.from('customer').update({ 
        total_points: (customer.total_points || 0) - rewardConfig.cost 
      }).eq('customer_id', customer.customer_id);
      
      await supabase.from('point_history').insert([{
        user_id: userId,
        title: `Redeemed ${rewardConfig.title}`,
        points: rewardConfig.cost,
        type: 'spend'
      }]);
    }
    return mapReward(data);
  },
  
  getPromotions: async (): Promise<Promotion[]> => {
     const { data, error } = await supabase.from('promotions').select('*');
     if (error) return [];
     return (data || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        imageUrl: p.image_url,
        discount: p.discount_display,
        startDate: p.start_date,
        endDate: p.end_date,
        active: p.active,
        applicableServices: p.applicable_services || [] 
     }));
  },
  
  createPromotion: async (promo: Partial<Promotion> & { applicableServices?: string[] }): Promise<boolean> => {
      const { error } = await supabase.from('promotions').insert([{
          title: promo.title,
          description: promo.description,
          image_url: promo.imageUrl,
          discount_display: promo.discount,
          start_date: promo.startDate,
          end_date: promo.endDate,
          active: promo.active ?? true,
          applicable_services: promo.applicableServices || [] 
      }]);
      return !error;
  },

  updatePromotion: async (id: string, updates: Partial<Promotion> & { applicableServices?: string[] }): Promise<boolean> => {
     const dbUpdates: any = {};
     if (updates.title) dbUpdates.title = updates.title;
     if (updates.description) dbUpdates.description = updates.description;
     if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl;
     if (updates.discount) dbUpdates.discount_display = updates.discount;
     if (updates.startDate) dbUpdates.start_date = updates.startDate;
     if (updates.endDate) dbUpdates.end_date = updates.endDate;
     if (updates.active !== undefined) dbUpdates.active = updates.active;
     if (updates.applicableServices) dbUpdates.applicable_services = updates.applicableServices;

     const { error } = await supabase.from('promotions').update(dbUpdates).eq('id', id);
     return !error;
  },

  deletePromotion: async (id: string): Promise<boolean> => {
     const { error } = await supabase.from('promotions').delete().eq('id', id);
     return !error;
  },
  
  getUserNotifications: async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase
      .from('notification')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) return [];
    return (data || []).map(mapNotification);
  },
  
  getAdminNotifications: async (): Promise<Notification[]> => {
    const { data: dbNotifs, error } = await supabase
       .from('notification')
       .select('*')
       .in('type', ['booking', 'system', 'review']) 
       .order('created_at', { ascending: false })
       .limit(20);
    
    let notifications = (dbNotifs || []).map(mapNotification);

    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase.from('appointment')
        .select('appointment_id', { count: 'exact', head: true })
        .eq('date', today)
        .eq('status', 'confirmed');
    
    if (count !== null && count > 0) {
       notifications.unshift({
           id: 'summary-today',
           title: 'Daily Summary',
           message: `You have ${count} confirmed appointments today.`,
           date: 'Today',
           type: 'system',
           read: false
       });
    }

    const { data: expiringPosts } = await supabase.from('promotions')
        .select('title, end_date')
        .eq('active', true)
        .gt('end_date', new Date().toISOString())
        .lt('end_date', new Date(Date.now() + 86400000 * 3).toISOString());

    if (expiringPosts && expiringPosts.length > 0) {
        expiringPosts.forEach((post: any, idx: number) => {
            notifications.unshift({
                id: `expiry-${idx}`,
                title: 'Promotion Expiring Soon',
                message: `"${post.title}" ends on ${new Date(post.end_date).toLocaleDateString()}.`,
                date: 'System',
                type: 'system',
                read: false
            });
        });
    }
    
    if (error) return [];
    return notifications;
  },

  markAllNotificationsRead: async (userId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('notification')
      .update({ read: true })
      .eq('user_id', userId);
    return !error;
  },
  
  getPointHistory: async (userId: string): Promise<RewardHistoryItem[]> => {
     const { data, error } = await supabase
       .from('point_history')
       .select('*')
       .eq('user_id', userId)
       .order('created_at', { ascending: false });
     
     if (error) return [];
     return (data || []).map(mapHistory);
  },

  addStaff: async (staff: any) => {
    const { error } = await supabase.from('staff').insert([{
        name: staff.name,
        rank: staff.rank,
        specialties: staff.specialties || [],
        avatar_url: staff.avatar_url,
        rating: staff.rating
    }]);
    return !error;
  },

  updateStaff: async (id: string, updates: any) => {
    const { error } = await supabase.from('staff').update(updates).eq('staff_id', id);
    return !error;
  },

  getSavedCards: async (userId: string): Promise<CreditCard[]> => {
    const { data, error } = await supabase
      .from('user_cards')
      .select('*')
      .eq('user_id', userId);
    
    if (error) return [];
    return data.map((c: any) => ({
      id: c.id,
      last4: c.last4,
      brand: c.brand as any,
      expiry: c.expiry,
      holderName: c.holder_name
    }));
  },

  addCard: async (userId: string, card: Omit<CreditCard, 'id'>): Promise<CreditCard | null> => {
    const { data, error } = await supabase.from('user_cards').insert([{
       user_id: userId,
       last4: card.last4,
       brand: card.brand,
       expiry: card.expiry,
       holder_name: card.holderName
    }]).select().single();
    
    if (error || !data) return null;
    
    return {
      id: data.id,
      last4: data.last4,
      brand: data.brand,
      expiry: data.expiry,
      holderName: data.holder_name
    };
  },

  deleteCard: async (cardId: string): Promise<boolean> => {
     const { error } = await supabase.from('user_cards').delete().eq('id', cardId);
     return !error;
  },

  refundTransaction: async (orderId: string): Promise<boolean> => {
     // Legacy call for automatic cancel flow - uses client_auto_cancel usually via cancelAppointment
     // This function is kept for backward compatibility if needed, but manual admin refund uses processAdminRefund
     return false; 
  }
};
