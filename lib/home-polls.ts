import type { EnrichedPoll } from '@/lib/services/poll-metadata-service'
import { isPollClosed } from '@/lib/utils'

const TEST_NAME = /(?:^|[\s_.-])(?:e2e|test|fixture|smoke)(?=$|[\s_.-]|\d)/i
const HASH_SUFFIX = /(?:^|[\s_-])[a-f\d]{6,}(?:[-_]\d+)?(?:[?.!]|$)/i

export function isPracticePoll({ poll, ownerUsername }: Pick<EnrichedPoll, 'poll' | 'ownerUsername'>): boolean {
  return /^(?:a\s+)?(?:secondary|sample|example)\s+poll[?.!]?$/i.test(poll.question.trim()) || TEST_NAME.test(poll.question) || HASH_SUFFIX.test(poll.question) ||
    TEST_NAME.test(ownerUsername ?? '') || HASH_SUFFIX.test((ownerUsername ?? '').replace(/\.dash$/i, ''))
}

export function selectHomePolls(polls: EnrichedPoll[], showAll: boolean, showPractice = false): EnrichedPoll[] {
  return polls.filter(poll => showPractice || !isPracticePoll(poll)).sort((a, b) =>
    Number(isPollClosed(a.poll)) - Number(isPollClosed(b.poll)) ||
    (showAll ? 0 : (b.totalVotes ?? 0) - (a.totalVotes ?? 0)) ||
    b.poll.$createdAt - a.poll.$createdAt)
}
