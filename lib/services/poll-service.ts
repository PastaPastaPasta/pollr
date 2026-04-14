import { logger } from '@/lib/logger';
import { BaseDocumentService } from './document-service';
import { identifierToBase58, normalizeSDKResponse } from './sdk-helpers';
import { POLLR_CONTRACT_ID } from '@/lib/constants';

export interface PollDocument {
  $id: string;
  $ownerId: string;
  $createdAt: number;
  question: string;
  options: string[];
  pollType: 0 | 1; // 0 = single choice, 1 = multiple choice
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

class PollService extends BaseDocumentService<PollDocument> {
  constructor() {
    super('poll', POLLR_CONTRACT_ID);
  }

  protected transformDocument(doc: Record<string, unknown>): PollDocument {
    const data = (doc.data || doc) as Record<string, unknown>;

    // Decode question from byte array
    const rawQuestion = data.question || doc.question;
    let question = '';
    if (rawQuestion) {
      if (rawQuestion instanceof Uint8Array) {
        question = textDecoder.decode(rawQuestion);
      } else if (Array.isArray(rawQuestion)) {
        question = textDecoder.decode(new Uint8Array(rawQuestion));
      } else if (typeof rawQuestion === 'string') {
        question = rawQuestion;
      }
    }

    // Decode options from byte array (JSON-encoded)
    const rawOptions = data.options || doc.options;
    let options: string[] = [];
    if (rawOptions) {
      try {
        if (rawOptions instanceof Uint8Array) {
          options = JSON.parse(textDecoder.decode(rawOptions));
        } else if (Array.isArray(rawOptions) && rawOptions.length > 0 && typeof rawOptions[0] === 'number') {
          options = JSON.parse(textDecoder.decode(new Uint8Array(rawOptions)));
        } else if (Array.isArray(rawOptions) && rawOptions.length > 0 && typeof rawOptions[0] === 'string') {
          options = rawOptions as string[];
        } else if (typeof rawOptions === 'string') {
          options = JSON.parse(rawOptions);
        }
      } catch (error) {
        logger.error('PollService: Failed to decode options:', error);
        options = [];
      }
    }

    const pollType = ((data.pollType ?? doc.pollType) as number) || 0;

    return {
      $id: identifierToBase58(doc.$id || doc.id) || (doc.$id || doc.id) as string,
      $ownerId: identifierToBase58(doc.$ownerId || doc.ownerId) || (doc.$ownerId || doc.ownerId) as string,
      $createdAt: (doc.$createdAt || doc.createdAt) as number,
      question,
      options,
      pollType: pollType as 0 | 1,
    };
  }

  /**
   * Create a new poll
   */
  async createPoll(
    ownerId: string,
    question: string,
    options: string[],
    pollType: 0 | 1
  ): Promise<PollDocument> {
    if (!question.trim()) {
      throw new Error('Question is required');
    }
    if (options.length < 2) {
      throw new Error('At least 2 options are required');
    }
    if (options.length > 10) {
      throw new Error('Maximum 10 options allowed');
    }
    if (options.some(opt => !opt.trim())) {
      throw new Error('All options must be non-empty');
    }

    const questionBytes = Array.from(textEncoder.encode(question.trim()));
    const optionsBytes = Array.from(textEncoder.encode(JSON.stringify(options.map(o => o.trim()))));

    const documentData: Record<string, unknown> = {
      question: questionBytes,
      options: optionsBytes,
      pollType,
    };

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
