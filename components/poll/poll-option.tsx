'use client'

import { PollResultsBar } from './poll-results-bar'

interface PollOptionProps {
  index: number
  text: string
  voteCount: number
  totalVotes: number
  isSelected: boolean
  isUserPick: boolean
  showResults: boolean
  disabled: boolean
  multiChoice: boolean
  onChange: (index: number, checked: boolean) => void
}

export function PollOption({
  index,
  text,
  voteCount,
  totalVotes,
  isSelected,
  isUserPick,
  showResults,
  disabled,
  multiChoice,
  onChange,
}: PollOptionProps) {
  const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

  const handleClick = () => {
    if (disabled) return
    onChange(index, !isSelected)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={isSelected}
      className="dh-btn relative w-full justify-start gap-3 overflow-hidden whitespace-normal text-left"
    >
      {/* Results bar (behind content) */}
      {showResults && (
        <PollResultsBar percentage={percentage} isUserPick={isUserPick} />
      )}

      {/* Radio dot or checkbox */}
      <div className="relative z-10 flex-shrink-0">
        {!multiChoice ? (
          /* Radio dot */
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
              isSelected
                ? 'border-[var(--dh-brand)] bg-[var(--dh-brand-fill)]'
                : 'border-[var(--dh-line-2)]'
            }`}
          >
            {isSelected && (
              <div className="h-2 w-2 rounded-full bg-white" />
            )}
          </div>
        ) : (
          /* Checkbox square */
          <div
            className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
              isSelected
                ? 'border-[var(--dh-brand)] bg-[var(--dh-brand-fill)]'
                : 'border-[var(--dh-line-2)]'
            }`}
          >
            {isSelected && (
              <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                <path
                  d="M10 3L4.5 8.5L2 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Option text */}
      <span className="relative z-10 flex-1 text-sm font-medium text-[var(--dh-ink)]">
        {text}
      </span>

      {/* Vote count / percentage */}
      {showResults && (
        <span className="relative z-10 flex-shrink-0 text-sm font-medium text-[var(--dh-ink-2)]">
          {percentage}%
          <span className="ml-1 text-xs text-[var(--dh-ink-2)]">
            ({voteCount})
          </span>
        </span>
      )}
    </button>
  )
}
