import { logger } from '@/lib/logger';
import { extractErrorMessage } from '@/lib/error-utils';
import { BaseDocumentService } from './document-service';
import { getEvoSdk } from './evo-sdk-service';
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
  /** Every choice recorded on-chain for this voter after the call, ascending. */
  choices: number[];
  /** Choices Platform rejected as duplicates, i.e. already voted before this call. */
  alreadyVoted: number[];
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
    userChoices: result.choices,
  };
}

/**
 * Platform encodes an integer property as a single tagged byte for small values, and grouped
 * count results are keyed by the hex of that encoding. Choice 0 arrives as "80", 1 as "81", etc.
 */
const CHOICE_VALUE_TAG = 0x80;

/** Every choice the contract permits — the `in` operand for the grouped tally query. */
const ALL_CHOICES = Array.from({ length: MAX_POLL_OPTIONS }, (_, index) => index);

/**
 * A vote that collides with the `voterChoice` unique index is not a failure: the voter had
 * already recorded that choice, so the caller should show results rather than an error.
 */
export function isDuplicateVoteError(error: unknown): boolean {
  return extractErrorMessage(error).toLowerCase().includes('duplicate unique properties');
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
   */
  async castVote(
    ownerId: string,
    pollId: string,
    pollOwnerId: string,
    choices: number[]
  ): Promise<CastVoteResult> {
    const requested = Array.from(new Set(choices)).sort((a, b) => a - b);

    if (requested.length === 0) {
      throw new Error('At least one option must be selected');
    }
    if (requested.some(choice => !Number.isInteger(choice) || choice < 0 || choice >= MAX_POLL_OPTIONS)) {
      throw new Error('Selected option is out of range');
    }

    const pollIdBytes = identifierStringToDocumentBytes(pollId);
    const pollOwnerIdBytes = identifierStringToDocumentBytes(pollOwnerId);
    const alreadyVoted: number[] = [];

    for (const choice of requested) {
      try {
        await this.create(ownerId, {
          pollId: pollIdBytes,
          pollOwnerId: pollOwnerIdBytes,
          choice,
        });
      } catch (error) {
        if (!isDuplicateVoteError(error)) {
          throw error;
        }
        logger.info(`VoteService: Choice ${choice} on poll ${pollId} was already recorded for ${ownerId}`);
        alreadyVoted.push(choice);
      }
    }

    return { choices: requested, alreadyVoted };
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
   * Per-option counts come from the `choiceCounts` index in a single grouped count query and
   * the grand total from `pollTotal`; both are O(1) on Drive. Falls back to per-choice equality
   * counts, then to a full scan, if the count trees cannot answer.
   */
  async getVoteTally(pollId: string, optionCount: number): Promise<VoteTally> {
    const size = Math.min(Math.max(optionCount, 0), MAX_POLL_OPTIONS);

    const [grouped, total] = await Promise.all([
      this.countChoicesGrouped(pollId, size),
      this.countPollTotal(pollId),
    ]);

    let counts = grouped;

    if (counts === null) {
      counts = await this.countChoicesIndividually(pollId, size);
    } else if (total !== null && total > 0 && sum(counts) === 0) {
      // The grouped query answered, but disagrees with the grand total. Trust neither.
      logger.warn(`VoteService: Grouped tally for poll ${pollId} returned no choices despite ${total} votes`);
      counts = await this.countChoicesIndividually(pollId, size);
    }

    if (counts === null) {
      const scanned = await this.tallyByScan(pollId, size);
      return { counts: scanned.counts, total: total ?? scanned.total };
    }

    return { counts, total: total ?? sum(counts) };
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

    const { documents } = await paginateFetchAll(
      sdk,
      () => ({
        dataContractId: this.contractId,
        documentTypeName: 'vote',
        where: [['pollId', '==', pollId]],
        orderBy: [['pollId', 'asc'], ['$createdAt', 'asc']],
      }),
      (doc) => this.transformDocument(doc)
    );

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
   * Returns null when the query fails or returns keys that do not decode to a choice.
   */
  private async countChoicesGrouped(pollId: string, optionCount: number): Promise<number[] | null> {
    try {
      const result = await this.countVotes({
        where: [
          ['pollId', '==', pollId],
          ['choice', 'in', ALL_CHOICES],
        ],
        groupBy: ['choice'],
      });

      const counts = new Array<number>(optionCount).fill(0);

      for (const [key, value] of Array.from(result.entries())) {
        // The aggregate row, when present, is not a per-choice group.
        if (key === '') continue;

        const choice = parseInt(key, 16) - CHOICE_VALUE_TAG;
        if (!Number.isInteger(choice) || choice < 0 || choice >= MAX_POLL_OPTIONS) {
          logger.warn(`VoteService: Grouped tally for poll ${pollId} returned undecodable key "${key}"`);
          return null;
        }
        // Votes for an option this poll does not have are ignored rather than dropped silently.
        if (choice < optionCount) {
          counts[choice] = Number(value);
        }
      }

      return counts;
    } catch (error) {
      logger.warn(`VoteService: Grouped tally failed for poll ${pollId}, falling back:`, error);
      return null;
    }
  }

  /** Grand total from the `pollTotal` countable index. Null when the query fails. */
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

  /** Last resort: page through every vote document and tally client-side. */
  private async tallyByScan(pollId: string, optionCount: number): Promise<VoteTally> {
    const counts = new Array<number>(optionCount).fill(0);

    try {
      const votes = await this.getVotesForPoll(pollId);
      for (const vote of votes) {
        if (vote.choice >= 0 && vote.choice < optionCount) {
          counts[vote.choice]++;
        }
      }
      return { counts, total: votes.length };
    } catch (error) {
      logger.error(`VoteService: Vote scan failed for poll ${pollId}:`, error);
      return { counts, total: 0 };
    }
  }
}

// Singleton instance
export const voteService = new VoteService();
