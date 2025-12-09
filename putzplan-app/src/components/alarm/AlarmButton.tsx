import React from 'react';
import { motion } from 'framer-motion';

interface AlarmButtonProps {
  onClick: () => void;
  className?: string;
}

export const AlarmButton: React.FC<AlarmButtonProps> = ({ 
  onClick, 
  className = '' 
}) => {
  return (
    <motion.button
      onClick={onClick}
      className={`
        bg-red-600 hover:bg-red-700 text-white font-semibold
        px-4 py-2 rounded-lg shadow-md hover:shadow-lg
        flex items-center gap-2 transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
        ${className}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      data-testid="alarm-button"
    >
      <span className="text-lg">🚨</span>
      <span>Hot Task</span>
    </motion.button>
  );
};