import { logger } from '@/lib/logger';
import { getEvoSdk } from './evo-sdk-service';
import { DPNS_CONTRACT_ID, DPNS_DOCUMENT_TYPE } from '../constants';
import { identifierToBase58 } from './sdk-helpers';

/**
 * Extract documents array from SDK response (handles Map, Array, and object formats)
 */
function extractDocuments(response: unknown): Record<string, unknown>[] {
  if (response instanceof Map) {
    return Array.from(response.values())
      .filter(Boolean)
      .map((doc: unknown) => {
        const d = doc as { toJSON?: () => unknown };
        return (typeof d.toJSON === 'function' ? d.toJSON() : doc) as Record<string, unknown>;
      });
  }
  if (Array.isArray(response)) {
    return response.map((doc: unknown) => {
      const d = doc as { toJSON?: () => unknown };
      return (typeof d.toJSON === 'function' ? d.toJSON() : doc) as Record<string, unknown>;
    });
  }
  const respObj = response as { documents?: unknown[]; toJSON?: () => unknown };
  if (respObj?.documents) {
    return respObj.documents as Record<string, unknown>[];
  }
  if (respObj?.toJSON) {
    const json = respObj.toJSON() as { documents?: unknown[] } | unknown[];
    if (Array.isArray(json)) return json as Record<string, unknown>[];
    return (json as { documents?: unknown[] }).documents as Record<string, unknown>[] || [];
  }
  return [];
}

class DpnsService {
  private cache: Map<string, { value: string; timestamp: number }> = new Map();
  private reverseCache: Map<string, { value: string; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour cache for DPNS

  /**
   * Helper method to cache entries in both directions
   */
  private _cacheEntry(username: string, identityId: string): void {
    const now = Date.now();
    this.cache.set(username.toLowerCase(), { value: identityId, timestamp: now });
    this.reverseCache.set(identityId, { value: username, timestamp: now });
  }

  /**
   * Get all usernames for an identity ID
   */
  async getAllUsernames(identityId: string): Promise<string[]> {
    try {
      const sdk = await getEvoSdk();

      // Try the dedicated DPNS usernames function first (v3 SDK returns string[] directly)
      try {
        const usernames = await sdk.dpns.usernames({ identityId, limit: 20 });
        if (usernames && usernames.length > 0) {
          return usernames;
        }
      } catch {
        // Fallback to document query
      }

      // Fallback: Query DPNS documents by identity ID
      const response = await sdk.documents.query({
        dataContractId: DPNS_CONTRACT_ID,
        documentTypeName: DPNS_DOCUMENT_TYPE,
        where: [['records.identity', '==', identityId]],
        limit: 20
      });

      const documents = extractDocuments(response);
      return documents.map((doc) => {
        const data = (doc.data || doc) as Record<string, unknown>;
        return `${data.label}.${data.normalizedParentDomainName}`;
      });
    } catch (error) {
      logger.error('DPNS: Error fetching all usernames:', error);
      return [];
    }
  }

  /**
   * Sort usernames by: contested first, then shortest, then alphabetically
   */
  async sortUsernamesByContested(usernames: string[]): Promise<string[]> {
    const sdk = await getEvoSdk();

    // Check contested status for all usernames
    const contestedStatuses = await Promise.all(
      usernames.map(async (u) => ({
        username: u,
        contested: await sdk.dpns.isContestedUsername(u.split('.')[0])
      }))
    );

    return contestedStatuses
      .sort((a, b) => {
        // 1. Contested usernames first
        if (a.contested && !b.contested) return -1;
        if (!a.contested && b.contested) return 1;
        // 2. Shorter usernames first
        if (a.username.length !== b.username.length) {
          return a.username.length - b.username.length;
        }
        // 3. Alphabetically
        return a.username.localeCompare(b.username);
      })
      .map(item => item.username);
  }

  /**
   * Batch resolve usernames for multiple identity IDs (reverse lookup)
   * Uses 'in' operator for efficient single-query resolution
   * Selects the "best" username for identities with multiple names (contested first, then shortest, then alphabetically)
   */
  async resolveUsernamesBatch(identityIds: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();

    // Initialize all as null
    identityIds.forEach(id => results.set(id, null));

    if (identityIds.length === 0) return results;

    // Check cache first
    const uncachedIds: string[] = [];
    for (const id of identityIds) {
      const cached = this.reverseCache.get(id);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        results.set(id, cached.value);
      } else {
        uncachedIds.push(id);
      }
    }

    if (uncachedIds.length === 0) {
      return results;
    }

    try {
      const sdk = await getEvoSdk();

      // Batch query using 'in' operator (max 100 per query)
      const response = await sdk.documents.query({
        dataContractId: DPNS_CONTRACT_ID,
        documentTypeName: DPNS_DOCUMENT_TYPE,
        where: [['records.identity', 'in', uncachedIds]],
        orderBy: [['records.identity', 'asc']],
        limit: 100
      });

      const documents = extractDocuments(response);

      // Collect ALL usernames per identity (some users have multiple)
      const usernamesByIdentity = new Map<string, string[]>();
      for (const doc of documents) {
        const data = (doc.data || doc) as Record<string, unknown>;
        const records = data.records as Record<string, unknown> | undefined;
        const rawId = records?.identity || records?.dashUniqueIdentityId;
        // Convert base64 identity to base58 for consistent map keys
        const identityId = identifierToBase58(rawId);
        const label = data.label || data.normalizedLabel;
        const parentDomain = data.normalizedParentDomainName || 'dash';
        const username = `${label}.${parentDomain}`;

        if (identityId && label) {
          const existing = usernamesByIdentity.get(identityId) || [];
          existing.push(username);
          usernamesByIdentity.set(identityId, existing);
        }
      }

      // For identities with multiple usernames, sort and pick the best one
      // For identities with one username, use it directly
      for (const [identityId, usernames] of Array.from(usernamesByIdentity.entries())) {
        let bestUsername: string;
        if (usernames.length === 1) {
          bestUsername = usernames[0];
        } else {
          // Sort: contested first, then shortest, then alphabetically
          // Wrap in try-catch so one failed contested lookup doesn't break the batch
          try {
            const sortedUsernames = await this.sortUsernamesByContested(usernames);
            bestUsername = sortedUsernames[0];
          } catch (err) {
            logger.warn(`DPNS: Failed to check contested status for ${identityId}, falling back to length sort`, err);
            // Fallback: sort by length then alphabetically (skip contested check)
            const sorted = [...usernames].sort((a, b) => {
              if (a.length !== b.length) return a.length - b.length;
              return a.localeCompare(b);
            });
            bestUsername = sorted[0];
          }
        }
        results.set(identityId, bestUsername);
        this._cacheEntry(bestUsername, identityId);
      }
    } catch (error) {
      logger.error('DPNS: Batch resolution error:', error);
    }

    return results;
  }

  /**
   * Resolve a username for an identity ID (reverse lookup)
   * Returns the best username (contested usernames are preferred)
   */
  async resolveUsername(identityId: string): Promise<string | null> {
    try {
      // Check cache
      const cached = this.reverseCache.get(identityId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.value;
      }

      // Get all usernames for this identity
      const allUsernames = await this.getAllUsernames(identityId);

      if (allUsernames.length === 0) {
        return null;
      }

      // Sort usernames with contested ones first
      const sortedUsernames = await this.sortUsernamesByContested(allUsernames);
      const bestUsername = sortedUsernames[0];

      this._cacheEntry(bestUsername, identityId);
      return bestUsername;
    } catch (error) {
      logger.error('DPNS: Error resolving username:', error);
      return null;
    }
  }

  /**
   * Resolve an identity ID from a username
   */
  async resolveIdentity(username: string): Promise<string | null> {
    try {
      // Normalize: lowercase and remove .dash suffix
      const normalizedUsername = username.toLowerCase().replace(/\.dash$/, '');

      // Check cache first
      const cached = this.cache.get(normalizedUsername);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.value;
      }

      const sdk = await getEvoSdk();

      // Try native resolution first using EvoSDK facade (v3 SDK returns string directly)
      try {
        if (sdk.dpns?.resolveName) {
          const identityId = await sdk.dpns.resolveName(normalizedUsername);

          if (identityId) {
            this._cacheEntry(normalizedUsername, identityId);
            return identityId;
          }
        }
      } catch (error) {
        logger.warn('DPNS: Native resolver failed, falling back to document query:', error);
      }

      // Fallback: Query DPNS documents directly
      const parts = normalizedUsername.split('.');
      const label = parts[0];
      const parentDomain = parts.slice(1).join('.') || 'dash';

      const response = await sdk.documents.query({
        dataContractId: DPNS_CONTRACT_ID,
        documentTypeName: DPNS_DOCUMENT_TYPE,
        where: [
          ['normalizedLabel', '==', label.toLowerCase()],
          ['normalizedParentDomainName', '==', parentDomain.toLowerCase()]
        ],
        limit: 1
      });

      const documents = extractDocuments(response);
      if (documents.length > 0) {
        const doc = documents[0];
        const data = (doc.data || doc) as Record<string, unknown>;
        const records = data.records as Record<string, unknown> | undefined;
        const rawId = records?.identity || records?.dashUniqueIdentityId || records?.dashAliasIdentityId;
        const identityId = identifierToBase58(rawId);

        if (identityId) {
          this._cacheEntry(normalizedUsername, identityId);
          return identityId;
        }
      }

      return null;
    } catch (error) {
      logger.error('DPNS: Error resolving identity:', error);
      return null;
    }
  }

  /**
   * Clear cache entries
   */
  clearCache(username?: string, identityId?: string): void {
    if (username) {
      this.cache.delete(username.toLowerCase());
    }
    if (identityId) {
      this.reverseCache.delete(identityId);
    }
    if (!username && !identityId) {
      this.cache.clear();
      this.reverseCache.clear();
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now();

    // Clean forward cache
    for (const [key, value] of Array.from(this.cache.entries())) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }

    // Clean reverse cache
    for (const [key, value] of Array.from(this.reverseCache.entries())) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.reverseCache.delete(key);
      }
    }
  }
}

// Singleton instance
export const dpnsService = new DpnsService();

// Set up periodic cache cleanup
if (typeof window !== 'undefined') {
  setInterval(() => {
    dpnsService.cleanupCache();
  }, 3600000); // Clean up every hour
}
