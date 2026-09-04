import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Plus, Minus, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectCartItems, selectCartTotal } from '../features/cart/cartSlice';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const cartItems = useSelector(selectCartItems);
  const cartTotal = useSelector(selectCartTotal);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          
          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-50 flex">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ 
                type: 'spring',
                damping: 25,
                stiffness: 300
              }}
              className="w-full max-w-md bg-white dark:bg-[#16181d] shadow-2xl border-l border-[#e5e7eb] dark:border-[#26282e]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] dark:border-[#26282e]">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="h-5 w-5 text-[#9d731e]" />
                  <h2 className="text-lg font-bold uppercase tracking-wider text-[#111827] dark:text-[#ece7dd]">
                    Carrito ({cartItems.length})
                  </h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-[#f3f4f6] dark:hover:bg-[#1d2026] transition-colors"
                >
                  <X className="h-5 w-5 text-[#111827] dark:text-[#ece7dd]" />
                </motion.button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {cartItems.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center h-full text-center"
                  >
                    <ShoppingBag className="h-16 w-16 text-[#9ca3af] dark:text-[#6f6b63] mb-4" />
                    <p className="text-sm font-bold text-[#111827] dark:text-[#ece7dd] uppercase tracking-wider">
                      Tu carrito está vacío
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex gap-4 p-4 bg-[#f3f4f6] dark:bg-[#1a1c21] rounded-lg"
                      >
                        <div className="h-20 w-20 bg-white dark:bg-[#0e0f12] rounded overflow-hidden">
                          <img 
                            src={item.image} 
                            alt={item.productName}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-[#111827] dark:text-[#ece7dd] line-clamp-1">
                            {item.productName}
                          </h3>
                          <p className="text-xs text-[#9ca3af] dark:text-[#6f6b63] mt-1">
                            {item.size} • {item.color}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-bold text-[#9d731e]">
                              S/ {(item.price * item.quantity).toFixed(2)}
                            </span>
                            <div className="flex items-center gap-2">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1 rounded hover:bg-white dark:hover:bg-[#0e0f12] transition-colors"
                              >
                                <Minus className="h-4 w-4 text-[#111827] dark:text-[#ece7dd]" />
                              </motion.button>
                              <span className="text-sm font-bold text-[#111827] dark:text-[#ece7dd] w-6 text-center">
                                {item.quantity}
                              </span>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1 rounded hover:bg-white dark:hover:bg-[#0e0f12] transition-colors"
                              >
                                <Plus className="h-4 w-4 text-[#111827] dark:text-[#ece7dd]" />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 rounded hover:bg-white dark:hover:bg-[#0e0f12] transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-[#ef4444]" />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              {cartItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 border-t border-[#e5e7eb] dark:border-[#26282e]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-[#111827] dark:text-[#ece7dd] uppercase tracking-wider">
                      Total
                    </span>
                    <span className="text-xl font-bold text-[#9d731e]">
                      S/ {cartTotal.toFixed(2)}
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-[#9d731e] text-white py-3 rounded-sm font-bold uppercase tracking-wider hover:bg-[#8a656d] transition-colors"
                  >
                    Proceder al Checkout
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
