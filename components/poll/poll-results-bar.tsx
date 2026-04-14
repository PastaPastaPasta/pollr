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
          ? 'bg-pollr-500/20 dark:bg-pollr-500/30'
          : 'bg-gray-200/60 dark:bg-gray-700/40'
      }`}
      initial={{ width: '0%' }}
      animate={{ width: `${percentage}%` }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    />
  )
}
