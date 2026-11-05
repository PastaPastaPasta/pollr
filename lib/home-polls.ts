import type { EnrichedPoll } from '@/lib/services/poll-metadata-service'
import { isPollClosed } from '@/lib/utils'

const TEST_NAME = /(?:^|[\s_.-])(?:e2e|test|fixture|smoke)(?=$|[\s_.-]|\d)/i

export function selectHomePolls(polls: EnrichedPoll[], showAll: boolean): EnrichedPoll[] {
  const visible = showAll ? [...polls] : polls.filter(({ poll, ownerUsername }) =>
    !TEST_NAME.test(poll.question) && !TEST_NAME.test(ownerUsername ?? ''))
  return visible.sort((a, b) => Number(isPollClosed(a.poll)) - Number(isPollClosed(b.poll)) || b.poll.$createdAt - a.poll.$createdAt)
}
