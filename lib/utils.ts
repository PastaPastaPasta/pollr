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
 * Whether a poll's advisory close time has passed.
 *
 * `endsAt` is not enforced on-chain — Platform will still accept a late vote — so the client
 * hides the vote UI once it elapses and shows results only.
 */
export function isPollClosed(poll: { endsAt?: number }, now = Date.now()): boolean {
  return poll.endsAt !== undefined && poll.endsAt <= now
}
