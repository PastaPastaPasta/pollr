'use client';

import { useState, useEffect, useCallback } from 'react';
import { pollService } from '@/lib/services/poll-service';
import { pollMetadataService, type EnrichedPoll } from '@/lib/services/poll-metadata-service';
import { useSdk } from '@/contexts/sdk-context';
import { logger } from '@/lib/logger';

interface UseMyPollsResult {
  polls: EnrichedPoll[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMyPolls(ownerId: string | null): UseMyPollsResult {
  const { isReady } = useSdk();
  const [polls, setPolls] = useState<EnrichedPoll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyPolls = useCallback(async () => {
    if (!isReady) {
      return;
    }

    if (!ownerId) {
      setPolls([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await pollService.getPollsByOwner(ownerId);
      const enrichedPolls = await pollMetadataService.enrichPolls(result);
      setPolls(enrichedPolls);
    } catch (err) {
      logger.error('Error fetching my polls:', err);
      setError('Failed to load your polls');
    } finally {
      setIsLoading(false);
    }
  }, [isReady, ownerId]);

  useEffect(() => {
    if (!isReady) {
      setIsLoading(true);
      return;
    }

    fetchMyPolls().catch((err) => {
      logger.error('Error in useMyPolls effect:', err);
    });
  }, [fetchMyPolls, isReady]);

  return {
    polls,
    isLoading,
    error,
    refetch: fetchMyPolls,
  };
}
