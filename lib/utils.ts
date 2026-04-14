import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncateId(id: string, startChars = 8, endChars = 6): string {
  if (!id) return ''
  if (id.length <= startChars + endChars) return id
  return `${id.slice(0, startChars)}...${id.slice(-endChars)}`
}

/**
 * Compute per-option vote counts from an array of votes.
 * Returns { counts, total } where counts[i] = number of votes for option i.
 */
export function computeVoteCounts(
  votes: { selectedOptions: number[] }[],
  optionCount: number
): { counts: number[]; total: number } {
  const counts = new Array(optionCount).fill(0) as number[]
  let total = 0

  for (const vote of votes) {
    total++
    for (const idx of vote.selectedOptions) {
      if (idx >= 0 && idx < optionCount) {
        counts[idx]++
      }
    }
  }

  return { counts, total }
}
