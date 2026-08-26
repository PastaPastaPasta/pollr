import { logger } from '@/lib/logger';
import { BaseDocumentService } from './document-service';
import { identifierToBase58, normalizeSDKResponse } from './sdk-helpers';
import {
  MAX_OPTION_LENGTH,
  MAX_POLL_OPTIONS,
  MAX_QUESTION_LENGTH,
  MIN_POLL_OPTIONS,
  POLLR_CONTRACT_ID,
} from '@/lib/constants';

export interface PollDocument {
  $id: string;
  $ownerId: string;
  $createdAt: number;
  question: string;
  options: string[];
  /** True when voters may pick more than one option. */
  multiChoice: boolean;
  /** Advisory close time (ms since epoch). Absent when the poll never closes. */
  endsAt?: number;
}

/** Contract field name holding option `index`. */
function optionField(index: number): string {
  return `option${index}`;
}

/** Coerce a platform integer (surfaced as number, bigint, or decimal string) to a number. */
function toOptionalNumber(raw: unknown): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

class PollService extends BaseDocumentService<PollDocument> {
  constructor() {
    super('poll', POLLR_CONTRACT_ID);
  }

  protected transformDocument(doc: Record<string, unknown>): PollDocument {
    const data = (doc.data || doc) as Record<string, unknown>;

    // Options live in enumerated `option0`..`option9` fields; the first gap ends the list.
    const options: string[] = [];
    for (let index = 0; index < MAX_POLL_OPTIONS; index++) {
      const raw = data[optionField(index)] ?? doc[optionField(index)];
      if (typeof raw !== 'string') break;
      options.push(raw);
    }

    const question = data.question ?? doc.question;

    return {
      $id: identifierToBase58(doc.$id || doc.id) || (doc.$id || doc.id) as string,
      $ownerId: identifierToBase58(doc.$ownerId || doc.ownerId) || (doc.$ownerId || doc.ownerId) as string,
      $createdAt: (doc.$createdAt || doc.createdAt) as number,
      question: typeof question === 'string' ? question : '',
      options,
      multiChoice: (data.multiChoice ?? doc.multiChoice) === true,
      endsAt: toOptionalNumber(data.endsAt ?? doc.endsAt),
    };
  }

  /**
   * Create a new poll.
   *
   * Every field is a plain string, boolean, or integer — the v2 contract has no binary
   * poll fields, so nothing here needs byte encoding.
   */
  async createPoll(
    ownerId: string,
    question: string,
    options: string[],
    multiChoice: boolean,
    endsAt?: number
  ): Promise<PollDocument> {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      throw new Error('Question is required');
    }
    if (trimmedQuestion.length > MAX_QUESTION_LENGTH) {
      throw new Error(`Question must be ${MAX_QUESTION_LENGTH} characters or fewer`);
    }

    const trimmedOptions = options.map(option => option.trim());
    if (trimmedOptions.length < MIN_POLL_OPTIONS) {
      throw new Error(`At least ${MIN_POLL_OPTIONS} options are required`);
    }
    if (trimmedOptions.length > MAX_POLL_OPTIONS) {
      throw new Error(`Maximum ${MAX_POLL_OPTIONS} options allowed`);
    }
    if (trimmedOptions.some(option => !option)) {
      throw new Error('All options must be non-empty');
    }
    if (trimmedOptions.some(option => option.length > MAX_OPTION_LENGTH)) {
      throw new Error(`Each option must be ${MAX_OPTION_LENGTH} characters or fewer`);
    }
    if (endsAt !== undefined && (!Number.isInteger(endsAt) || endsAt < 0)) {
      throw new Error('Close time must be a timestamp in milliseconds');
    }

    const documentData: Record<string, unknown> = { question: trimmedQuestion };
    trimmedOptions.forEach((option, index) => {
      documentData[optionField(index)] = option;
    });
    // Both optional fields are omitted rather than written falsy: absent means "single choice"
    // and "never closes", and the contract forbids additional/unset properties being sent as null.
    if (multiChoice) {
      documentData.multiChoice = true;
    }
    if (endsAt !== undefined) {
      documentData.endsAt = endsAt;
    }

    return this.create(ownerId, documentData);
  }

  /**
   * Get a single poll by ID
   */
  async getPoll(pollId: string): Promise<PollDocument | null> {
    return this.get(pollId);
  }

  /**
   * Get recent polls (newest first)
   */
  async getRecentPolls(limit = 20, startAfter?: string): Promise<PollDocument[]> {
    try {
      const result = await this.query({
        orderBy: [['$createdAt', 'desc']],
        limit,
        startAfter,
      });
      return result.documents;
    } catch (error) {
      logger.error('Error getting recent polls:', error);
      return [];
    }
  }

  /**
   * Get polls created by a specific user
   */
  async getPollsByOwner(ownerId: string, limit = 20): Promise<PollDocument[]> {
    try {
      const sdk = await import('./evo-sdk-service').then(m => m.getEvoSdk());

      const response = await sdk.documents.query({
        dataContractId: this.contractId,
        documentTypeName: 'poll',
        where: [
          ['$ownerId', '==', ownerId],
        ],
        orderBy: [['$ownerId', 'asc'], ['$createdAt', 'asc']],
        limit,
      });

      const documents = normalizeSDKResponse(response);
      return documents.map((doc) => this.transformDocument(doc));
    } catch (error) {
      logger.error('Error getting polls by owner:', error);
      return [];
    }
  }
}

// Singleton instance
export const pollService = new PollService();
