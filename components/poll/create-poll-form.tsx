'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { pollService } from '@/lib/services/poll-service'
import {
  MAX_OPTION_LENGTH,
  MAX_POLL_OPTIONS,
  MAX_QUESTION_LENGTH,
  MIN_POLL_OPTIONS,
} from '@/lib/constants'
import toast from 'react-hot-toast'
import { X, Plus } from 'lucide-react'

const DAY_MS = 24 * 60 * 60 * 1000

/** Optional advisory close times offered on the create form. */
const DURATION_OPTIONS: { value: string; label: string; ms: number | null }[] = [
  { value: 'never', label: 'No close time', ms: null },
  { value: '1d', label: 'Closes in 1 day', ms: DAY_MS },
  { value: '3d', label: 'Closes in 3 days', ms: 3 * DAY_MS },
  { value: '7d', label: 'Closes in 7 days', ms: 7 * DAY_MS },
]

export function CreatePollForm() {
  const router = useRouter()
  const { user } = useAuth()

  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [multiChoice, setMultiChoice] = useState(false)
  const [duration, setDuration] = useState('never')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canAddOption = options.length < MAX_POLL_OPTIONS
  const canRemoveOption = options.length > MIN_POLL_OPTIONS

  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= MAX_QUESTION_LENGTH) {
      setQuestion(value)
    }
  }

  const handleOptionChange = (index: number, value: string) => {
    if (value.length > MAX_OPTION_LENGTH) return
    setOptions((prev) => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }

  const addOption = () => {
    if (canAddOption) {
      setOptions((prev) => [...prev, ''])
    }
  }

  const removeOption = (index: number) => {
    if (canRemoveOption) {
      setOptions((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const isValid =
    question.trim().length > 0 &&
    options.filter((o) => o.trim().length > 0).length >= MIN_POLL_OPTIONS

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !isValid) return

    const trimmedOptions = options
      .map((o) => o.trim())
      .filter((o) => o.length > 0)

    if (trimmedOptions.length < MIN_POLL_OPTIONS) {
      toast.error('At least 2 non-empty options are required')
      return
    }

    const durationMs = DURATION_OPTIONS.find((d) => d.value === duration)?.ms ?? null
    const endsAt = durationMs === null ? undefined : Date.now() + durationMs

    setIsSubmitting(true)

    try {
      const newPoll = await pollService.createPoll(
        user.identityId,
        question.trim(),
        trimmedOptions,
        multiChoice,
        endsAt
      )

      toast.success('Poll created successfully!')
      router.push(`/poll?id=${newPoll.$id}`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create poll'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a Poll</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question */}
          <div className="space-y-2">
            <label
              htmlFor="question"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Question
            </label>
            <Textarea
              id="question"
              placeholder="What would you like to ask?"
              value={question}
              onChange={handleQuestionChange}
              disabled={isSubmitting}
              rows={3}
            />
            <div className="flex justify-end">
              <span
                className={`text-xs ${
                  question.length >= MAX_QUESTION_LENGTH
                    ? 'text-red-500'
                    : 'text-gray-400'
                }`}
              >
                {question.length}/{MAX_QUESTION_LENGTH}
              </span>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Options
            </label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    disabled={isSubmitting}
                    maxLength={MAX_OPTION_LENGTH}
                  />
                  {option.length > MAX_OPTION_LENGTH * 0.8 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      {option.length}/{MAX_OPTION_LENGTH}
                    </span>
                  )}
                </div>
                {canRemoveOption && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                    disabled={isSubmitting}
                    className="flex-shrink-0 text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {canAddOption && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={isSubmitting}
                className="w-full"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Option
              </Button>
            )}
          </div>

          {/* Poll Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Poll Type
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={multiChoice ? 'outline' : 'default'}
                size="sm"
                onClick={() => setMultiChoice(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Single Choice
              </Button>
              <Button
                type="button"
                variant={multiChoice ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMultiChoice(true)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Multiple Choice
              </Button>
            </div>
          </div>

          {/* Close time */}
          <div className="space-y-2">
            <label
              htmlFor="duration"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Close Time <span className="text-gray-400">(optional)</span>
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-pollr-500 focus:outline-none disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Voting is hidden once the close time passes. This is advisory — it is not enforced
              on-chain.
            </p>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full bg-gradient-pollr hover:opacity-90"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Spinner size="xs" className="border-white" />
                Creating Poll...
              </span>
            ) : (
              'Create Poll'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
