

export const generateRefId = () => {
  const num = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `A${num}`;
};

export const getBookingDate = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + 5 + offset);
  return date;
};

// Format Date to DD/MM/YYYY
export const formatSGDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatSGTime = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleTimeString('en-GB', {
    hour: '2-digit', 
    minute:'2-digit'
  });
};

export const getRankSurcharge = (rank: string) => {
  switch (rank) {
    case 'Senior Director Stylist': return 5000;
    case 'Director Stylist': return 3000;
    default: return 0;
  }
};

export const getTierInfo = (lifetimePoints: number) => {
  if (lifetimePoints >= 20000) {
    return {
      current: 'Centurion',
      next: null,
      max: 20000,
      min: 20000,
      progress: 100,
      nextThreshold: 20000,
      color: 'from-gray-800 to-black'
    };
  }
  
  if (lifetimePoints >= 5000) {
    return {
      current: 'Platinum',
      next: 'Centurion',
      max: 20000,
      min: 5000,
      progress: ((lifetimePoints - 5000) / (20000 - 5000)) * 100,
      nextThreshold: 20000,
      color: 'from-slate-400 to-slate-600'
    };
  }
  
  if (lifetimePoints >= 1000) {
    return {
      current: 'Gold',
      next: 'Platinum',
      max: 5000,
      min: 1000,
      progress: ((lifetimePoints - 1000) / (5000 - 1000)) * 100,
      nextThreshold: 5000,
      color: 'from-yellow-400 to-yellow-600'
    };
  }
  
  return {
    current: 'Silver',
    next: 'Gold',
    max: 1000,
    min: 0,
    progress: (lifetimePoints / 1000) * 100,
    nextThreshold: 1000,
    color: 'from-gray-300 to-gray-400'
  };
};

export const formatPhoneNumber = (value: string) => {
  if (!value) return '';

  // Remove all non-digit characters
  let digits = value.replace(/\D/g, '');

  // If the user clears the input completely, return empty
  if (digits.length === 0) return '';

  // Handle common prefixes to normalize to +60
  // e.g. 60123... -> 123...
  if (digits.startsWith('60')) {
    digits = digits.substring(2);
  } else if (digits.startsWith('0')) {
    // e.g. 0123... -> 123...
    digits = digits.substring(1);
  }

  // Force Malaysia Code
  return `+60 ${digits}`;
};

export const formatCardExpiry = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length >= 2) {
    return v.substring(0, 2) + '/' + v.substring(2, 4);
  }
  return v;
};

export const formatCardNumber = (value: string) => {
  const v = value.replace(/\D/g, '').substring(0, 16);
  const parts = [];
  for (let i = 0; i < v.length; i += 4) {
    parts.push(v.substring(i, i + 4));
  }
  return parts.join('-');
};