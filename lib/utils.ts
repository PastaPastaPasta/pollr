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
