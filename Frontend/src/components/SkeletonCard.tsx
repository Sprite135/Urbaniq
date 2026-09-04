import { motion } from 'framer-motion';

export default function SkeletonCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="overflow-hidden rounded-2xl border border-[#e5e7eb] dark:border-[#26282e] bg-white dark:bg-[#16181d] shadow-md"
    >
      <div className="relative aspect-[3/4] bg-[#f3f4f6] dark:bg-[#1a1c21]">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>
      
      <div className="p-4 space-y-3">
        <motion.div
          className="h-4 bg-[#e5e7eb] dark:bg-[#26282e] rounded"
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
        />
        
        <motion.div
          className="h-3 bg-[#e5e7eb] dark:bg-[#26282e] rounded w-3/4"
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: 0.2,
          }}
        />
        
        <div className="flex items-center gap-2 pt-2">
          <motion.div
            className="h-3 bg-[#e5e7eb] dark:bg-[#26282e] rounded w-1/2"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0.4,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
