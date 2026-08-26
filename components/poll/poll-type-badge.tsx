import { CheckCircle2, ListChecks } from 'lucide-react'

interface PollTypeBadgeProps {
  multiChoice: boolean
}

export function PollTypeBadge({ multiChoice }: PollTypeBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-pollr-50 px-2.5 py-0.5 text-xs font-medium text-pollr-700 dark:bg-pollr-950 dark:text-pollr-300">
      {multiChoice ? (
        <ListChecks className="h-3 w-3" />
      ) : (
        <CheckCircle2 className="h-3 w-3" />
      )}
      {multiChoice ? 'Multiple Choice' : 'Single Choice'}
    </span>
  )
}
