'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb } from 'lucide-react'

const tips = [
  "Most brokers save 12+ hours per week with LoadVoice",
  "Auto-extract freight details in seconds, not minutes",
  "Process 100+ calls daily without breaking a sweat",
  "AI accuracy improves with every correction you make",
  "Export to any CRM format with one click",
  "Never miss important call details again",
  "Reduce data entry errors by up to 95%",
  "Focus on building relationships, not paperwork",
  "Smart templates save you 5 minutes per call",
  "Team collaboration features boost productivity 3x",
  "Voice-to-CRM in under 30 seconds",
  "LoadVoice learns your business terminology automatically"
]

export default function QuickTips() {
  const [currentTip, setCurrentTip] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentTip((prev) => (prev + 1) % tips.length)
        setIsVisible(true)
      }, 300)
    }, 5000) // Change tip every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2 }}
      className="bg-purple-900/90 backdrop-blur-lg rounded-lg p-4 border border-purple-700/30 hidden lg:block max-w-xs"
    >
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4 text-yellow-400" />
        <p className="text-sm text-gray-300 font-medium">Quick Tip</p>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={currentTip}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: isVisible ? 1 : 0, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.3 }}
          className="text-xs text-gray-400"
        >
          {tips[currentTip]}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  )
}