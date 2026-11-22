import { LEGACY_POLLR_CONTRACT_IDS } from '@/lib/constants'
import { getEvoSdk } from './evo-sdk-service'
import { identifierToBase58, normalizeSDKResponse, toUint8Array } from './sdk-helpers'
import { isPracticePoll } from '@/lib/home-polls'
import type { PollDocument } from './poll-service'

export const ARCHIVE_CONTRACT = LEGACY_POLLR_CONTRACT_IDS[0]
export interface ArchivedPoll {
  poll: PollDocument
  counts: number[] | null
  ballots: number | null
}

export function decodeArchivedPoll(doc: Record<string, unknown>): PollDocument | null {
  try {
    const questionBytes = toUint8Array(doc.question)
    const optionBytes = toUint8Array(doc.options)
    if (!questionBytes || !optionBytes) return null
    const question = new TextDecoder('utf-8', { fatal: true }).decode(questionBytes)
    const options: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(optionBytes))
    const id = identifierToBase58(doc.$id)
    const owner = identifierToBase58(doc.$ownerId)
    if (!id || !owner || !question.trim() || !Array.isArray(options) || options.length < 2 || options.length > 10 || options.some(o => typeof o !== 'string')) return null
    if (!Number.isFinite(Number(doc.$createdAt)) || (doc.pollType !== 0 && doc.pollType !== 1)) return null
    return { $id: id, $ownerId: owner, $createdAt: Number(doc.$createdAt), question, options, multiChoice: doc.pollType === 1 }
  } catch { return null }
}

export function archiveTally(poll: PollDocument, votes: Record<string, unknown>[]): Pick<ArchivedPoll, 'counts' | 'ballots'> {
  const counts = poll.options.map(() => 0)
  const voters = new Set<string>()
  for (const vote of votes) {
    const pollId = identifierToBase58(vote.pollId)
    const owner = identifierToBase58(vote.$ownerId)
    const selected = toUint8Array(vote.selectedOptions)
    if (pollId !== poll.$id || !owner || voters.has(owner) || !selected) continue
    const choices = Array.from(new Set(Array.from(selected).filter(i => i !== 255)))
    if (!choices.length || choices.some(i => i >= counts.length) || (!poll.multiChoice && choices.length !== 1)) continue
    voters.add(owner)
    for (const i of choices) counts[i]++
  }
  return { counts, ballots: voters.size }
}

async function readArchiveDocuments(type: 'poll' | 'vote'): Promise<Record<string, unknown>[]> {
  const sdk = await getEvoSdk()
  const documents: Record<string, unknown>[] = []
  let startAfter: string | undefined
  // A bounded read must never turn a partial tally into an exact result.
  for (let page = 0; page < 10; page++) {
    const response = await sdk.documents.query({ dataContractId: ARCHIVE_CONTRACT, documentTypeName: type, ...(type === 'poll' ? { orderBy: [['$createdAt', 'desc']] as [string, 'desc'][] } : {}), limit: 100, startAfter })
    const rows = normalizeSDKResponse(response)
    documents.push(...rows)
    if (rows.length < 100) return documents
    const next = identifierToBase58(rows[rows.length - 1].$id)
    if (!next || next === startAfter) break
    startAfter = next
  }
  throw new Error('Archive read exceeded its page limit')
}

export async function readArchivedPolls(): Promise<ArchivedPoll[]> {
  const [polls, votes] = await Promise.allSettled([readArchiveDocuments('poll'), readArchiveDocuments('vote')])
  if (polls.status === 'rejected') throw polls.reason
  return polls.value.flatMap(doc => {
    const poll = decodeArchivedPoll(doc)
    if (!poll || isPracticePoll({ poll, ownerUsername: null })) return []
    return [{ poll, ...(votes.status === 'fulfilled' ? archiveTally(poll, votes.value) : { counts: null, ballots: null }) }]
  }).sort((a, b) => (b.ballots ?? 0) - (a.ballots ?? 0) || b.poll.$createdAt - a.poll.$createdAt)
}
