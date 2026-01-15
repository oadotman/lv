'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function PricingClient() {
  const [isAnnual, setIsAnnual] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Add interactivity to the billing toggle
    const toggle = document.getElementById('billing-toggle')
    if (toggle) {
      toggle.addEventListener('click', () => {
        setIsAnnual(!isAnnual)
        // Update prices in the DOM
        updatePrices(!isAnnual)
      })
    }
  }, [isAnnual])

  const updatePrices = (annual: boolean) => {
    // This would update the displayed prices based on billing period
    // For now, we'll just add a visual indicator
    const toggle = document.getElementById('billing-toggle')
    if (toggle) {
      const indicator = toggle.querySelector('div:last-child') as HTMLElement
      if (indicator) {
        indicator.style.transform = annual ? 'translateX(1.5rem)' : 'translateX(0)'
      }
    }
  }

  // Add smooth scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up')
        }
      })
    }, observerOptions)

    // Observe pricing cards
    document.querySelectorAll('.pricing-card').forEach(card => {
      observer.observe(card)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* Floating savings calculator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="fixed bottom-6 right-6 z-40 hidden lg:block"
      >
        <div className="bg-white rounded-lg shadow-xl p-4 border-2 border-purple-100">
          <p className="text-sm font-semibold text-purple-600">💰 Annual Savings</p>
          <p className="text-xs text-gray-600 mt-1">
            Save up to $1,200/year with annual billing
          </p>
        </div>
      </motion.div>

      <style jsx global>{`
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

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </>
  )
}