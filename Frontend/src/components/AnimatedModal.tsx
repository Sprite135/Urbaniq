import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeVariants = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

export default function AnimatedModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md' 
}: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ 
                type: 'spring',
                damping: 25,
                stiffness: 300
              }}
              className={`w-full ${sizeVariants[size]} bg-white dark:bg-[#16181d] rounded-2xl shadow-2xl border border-[#e5e7eb] dark:border-[#26282e] overflow-hidden`}
            >
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] dark:border-[#26282e]">
                  <h2 className="text-lg font-bold uppercase tracking-wider text-[#111827] dark:text-[#ece7dd]">
                    {title}
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-[#f3f4f6] dark:hover:bg-[#1d2026] transition-colors"
                  >
                    <X className="h-5 w-5 text-[#111827] dark:text-[#ece7dd]" />
                  </motion.button>
                </div>
              )}
              
              {/* Content */}
              <div className="p-6">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
