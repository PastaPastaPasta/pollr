import { logger } from '@/lib/logger';
import { extractErrorMessage } from '@/lib/error-utils';
import { isPollClosed } from '@/lib/utils';
import { BaseDocumentService } from './document-service';
import { getEvoSdk } from './evo-sdk-service';
import { stateTransitionService } from './state-transition-service';
import {
  identifierStringToDocumentBytes,
  identifierToBase58,
  mapToDocumentArray,
  type DocumentWhereClause,
} from './sdk-helpers';
import { paginateFetchAll } from './pagination-utils';
import { MAX_POLL_OPTIONS, POLLR_CONTRACT_ID } from '@/lib/constants';

export interface VoteDocument {
  $id: string;
  $ownerId: string;
  $createdAt: number;
  pollId: string;
  pollOwnerId: string;
  /** Index of the selected option. One vote document per selected option. */
  choice: number;
}

export interface CastVoteResult {
  /** Every choice recorded on-chain for this voter after the call, ascending. Excludes `failed`. */
  choices: number[];
  /** Choices Platform rejected as duplicates, i.e. already voted before this call. */
  alreadyVoted: number[];
  /** Choices that could not be recorded. The rest of the ballot still landed. */
  failed: number[];
}

export interface VoteTally {
  /** Votes per option index, sized to the poll's option count. */
  counts: number[];
  /** Total vote documents for the poll. Multi-choice polls count selections, not voters. */
  total: number;
}

/** A poll's tally as a poll view renders it: `VoteTally` plus the viewing voter's own choices. */
export interface PollTally {
  /** Votes per option index, sized to the poll's option count. */
  voteCounts: number[];
  /** Total vote documents for the poll. Multi-choice polls count selections, not voters. */
  totalVotes: number;
  /** Option indices the viewing voter has already voted for. Empty when they have not voted. */
  userChoices: number[];
}

/**
 * Fold a completed ballot into a tally so a poll view can update without re-reading Platform.
 * Choices Platform rejected as duplicates were already counted, so only the newly recorded
 * ones move the numbers.
 */
export function applyCastVoteResult(tally: PollTally, result: CastVoteResult): PollTally {
  const recorded = result.choices.filter(choice => !result.alreadyVoted.includes(choice));
  const voteCounts = [...tally.voteCounts];
  for (const choice of recorded) {
    voteCounts[choice] = (voteCounts[choice] || 0) + 1;
  }

  return {
    voteCounts,
    totalVotes: tally.totalVotes + recorded.length,
    // Merge rather than replace: a returning multi-choice voter's ballot carries only the
    // choices they just added, not the ones already on-chain from an earlier visit.
    userChoices: Array.from(new Set([...tally.userChoices, ...result.choices])).sort((a, b) => a - b),
  };
}

/**
 * Platform encodes an integer property as a single tagged byte for small values, and grouped
 * count results are keyed by the hex of that encoding. Choice 0 arrives as "80", 1 as "81", etc.
 */
const CHOICE_VALUE_TAG = 0x80;

/**
 * Best-effort raw text for an error value.
 *
 * `extractErrorMessage` truncates stringified error objects to 200 characters, which can cut off
 * the marker Platform buries deep in a nested rejection, so the raw forms are searched too.
 */
function rawErrorText(error: unknown): string {
  const parts = [String(error)];
  try {
    const json = JSON.stringify(error);
    if (json) parts.push(json);
  } catch {
    // Circular or non-serializable — the String() form above still stands.
  }
  return parts.join(' ');
}

/**
 * A vote that collides with the `voterChoice` unique index is not a failure: the voter had
 * already recorded that choice, so the caller should show results rather than an error.
 */
export function isDuplicateVoteError(error: unknown): boolean {
  const haystack = `${rawErrorText(error)} ${extractErrorMessage(error)}`.toLowerCase();
  return haystack.includes('duplicate unique');
}

/**
 * Read an ungrouped count result. An empty map means no votes; otherwise the aggregate lives
 * under the '' key.
 */
function readAggregateCount(result: Map<string, bigint>): number {
  if (result.size === 0) return 0;
  const value = result.get('') ?? Array.from(result.values())[0];
  return value === undefined ? 0 : Number(value);
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

class VoteService extends BaseDocumentService<VoteDocument> {
  constructor() {
    super('vote', POLLR_CONTRACT_ID);
  }

  protected transformDocument(doc: Record<string, unknown>): VoteDocument {
    const data = (doc.data || doc) as Record<string, unknown>;

    const rawPollId = data.pollId || doc.pollId;
    const pollId = (rawPollId ? identifierToBase58(rawPollId) : '') ?? '';

    const rawPollOwnerId = data.pollOwnerId || doc.pollOwnerId;
    const pollOwnerId = (rawPollOwnerId ? identifierToBase58(rawPollOwnerId) : '') ?? '';

    return {
      $id: identifierToBase58(doc.$id || doc.id) || (doc.$id || doc.id) as string,
      $ownerId: identifierToBase58(doc.$ownerId || doc.ownerId) || (doc.$ownerId || doc.ownerId) as string,
      $createdAt: (doc.$createdAt || doc.createdAt) as number,
      pollId,
      pollOwnerId,
      choice: Number(data.choice ?? doc.choice ?? 0),
    };
  }

  /**
   * Cast a vote on a poll.
   *
   * Each selected choice is its own document, and Platform rejects batches carrying more than
   * one document transition, so multi-choice ballots are broadcast as sequential creates.
   * The `voterChoice` unique index prevents double-voting; a duplicate rejection is reported
   * through `alreadyVoted` instead of throwing.
   *
   * One bad choice never abandons the rest of the ballot: a failing create is retried once
   * behind a nonce refresh, and only then recorded in `failed`. The call throws solely when
   * every requested choice failed, so the caller always learns what did land.
   *
   * `endsAt` is the poll's advisory close time. Platform does not enforce it, so the client
   * refuses the write once it has passed.
   */
  async castVote(
    ownerId: string,
    pollId: string,
    pollOwnerId: string,
    choices: number[],
    endsAt?: number
  ): Promise<CastVoteResult> {
    const requested = Array.from(new Set(choices)).sort((a, b) => a - b);

    if (requested.length === 0) {
      throw new Error('At least one option must be selected');
    }
    if (requested.some(choice => !Number.isInteger(choice) || choice < 0 || choice >= MAX_POLL_OPTIONS)) {
      throw new Error('Selected option is out of range');
    }
    if (isPollClosed({ endsAt })) {
      throw new Error('This poll is closed');
    }

    const pollIdBytes = identifierStringToDocumentBytes(pollId);
    const pollOwnerIdBytes = identifierStringToDocumentBytes(pollOwnerId);
    const createVote = (choice: number) => this.create(ownerId, {
      pollId: pollIdBytes,
      pollOwnerId: pollOwnerIdBytes,
      choice,
    });

    const recorded: number[] = [];
    const alreadyVoted: number[] = [];
    const failed: number[] = [];
    let lastError: unknown = null;

    for (const choice of requested) {
      try {
        await createVote(choice);
        recorded.push(choice);
        continue;
      } catch (error) {
        if (isDuplicateVoteError(error)) {
          logger.info(`VoteService: Choice ${choice} on poll ${pollId} was already recorded for ${ownerId}`);
          alreadyVoted.push(choice);
          continue;
        }
        logger.warn(`VoteService: Choice ${choice} on poll ${pollId} failed, retrying once:`, error);
        lastError = error;
      }

      // Back-to-back creates each re-read the identity contract nonce from Platform, and a stale
      // read collides. Refresh the SDK's cached nonce before the single retry.
      try {
        await stateTransitionService.refreshIdentityNonce(ownerId);
      } catch (refreshError) {
        logger.warn(`VoteService: Nonce refresh before retrying choice ${choice} failed:`, refreshError);
      }

      try {
        await createVote(choice);
        recorded.push(choice);
      } catch (retryError) {
        if (isDuplicateVoteError(retryError)) {
          logger.info(`VoteService: Choice ${choice} on poll ${pollId} landed on the first attempt after all`);
          alreadyVoted.push(choice);
          continue;
        }
        logger.error(`VoteService: Choice ${choice} on poll ${pollId} could not be recorded:`, retryError);
        failed.push(choice);
        lastError = retryError;
      }
    }

    if (failed.length === requested.length) {
      throw lastError instanceof Error ? lastError : new Error('Failed to cast vote');
    }

    return {
      choices: [...recorded, ...alreadyVoted].sort((a, b) => a - b),
      alreadyVoted,
      failed,
    };
  }

  /**
   * Get the option indices a voter has already selected on a poll.
   * Reads the `voterChoice` index prefix, so this is a single ranged lookup.
   */
  async getMyVotes(pollId: string, userId: string): Promise<number[]> {
    try {
      const sdk = await getEvoSdk();

      const response = await sdk.documents.query({
        dataContractId: this.contractId,
        documentTypeName: 'vote',
        where: [
          ['pollId', '==', pollId],
          ['$ownerId', '==', userId],
        ],
        orderBy: [['pollId', 'asc'], ['$ownerId', 'asc'], ['choice', 'asc']],
        limit: MAX_POLL_OPTIONS,
      });

      return mapToDocumentArray(response)
        .map(doc => this.transformDocument(doc).choice)
        .sort((a, b) => a - b);
    } catch (error) {
      logger.error(`VoteService: Failed to load votes by ${userId} on poll ${pollId}:`, error);
      return [];
    }
  }

  /**
   * Tally a poll from the contract's countable indices.
   *
   * Per-option counts come from the `choiceCounts` index in a single grouped count query, which
   * is O(1) on Drive. The total is the sum of those counts rather than a second `pollTotal`
   * query: `choice` is schema-valid for 0-9 on every poll regardless of how many options it
   * actually has, so a vote for an option this poll does not have would inflate `pollTotal` and
   * stop the displayed percentages summing to 100.
   *
   * Falls back to per-choice equality counts, then to a full scan, if the count trees cannot
   * answer. `pollTotal` is consulted only when even the scan fails.
   */
  async getVoteTally(pollId: string, optionCount: number): Promise<VoteTally> {
    const size = Math.min(Math.max(optionCount, 0), MAX_POLL_OPTIONS);
    if (size === 0) {
      return { counts: [], total: 0 };
    }

    const grouped = await this.countChoicesGrouped(pollId, size);
    if (grouped) {
      return { counts: grouped, total: sum(grouped) };
    }

    const individually = await this.countChoicesIndividually(pollId, size);
    if (individually) {
      return { counts: individually, total: sum(individually) };
    }

    const scanned = await this.tallyByScan(pollId, size);
    if (scanned) {
      return scanned;
    }

    // No breakdown is available at all. `pollTotal` at least reports a vote count, even though
    // it may include votes for options outside this poll's range.
    logger.warn(`VoteService: No per-option tally available for poll ${pollId}, reporting the grand total only`);
    return { counts: new Array<number>(size).fill(0), total: (await this.countPollTotal(pollId)) ?? 0 };
  }

  /**
   * The tally a poll view renders: the poll's totals plus, when a voter is given, the choices
   * that voter has already recorded.
   */
  async getPollTally(pollId: string, optionCount: number, voterId?: string | null): Promise<PollTally> {
    const [tally, userChoices] = await Promise.all([
      this.getVoteTally(pollId, optionCount),
      voterId ? this.getMyVotes(pollId, voterId) : Promise.resolve<number[]>([]),
    ]);

    return { voteCounts: tally.counts, totalVotes: tally.total, userChoices };
  }

  /**
   * Get every vote on a poll, walking the `pollVotesByTime` index.
   * Only used as the last-resort tally path — prefer `getVoteTally`.
   */
  async getVotesForPoll(pollId: string): Promise<VoteDocument[]> {
    const sdk = await getEvoSdk();

    const { documents, reachedLimit } = await paginateFetchAll(
      sdk,
      () => ({
        dataContractId: this.contractId,
        documentTypeName: 'vote',
        where: [['pollId', '==', pollId]],
        orderBy: [['pollId', 'asc'], ['$createdAt', 'asc']],
      }),
      (doc) => this.transformDocument(doc)
    );

    if (reachedLimit) {
      // A tally built from this list undercounts; say so instead of presenting it as complete.
      logger.warn(`VoteService: vote scan for poll ${pollId} hit the pagination cap — results are truncated`);
    }

    return documents;
  }

  /**
   * Run a count query against one of the contract's countable indices.
   *
   * The where clause must match the index exactly, and count queries reject `limit`, so callers
   * pass nothing beyond the clause and an optional `groupBy`.
   */
  private async countVotes(
    query: { where: DocumentWhereClause[]; groupBy?: string[] }
  ): Promise<Map<string, bigint>> {
    const sdk = await getEvoSdk();

    return sdk.documents.count({
      dataContractId: this.contractId,
      documentTypeName: 'vote',
      ...query,
    });
  }

  /**
   * Per-option counts in one round trip via the `choiceCounts` countable index.
   *
   * The `in` operand is narrowed to the poll's own options, so votes for an option this poll
   * does not have never reach the tally. Returns null when the query fails or returns keys that
   * do not decode to one of those options — which, given the narrowed operand, means the result
   * encoding is not what this code expects and a fallback should answer instead.
   */
  private async countChoicesGrouped(pollId: string, optionCount: number): Promise<number[] | null> {
    try {
      const result = await this.countVotes({
        where: [
          ['pollId', '==', pollId],
          ['choice', 'in', Array.from({ length: optionCount }, (_, choice) => choice)],
        ],
        groupBy: ['choice'],
      });

      const counts = new Array<number>(optionCount).fill(0);

      for (const [key, value] of Array.from(result.entries())) {
        // The aggregate row, when present, is not a per-choice group.
        if (key === '') continue;

        const choice = parseInt(key, 16) - CHOICE_VALUE_TAG;
        if (!Number.isInteger(choice) || choice < 0 || choice >= optionCount) {
          logger.warn(`VoteService: Grouped tally for poll ${pollId} returned unexpected key "${key}"`);
          return null;
        }
        counts[choice] = Number(value);
      }

      return counts;
    } catch (error) {
      logger.warn(`VoteService: Grouped tally failed for poll ${pollId}, falling back:`, error);
      return null;
    }
  }

  /**
   * Grand total from the `pollTotal` countable index. Null when the query fails.
   *
   * This counts every vote document on the poll, including any whose `choice` is outside the
   * poll's option range, so it is only used when no per-option breakdown can be obtained.
   */
  private async countPollTotal(pollId: string): Promise<number | null> {
    try {
      const result = await this.countVotes({ where: [['pollId', '==', pollId]] });
      return readAggregateCount(result);
    } catch (error) {
      logger.warn(`VoteService: Total count failed for poll ${pollId}, falling back:`, error);
      return null;
    }
  }

  /** One equality count per option. Each is O(1); used when the grouped query cannot answer. */
  private async countChoicesIndividually(pollId: string, optionCount: number): Promise<number[] | null> {
    try {
      return await Promise.all(
        Array.from({ length: optionCount }, async (_, choice) => {
          const result = await this.countVotes({
            where: [
              ['pollId', '==', pollId],
              ['choice', '==', choice],
            ],
          });
          return readAggregateCount(result);
        })
      );
    } catch (error) {
      logger.warn(`VoteService: Per-choice counts failed for poll ${pollId}, falling back to a scan:`, error);
      return null;
    }
  }

  /**
   * Last resort: page through every vote document and tally client-side.
   * Returns null when the scan itself fails. Votes for an option outside the poll's range are
   * discarded here too, so the total stays consistent with the per-option counts.
   */
  private async tallyByScan(pollId: string, optionCount: number): Promise<VoteTally | null> {
    try {
      const counts = new Array<number>(optionCount).fill(0);
      const votes = await this.getVotesForPoll(pollId);

      for (const vote of votes) {
        if (vote.choice >= 0 && vote.choice < optionCount) {
          counts[vote.choice]++;
        }
      }

      return { counts, total: sum(counts) };
    } catch (error) {
      logger.error(`VoteService: Vote scan failed for poll ${pollId}:`, error);
      return null;
    }
  }
}

// Singleton instance
export const voteService = new VoteService();
