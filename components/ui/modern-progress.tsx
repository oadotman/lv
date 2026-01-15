"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface ModernProgressProps {
  progress: number;
  message?: string;
  status?: 'queued' | 'processing' | 'completed' | 'error';
  className?: string;
}

export function ModernProgress({
  progress,
  message = 'Processing...',
  status = 'processing',
  className = ''
}: ModernProgressProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    // Smooth animation to new progress value
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  // Generate bubbles for animation
  const bubbles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    delay: i * 0.2,
    duration: 2 + Math.random() * 2,
    size: 4 + Math.random() * 8,
    x: Math.random() * 100
  }));

  return (
    <div className={`relative w-full ${className}`}>
      {/* Main Progress Container */}
      <div className="relative">
        {/* Progress Bar Background */}
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden relative">
          {/* Animated Gradient Progress Fill */}
          <motion.div
            className="h-full relative overflow-hidden"
            initial={{ width: '0%' }}
            animate={{ width: `${displayProgress}%` }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0.0, 0.2, 1]
            }}
          >
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500" />

            {/* Shimmer Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['0%', '200%'] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear'
              }}
              style={{ transform: 'skewX(-20deg)' }}
            />
          </motion.div>

          {/* Floating Bubbles */}
          {displayProgress > 0 && bubbles.map((bubble) => (
            <motion.div
              key={bubble.id}
              className="absolute rounded-full bg-sky-400/20"
              style={{
                width: bubble.size,
                height: bubble.size,
                left: `${(displayProgress / 100) * bubble.x}%`,
                bottom: 0
              }}
              animate={{
                y: [-20, -60, -20],
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: bubble.duration,
                repeat: Infinity,
                delay: bubble.delay,
                ease: 'easeInOut'
              }}
            />
          ))}
        </div>

        {/* Glow Effect */}
        <motion.div
          className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500 rounded-full opacity-30 blur-lg"
          animate={{
            opacity: status === 'processing' ? [0.2, 0.4, 0.2] : 0.1
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      </div>

      {/* Progress Text */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          <motion.div
            className={`w-2 h-2 rounded-full ${
              status === 'completed' ? 'bg-green-500' :
              status === 'error' ? 'bg-red-500' :
              status === 'queued' ? 'bg-yellow-500' :
              'bg-sky-500'
            }`}
            animate={status === 'processing' ? {
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1]
            } : {}}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />

          {/* Message */}
          <motion.span
            className="text-sm text-gray-600"
            key={message}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {message}
          </motion.span>
        </div>

        {/* Percentage */}
        <motion.span
          className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent"
          key={displayProgress}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {displayProgress}%
        </motion.span>
      </div>

      {/* Particle Effects for Completed State */}
      {status === 'completed' && (
        <motion.div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 12 }, (_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-1 h-1 bg-green-400 rounded-full"
              style={{
                left: '50%',
                top: '50%'
              }}
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{
                scale: [0, 1, 0],
                x: (Math.random() - 0.5) * 100,
                y: (Math.random() - 0.5) * 50,
                opacity: [1, 0]
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.05,
                ease: 'easeOut'
              }}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}