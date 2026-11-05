import { CheckCircle2, ListChecks } from 'lucide-react'

interface PollTypeBadgeProps {
  multiChoice: boolean
}

export function PollTypeBadge({ multiChoice }: PollTypeBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-[var(--dh-sunken)] px-2.5 py-0.5 text-xs font-medium text-[var(--dh-brand-ink)] dark:text-[var(--dh-brand-ink)]">
      {multiChoice ? (
        <ListChecks className="h-3 w-3" />
      ) : (
        <CheckCircle2 className="h-3 w-3" />
      )}
      {multiChoice ? 'Multiple choice' : 'Single choice'}
    </span>
  )
}
