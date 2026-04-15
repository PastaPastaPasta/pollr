import { logger } from '@/lib/logger';
import { BaseDocumentService } from './document-service';
import { stringToIdentifierBytes, identifierToBase58 } from './sdk-helpers';
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
    const pollId = (rawPollId ? identifierToBase58(rawPollId) : '') ?? '';

    // Convert pollOwnerId from byte array to base58
    const rawPollOwnerId = data.pollOwnerId || doc.pollOwnerId;
    const pollOwnerId = (rawPollOwnerId ? identifierToBase58(rawPollOwnerId) : '') ?? '';

    // Decode selectedOptions from byte array (each byte = one option index)
    // SDK may return as Uint8Array, number[], or base64 string
    const rawSelectedOptions = data.selectedOptions || doc.selectedOptions;
    let selectedOptions: number[] = [];
    if (rawSelectedOptions instanceof Uint8Array) {
      selectedOptions = Array.from(rawSelectedOptions);
    } else if (Array.isArray(rawSelectedOptions)) {
      selectedOptions = rawSelectedOptions.map(Number);
    } else if (typeof rawSelectedOptions === 'string') {
      try {
        selectedOptions = Array.from(Uint8Array.from(atob(rawSelectedOptions), c => c.charCodeAt(0)));
      } catch { /* not base64 */ }
    }

    return {
      $id: identifierToBase58(doc.$id || doc.id) || (doc.$id || doc.id) as string,
      $ownerId: identifierToBase58(doc.$ownerId || doc.ownerId) || (doc.$ownerId || doc.ownerId) as string,
      $createdAt: (doc.$createdAt || doc.createdAt) as number,
      pollId,
      pollOwnerId,
      selectedOptions,
    };
  }

  /**
   * Cast a vote on a poll.
   * The unique index (pollId + $ownerId) prevents double-voting at protocol level.
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

    // byteArray fields MUST be Uint8Array — the WASM serialization layer
    // converts Uint8Array → Value::Bytes but number[] → Value::Array (rejected by platform)
    return this.create(ownerId, {
      pollId: stringToIdentifierBytes(pollId),
      pollOwnerId: stringToIdentifierBytes(pollOwnerId),
      selectedOptions: new Uint8Array(selectedOptions),
    });
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

}

// Singleton instance
export const voteService = new VoteService();
