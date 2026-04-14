import { logger } from '@/lib/logger';
import { BaseDocumentService } from './document-service';
import { stateTransitionService } from './state-transition-service';
import { stringToIdentifierBytes, identifierToBase58, normalizeSDKResponse } from './sdk-helpers';
import { paginateFetchAll } from './pagination-utils';
import { POLLR_CONTRACT_ID } from '@/lib/constants';

export interface VoteDocument {
  $id: string;
  $ownerId: string;
  $createdAt: number;
  pollId: string;
  pollOwnerId: string;
  selectedOptions: number[];
}

class VoteService extends BaseDocumentService<VoteDocument> {
  constructor() {
    super('vote', POLLR_CONTRACT_ID);
  }

  protected transformDocument(doc: Record<string, unknown>): VoteDocument {
    const data = (doc.data || doc) as Record<string, unknown>;

    // Convert pollId from byte array to base58
    const rawPollId = data.pollId || doc.pollId;
    const pollId = rawPollId ? identifierToBase58(rawPollId) : '';

    // Convert pollOwnerId from byte array to base58
    const rawPollOwnerId = data.pollOwnerId || doc.pollOwnerId;
    const pollOwnerId = rawPollOwnerId ? identifierToBase58(rawPollOwnerId) : '';

    // Extract selectedOptions array
    const rawSelectedOptions = data.selectedOptions || doc.selectedOptions;
    const selectedOptions = Array.isArray(rawSelectedOptions)
      ? rawSelectedOptions.map(Number)
      : [];

    return {
      $id: identifierToBase58(doc.$id || doc.id) || (doc.$id || doc.id) as string,
      $ownerId: identifierToBase58(doc.$ownerId || doc.ownerId) || (doc.$ownerId || doc.ownerId) as string,
      $createdAt: (doc.$createdAt || doc.createdAt) as number,
      pollId: pollId || '',
      pollOwnerId: pollOwnerId || '',
      selectedOptions,
    };
  }

  /**
   * Cast a vote on a poll
   * The unique index (pollId + $ownerId) prevents double-voting at protocol level
   */
  async castVote(
    ownerId: string,
    pollId: string,
    pollOwnerId: string,
    selectedOptions: number[]
  ): Promise<VoteDocument> {
    if (selectedOptions.length === 0) {
      throw new Error('At least one option must be selected');
    }

    const documentData: Record<string, unknown> = {
      pollId: stringToIdentifierBytes(pollId),
      pollOwnerId: stringToIdentifierBytes(pollOwnerId),
      selectedOptions,
    };

    const result = await stateTransitionService.createDocument(
      this.contractId,
      this.documentType,
      ownerId,
      documentData
    );

    if (!result.success || !result.document) {
      throw new Error(result.error || 'Failed to cast vote');
    }

    this.clearCache();
    return this.transformDocument(result.document);
  }

  /**
   * Get all votes for a poll (paginates through all results)
   */
  async getVotesForPoll(pollId: string): Promise<VoteDocument[]> {
    try {
      const sdk = await import('./evo-sdk-service').then(m => m.getEvoSdk());

      const { documents } = await paginateFetchAll(
        sdk,
        () => ({
          dataContractId: this.contractId,
          documentTypeName: 'vote',
          where: [['pollId', 'in', [pollId]]],
          orderBy: [['pollId', 'asc']],
        }),
        (doc) => this.transformDocument(doc)
      );

      return documents;
    } catch (error) {
      logger.error('Error getting votes for poll:', error);
      return [];
    }
  }

  /**
   * Check if a user has already voted on a poll
   */
  async hasVoted(pollId: string, ownerId: string): Promise<VoteDocument | null> {
    try {
      const sdk = await import('./evo-sdk-service').then(m => m.getEvoSdk());

      const response = await sdk.documents.query({
        dataContractId: this.contractId,
        documentTypeName: 'vote',
        where: [
          ['pollId', 'in', [pollId]],
          ['$ownerId', '==', ownerId],
        ],
        orderBy: [['pollId', 'asc'], ['$ownerId', 'asc']],
        limit: 1,
      });

      const documents = normalizeSDKResponse(response);
      return documents.length > 0 ? this.transformDocument(documents[0]) : null;
    } catch (error) {
      logger.error('Error checking vote:', error);
      return null;
    }
  }

  /**
   * Get aggregated vote counts per option for a poll
   * Returns an array where index = option index, value = vote count
   */
  async getVoteCountsForPoll(pollId: string, optionCount: number): Promise<number[]> {
    const votes = await this.getVotesForPoll(pollId);
    const counts = new Array(optionCount).fill(0) as number[];

    for (const vote of votes) {
      for (const optionIndex of vote.selectedOptions) {
        if (optionIndex >= 0 && optionIndex < optionCount) {
          counts[optionIndex]++;
        }
      }
    }

    return counts;
  }
}

// Singleton instance
export const voteService = new VoteService();
