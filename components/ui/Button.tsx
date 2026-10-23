
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'kalshi';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'primary', 
  size = 'md', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-95 shadow-sm";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 hover:shadow-indigo-300/40",
    secondary: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
    outline: "border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 dark:hover:border-indigo-400 bg-transparent shadow-none",
    ghost: "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 shadow-none",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-red-200",
    success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200",
    kalshi: "bg-[#00d296] text-black hover:bg-[#00b582] shadow-sm border border-transparent",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-11 px-5 text-sm",
    lg: "h-14 px-8 text-base",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};