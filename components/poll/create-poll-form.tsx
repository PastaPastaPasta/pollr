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
import toast from 'react-hot-toast'
import { X, Plus } from 'lucide-react'

const MAX_QUESTION_LENGTH = 280
const MIN_OPTIONS = 2
const MAX_OPTIONS = 10

export function CreatePollForm() {
  const router = useRouter()
  const { user } = useAuth()

  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [pollType, setPollType] = useState<0 | 1>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canAddOption = options.length < MAX_OPTIONS
  const canRemoveOption = options.length > MIN_OPTIONS

  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= MAX_QUESTION_LENGTH) {
      setQuestion(value)
    }
  }

  const handleOptionChange = (index: number, value: string) => {
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
    options.filter((o) => o.trim().length > 0).length >= MIN_OPTIONS

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !isValid) return

    const trimmedOptions = options
      .map((o) => o.trim())
      .filter((o) => o.length > 0)

    if (trimmedOptions.length < MIN_OPTIONS) {
      toast.error('At least 2 non-empty options are required')
      return
    }

    setIsSubmitting(true)

    try {
      const newPoll = await pollService.createPoll(
        user.identityId,
        question.trim(),
        trimmedOptions,
        pollType
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
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  disabled={isSubmitting}
                />
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
                variant={pollType === 0 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPollType(0)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Single Choice
              </Button>
              <Button
                type="button"
                variant={pollType === 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPollType(1)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Multiple Choice
              </Button>
            </div>
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
