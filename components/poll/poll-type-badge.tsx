import { CheckCircle2, ListChecks } from 'lucide-react'

interface PollTypeBadgeProps {
  pollType: 0 | 1
}

export function PollTypeBadge({ pollType }: PollTypeBadgeProps) {
  const isSingle = pollType === 0

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-pollr-50 px-2.5 py-0.5 text-xs font-medium text-pollr-700 dark:bg-pollr-950 dark:text-pollr-300">
      {isSingle ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <ListChecks className="h-3 w-3" />
      )}
      {isSingle ? 'Single Choice' : 'Multiple Choice'}
    </span>
  )
}
