import { motion, AnimatePresence } from 'framer-motion';

interface MascotProps {
  message?: string;
  mood?: 'happy' | 'thinking' | 'excited' | 'neutral';
}

export default function Mascot({ message, mood = 'neutral' }: MascotProps) {
  // A cute SVG Owl (Duolingo style)
  const renderOwl = () => (
    <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-24 sm:h-24 drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <rect x="20" y="25" width="60" height="55" rx="30" fill="#58CC02" />
      
      {/* Wings */}
      <motion.path 
        d="M20 50 C10 60, 5 70, 15 80 Z" 
        fill="#58CC02"
        animate={{ rotate: mood === 'excited' ? [-10, 10, -10] : 0 }}
        transition={{ repeat: Infinity, duration: 0.5 }}
      />
      <motion.path 
        d="M80 50 C90 60, 95 70, 85 80 Z" 
        fill="#58CC02"
        animate={{ rotate: mood === 'excited' ? [10, -10, 10] : 0 }}
        transition={{ repeat: Infinity, duration: 0.5 }}
      />

      {/* Eyes Area */}
      <rect x="25" y="35" width="50" height="25" rx="12.5" fill="#58CC02" />
      
      {/* Left Eye */}
      <circle cx="38" cy="45" r="10" fill="white" />
      <motion.circle 
        cx="38" 
        cy={mood === 'thinking' ? 40 : 45} 
        r="4" 
        fill="#3A3A3A" 
        animate={mood === 'happy' ? { cy: [45, 42, 45] } : {}}
      />
      
      {/* Right Eye */}
      <circle cx="62" cy="45" r="10" fill="white" />
      <motion.circle 
        cx="62" 
        cy={mood === 'thinking' ? 40 : 45} 
        r="4" 
        fill="#3A3A3A"
        animate={mood === 'happy' ? { cy: [45, 42, 45] } : {}}
      />

      {/* Beak */}
      <polygon points="50,55 45,62 55,62" fill="#FFC800" />
      <path d="M45 62 Q50 68 55 62" fill="#E59400" />
      
      {/* Feet */}
      <ellipse cx="40" cy="82" rx="8" ry="4" fill="#E59400" />
      <ellipse cx="60" cy="82" rx="8" ry="4" fill="#E59400" />
    </svg>
  );

  return (
    <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 flex items-end justify-end pointer-events-none">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-br-none shadow-xl border border-emerald-100 dark:border-emerald-900/50 mr-2 mb-10 max-w-[200px] pointer-events-auto"
          >
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">{message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ 
          y: mood === 'excited' ? [-5, 5, -5] : [0, -5, 0],
        }}
        transition={{ 
          duration: mood === 'excited' ? 0.5 : 3, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
        className="pointer-events-auto cursor-pointer drop-shadow-2xl hover:scale-110 transition-transform origin-bottom"
      >
        {renderOwl()}
      </motion.div>
    </div>
  );
}
