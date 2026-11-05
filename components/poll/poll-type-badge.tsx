import { CheckCircle2, ListChecks } from 'lucide-react'

interface PollTypeBadgeProps {
  multiChoice: boolean
}

export function PollTypeBadge({ multiChoice }: PollTypeBadgeProps) {
  return (
    <span className="dh-badge">
      {multiChoice ? (
        <ListChecks className="h-3 w-3" />
      ) : (
        <CheckCircle2 className="h-3 w-3" />
      )}
      {multiChoice ? 'Multiple choice' : 'Single choice'}
    </span>
  )
}
