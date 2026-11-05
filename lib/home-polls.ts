import type { EnrichedPoll } from '@/lib/services/poll-metadata-service'
import { isPollClosed } from '@/lib/utils'

const TEST_NAME = /(?:^|[\s_.-])(?:e2e|test|fixture|smoke)(?=$|[\s_.-]|\d)/i

export function selectHomePolls(polls: EnrichedPoll[], showAll: boolean): EnrichedPoll[] {
  const isTest = ({ poll }: EnrichedPoll) => TEST_NAME.test(poll.question)
  return [...polls].sort((a, b) =>
    (showAll ? 0 : Number(isTest(a)) - Number(isTest(b))) ||
    Number(isPollClosed(a.poll)) - Number(isPollClosed(b.poll)) ||
    b.poll.$createdAt - a.poll.$createdAt)
}
