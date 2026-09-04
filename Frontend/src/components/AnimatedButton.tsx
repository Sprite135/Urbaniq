import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const buttonVariants = {
  primary: 'bg-[#9d731e] text-white hover:bg-[#8a656d] border-[#9d731e]',
  secondary: 'bg-[#111827] text-white hover:bg-[#1f2937] border-[#111827] dark:bg-[#ece7dd] dark:text-[#111827] dark:hover:bg-[#d1d5db] dark:border-[#ece7dd]',
  outline: 'bg-transparent text-[#111827] hover:bg-[#f3f4f6] border-[#111827] dark:text-[#ece7dd] dark:hover:bg-[#1d2026] dark:border-[#ece7dd]',
  ghost: 'bg-transparent text-[#111827] hover:bg-[#f3f4f6] border-transparent dark:text-[#ece7dd] dark:hover:bg-[#1d2026]'
};

const sizeVariants = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base'
};

export default function AnimatedButton({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}: AnimatedButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`
        inline-flex items-center justify-center
        font-bold uppercase tracking-wider
        border rounded-sm
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-[#9d731e]/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${buttonVariants[variant]}
        ${sizeVariants[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.button>
  );
}
