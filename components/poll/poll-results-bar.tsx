'use client'

import { motion } from 'framer-motion'

interface PollResultsBarProps {
  percentage: number
  isUserPick: boolean
}

export function PollResultsBar({ percentage, isUserPick }: PollResultsBarProps) {
  return (
    <motion.div
      className={`absolute inset-0 rounded-xl ${
        isUserPick
          ? 'bg-[var(--dh-brand-soft)]'
          : 'bg-[var(--dh-sunken)]'
      }`}
      initial={{ width: '0%' }}
      animate={{ width: `${percentage}%` }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    />
  )
}
