import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-[var(--dh-line-2)] bg-[var(--dh-surface)] px-3 py-2 text-sm ring-offset-white placeholder:text-[var(--dh-ink-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dh-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[var(--dh-surface)] dark:ring-offset-gray-950 dark:placeholder:text-[var(--dh-ink-2)] dark:focus-visible:ring-[var(--dh-focus)]',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
