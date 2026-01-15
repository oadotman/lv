/**
 * LoadVoice Animation Utilities
 * Smooth animations and transitions for better UX
 */

import * as React from 'react';

// Framer Motion variants for common animations
export const animations = {
  // Fade in animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },

  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },

  fadeInDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },

  // Scale animations
  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },

  scaleUp: {
    initial: { scale: 1 },
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
    transition: { duration: 0.2 }
  },

  // Slide animations
  slideInLeft: {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -100, opacity: 0 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },

  slideInRight: {
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 100, opacity: 0 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },

  // Stagger children animations
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  },

  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  },

  // List animations
  listContainer: {
    animate: {
      transition: {
        staggerChildren: 0.05
      }
    }
  },

  listItem: {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 10 },
    transition: { duration: 0.2 }
  },

  // Progress animations
  progressBar: {
    initial: { width: '0%' },
    animate: (progress: number) => ({
      width: `${progress}%`,
      transition: { duration: 0.5, ease: 'easeOut' }
    })
  },

  // Pulse animation for loading
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  },

  // Shake animation for errors
  shake: {
    animate: {
      x: [-10, 10, -10, 10, 0],
      transition: {
        duration: 0.5,
        ease: 'easeInOut'
      }
    }
  },

  // Bounce animation for success
  bounce: {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 0.5,
        repeat: 3,
        ease: 'easeInOut'
      }
    }
  },

  // Skeleton loading animation
  skeleton: {
    animate: {
      backgroundPosition: ['200% 0', '-200% 0'],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear'
      }
    }
  },

  // Card flip animation
  cardFlip: {
    initial: { rotateY: 0 },
    animate: { rotateY: 180 },
    transition: { duration: 0.6, ease: 'easeInOut' }
  },

  // Notification slide
  notificationSlide: {
    initial: { x: 400, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 400, opacity: 0 },
    transition: { type: 'spring', stiffness: 100, damping: 15 }
  },

  // Counter animation
  counter: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.2 }
  },

  // Drawer slide
  drawer: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
    transition: { type: 'spring', damping: 20, stiffness: 100 }
  },

  // Modal backdrop
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },

  // Modal content
  modalContent: {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
    transition: { duration: 0.2, ease: 'easeOut' }
  },

  // Accordion
  accordion: {
    open: { height: 'auto', opacity: 1 },
    closed: { height: 0, opacity: 0 },
    transition: { duration: 0.3, ease: 'easeInOut' }
  },

  // Tab switch
  tabContent: {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -10 },
    transition: { duration: 0.2 }
  },

  // Extraction specific animations
  extractionProgress: {
    uploading: {
      icon: { rotate: 0 },
      text: { opacity: 1 }
    },
    transcribing: {
      icon: { rotate: 360, transition: { duration: 2, repeat: Infinity, ease: 'linear' } },
      text: { opacity: 1 }
    },
    extracting: {
      icon: { scale: [1, 1.1, 1], transition: { duration: 1, repeat: Infinity } },
      text: { opacity: 1 }
    },
    complete: {
      icon: { scale: [1, 1.2, 1], transition: { duration: 0.5 } },
      text: { opacity: 1 }
    }
  },

  // Status badge animations
  statusBadge: {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    whileHover: { scale: 1.1 },
    transition: { type: 'spring', stiffness: 500, damping: 15 }
  },

  // Quick action button
  quickAction: {
    initial: { scale: 0, rotate: -180 },
    animate: { scale: 1, rotate: 0 },
    whileHover: { scale: 1.1 },
    whileTap: { scale: 0.9 },
    transition: { type: 'spring', stiffness: 200, damping: 10 }
  }
}

// CSS animation classes (add to global CSS)
export const cssAnimations = `
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slide-in-left {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-10px);
  }
  75% {
    transform: translateX(10px);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}

@keyframes progress {
  from {
    width: 0%;
  }
  to {
    width: 100%;
  }
}

/* Utility classes */
.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}

.animate-slide-in-left {
  animation: slide-in-left 0.3s ease-out;
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

.animate-fade-in-up {
  animation: fade-in-up 0.3s ease-out;
}

.animate-scale-in {
  animation: scale-in 0.3s ease-out;
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

.animate-bounce {
  animation: bounce 1s ease-in-out infinite;
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.animate-shimmer {
  animation: shimmer 2s ease-in-out infinite;
  background-size: 200% 100%;
  background: linear-gradient(
    90deg,
    transparent 25%,
    rgba(255, 255, 255, 0.5) 50%,
    transparent 75%
  );
}

/* Smooth transitions */
.transition-all {
  transition: all 0.3s ease;
}

.transition-colors {
  transition: color 0.3s ease, background-color 0.3s ease, border-color 0.3s ease;
}

.transition-transform {
  transition: transform 0.3s ease;
}

.transition-opacity {
  transition: opacity 0.3s ease;
}

/* Hover effects */
.hover-lift {
  transition: transform 0.2s ease;
}

.hover-lift:hover {
  transform: translateY(-2px);
}

.hover-glow {
  transition: box-shadow 0.2s ease;
}

.hover-glow:hover {
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
}

/* LoadVoice specific animations */
.extraction-pulse {
  animation: pulse 1.5s ease-in-out infinite;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent);
}

.status-transition {
  transition: all 0.3s ease;
  position: relative;
}

.status-transition::after {
  content: '';
  position: absolute;
  inset: 0;
  background: currentColor;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.status-transition:active::after {
  opacity: 0.1;
}
`

// Transition timing functions
export const easings = {
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
}

// Animation hook for scroll-triggered animations
export function useScrollAnimation(threshold = 0.1) {
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  return { ref, isVisible }
}