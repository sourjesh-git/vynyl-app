'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface AvatarProps {
  userId: string;
  name: string;
  customUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({ userId, name, customUrl, className = '', size = 'md' }: AvatarProps) {
  const [error, setError] = useState(false);

  // Deterministic DiceBear Persona avatar URL using userId as seed
  const diceBearUrl = `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(userId)}`;
  const avatarSrc = customUrl || diceBearUrl;

  const sizeClasses = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-11 w-11 text-sm',
    xl: 'h-14 w-14 text-base',
  };

  const initials = name.slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 2 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`relative shrink-0 flex items-center justify-center rounded-full overflow-hidden border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.06)] bg-[#EBE1D6]/35 ${sizeClasses[size]} ${className}`}
    >
      {!error ? (
        <img
          src={avatarSrc}
          alt={name}
          onError={() => setError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-charcoal/20 text-[#1B1B1B]/70 font-semibold uppercase">
          {initials}
        </div>
      )}
    </motion.div>
  );
}
