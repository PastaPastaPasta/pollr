import { logger } from '@/lib/logger';
import { getEvoSdk } from './evo-sdk-service';

export interface IdentityPublicKey {
  id: number;
  type: number;
  purpose: number;
  securityLevel: number;              // Required (normalized in getIdentity)
  readOnly?: boolean;
  disabledAt?: number;
  contractBounds?: unknown;
  data: string | Uint8Array;
}

export interface IdentityInfo {
  id: string;
  balance: number;
  publicKeys: IdentityPublicKey[];
  revision: number;
}

export interface IdentityBalance {
  confirmed: number;
  total: number;
}

function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  try {
    return JSON.stringify(
      value,
      (_key, current) => {
        if (typeof current === 'bigint') {
          return `${current.toString()}n`;
        }

        if (typeof current === 'object' && current !== null) {
          if (seen.has(current)) {
            return '[Circular]';
          }
          seen.add(current);
        }

        return current;
      },
      2
    );
  } catch {
    try {
      return String(value);
    } catch {
      return '[Unserializable value]';
    }
  }
}

class IdentityService {
  private identityCache: Map<string, { data: IdentityInfo; timestamp: number }> = new Map();
  private balanceCache: Map<string, { data: IdentityBalance; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Fetch identity information
   */
  async getIdentity(identityId: string): Promise<IdentityInfo | null> {
    try {
      // Check cache
      const cached = this.identityCache.get(identityId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      const sdk = await getEvoSdk();

      // Fetch identity using EvoSDK facade
      logger.info(`Fetching identity: ${identityId}`);
      const identityResponse = await sdk.identities.fetch(identityId);

      if (!identityResponse) {
        logger.warn(`Identity not found: ${identityId}`);
        return null;
      }

      // identity_fetch returns an object with a toJSON method
      const identity = identityResponse.toJSON();

      logger.info('Raw identity response:', safeStringify(identity));
      logger.info('Public keys from identity:', identity.publicKeys);

      // Normalize public keys to ensure all fields are present
      // v3.1: SDK consistently returns camelCase — snake_case fallbacks removed
      const rawPublicKeys = identity.publicKeys || [];
      const normalizedPublicKeys: IdentityPublicKey[] = rawPublicKeys.map((key: IdentityPublicKey) => ({
        id: key.id,
        type: key.type,
        purpose: key.purpose,
        securityLevel: key.securityLevel ?? 2, // Default to HIGH (2) if missing
        readOnly: key.readOnly ?? false,
        disabledAt: key.disabledAt,
        contractBounds: key.contractBounds,
        data: key.data
      }));

      const identityInfo: IdentityInfo = {
        id: identity.id || identityId,
        balance: identity.balance || 0,
        publicKeys: normalizedPublicKeys,
        revision: identity.revision || 0
      };

      // Cache the result
      this.identityCache.set(identityId, {
        data: identityInfo,
        timestamp: Date.now()
      });

      return identityInfo;
    } catch (error) {
      logger.error('Error fetching identity:', error);
      throw error;
    }
  }

  /**
   * Get identity balance
   */
  async getBalance(identityId: string): Promise<IdentityBalance> {
    try {
      // Check cache
      const cached = this.balanceCache.get(identityId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      const sdk = await getEvoSdk();

      // Fetch balance using EvoSDK facade (v3.1 SDK returns bigint | undefined)
      logger.info(`Fetching balance for: ${identityId}`);
      const balanceResponse = await sdk.identities.balance(identityId);

      // Convert bigint to number, handle undefined.
      // Warn if the value exceeds Number.MAX_SAFE_INTEGER to avoid silent truncation.
      let confirmedBalance = 0;
      if (balanceResponse !== undefined && balanceResponse !== null) {
        if (balanceResponse > BigInt(Number.MAX_SAFE_INTEGER)) {
          logger.warn(`Balance ${balanceResponse} credits exceeds Number.MAX_SAFE_INTEGER; precision may be lost`);
        }
        confirmedBalance = Number(balanceResponse);
      }

      logger.info(`Balance for ${identityId}: ${confirmedBalance} credits`);

      const balanceInfo: IdentityBalance = {
        confirmed: confirmedBalance,
        total: confirmedBalance
      };

      // Cache the result
      this.balanceCache.set(identityId, {
        data: balanceInfo,
        timestamp: Date.now()
      });

      return balanceInfo;
    } catch (error) {
      logger.error('Error fetching balance:', error);
      // Return zero balance on error
      return { confirmed: 0, total: 0 };
    }
  }

  /**
   * Verify if identity exists
   */
  async verifyIdentity(identityId: string): Promise<boolean> {
    try {
      const identity = await this.getIdentity(identityId);
      return identity !== null;
    } catch (error) {
      logger.error('Error verifying identity:', error);
      return false;
    }
  }

  /**
   * Get identity public keys
   */
  async getPublicKeys(identityId: string): Promise<IdentityPublicKey[]> {
    try {
      const identity = await this.getIdentity(identityId);
      return identity?.publicKeys || [];
    } catch (error) {
      logger.error('Error fetching public keys:', error);
      return [];
    }
  }

  /**
   * Clear cache for an identity
   */
  clearCache(identityId?: string): void {
    if (identityId) {
      this.identityCache.delete(identityId);
      this.balanceCache.delete(identityId);
    } else {
      this.identityCache.clear();
      this.balanceCache.clear();
    }
  }

  /**
   * Clear expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now();

    // Clean identity cache
    for (const [key, value] of Array.from(this.identityCache.entries())) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.identityCache.delete(key);
      }
    }

    // Clean balance cache
    for (const [key, value] of Array.from(this.balanceCache.entries())) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.balanceCache.delete(key);
      }
    }
  }
}

// Singleton instance
export const identityService = new IdentityService();

// Set up periodic cache cleanup
if (typeof window !== 'undefined') {
  setInterval(() => {
    identityService.cleanupCache();
  }, 60000); // Clean up every minute
}
