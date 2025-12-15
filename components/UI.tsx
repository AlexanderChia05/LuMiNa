import React from 'react';

export interface ButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'glass';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  className = '',
  disabled = false,
  type = 'button'
}: ButtonProps) => {
  const baseStyle = "px-6 py-3 rounded-2xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";
  
  const variants = {
    primary: "bg-rose-500 text-white shadow-lg shadow-rose-500/30 hover:bg-rose-600",
    secondary: "bg-white text-black shadow-sm hover:bg-rose-50 border border-rose-100", // Updated to text-black
    outline: "border-2 border-rose-500 text-rose-700 hover:bg-rose-50",
    glass: "bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30"
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export interface CardProps {
  children?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  noPadding = false,
  onClick
}) => {
  return (
    <div 
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={`card-glass rounded-3xl ${noPadding ? '' : 'p-5'} ${className} ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''}`}
    >
      {children}
    </div>
  );
};

export interface BadgeProps {
  status: string;
}

export const Badge = ({ status }: BadgeProps) => {
  const styles: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-900 border-green-200',
    'checked-in': 'bg-blue-100 text-blue-900 border-blue-200',
    pending: 'bg-amber-100 text-amber-900 border-amber-200',
    cancelled: 'bg-red-100 text-red-900 border-red-200',
    completed: 'bg-gray-100 text-black border-gray-200',
    absence: 'bg-orange-100 text-orange-900 border-orange-200', // Absence Style
  };

  const defaultStyle = 'bg-rose-100 text-rose-950 border-rose-200';

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status.toLowerCase()] || defaultStyle}`}>
      {status.toUpperCase().replace('-', ' ')}
    </span>
  );
};

export interface AvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar = ({ src, alt, size = 'md' }: AvatarProps) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
  };
  
  return (
    <img 
      src={src} 
      alt={alt} 
      className={`${sizes[size]} rounded-full object-cover border-2 border-white shadow-sm`} 
    />
  );
};