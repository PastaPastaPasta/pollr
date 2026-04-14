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
  pollType: 0 | 1
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
  pollType,
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
      className={`relative flex w-full items-center gap-3 overflow-hidden rounded-xl border px-4 py-3 text-left transition-colors ${
        isSelected
          ? 'border-pollr-500 bg-pollr-50/50 dark:border-pollr-400 dark:bg-pollr-950/50'
          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
      } ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
    >
      {/* Results bar (behind content) */}
      {showResults && (
        <PollResultsBar percentage={percentage} isUserPick={isUserPick} />
      )}

      {/* Radio dot or checkbox */}
      <div className="relative z-10 flex-shrink-0">
        {pollType === 0 ? (
          /* Radio dot */
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
              isSelected
                ? 'border-pollr-500 bg-pollr-500'
                : 'border-gray-300 dark:border-gray-600'
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
                ? 'border-pollr-500 bg-pollr-500'
                : 'border-gray-300 dark:border-gray-600'
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
      <span className="relative z-10 flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
        {text}
      </span>

      {/* Vote count / percentage */}
      {showResults && (
        <span className="relative z-10 flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">
          {percentage}%
          <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
            ({voteCount})
          </span>
        </span>
      )}
    </button>
  )
}
