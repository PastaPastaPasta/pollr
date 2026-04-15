'use client';

import { useState, useEffect, useCallback } from 'react';
import { pollService } from '@/lib/services/poll-service';
import { pollMetadataService, type EnrichedPoll } from '@/lib/services/poll-metadata-service';
import { useSdk } from '@/contexts/sdk-context';
import { logger } from '@/lib/logger';

interface UsePollsResult {
  polls: EnrichedPoll[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePolls(limit = 20): UsePollsResult {
  const { isReady } = useSdk();
  const [polls, setPolls] = useState<EnrichedPoll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPolls = useCallback(async () => {
    if (!isReady) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await pollService.getRecentPolls(limit);
      const enrichedPolls = await pollMetadataService.enrichPolls(result);
      setPolls(enrichedPolls);
    } catch (err) {
      logger.error('Error fetching polls:', err);
      setError('Failed to load polls');
    } finally {
      setIsLoading(false);
    }
  }, [isReady, limit]);

  useEffect(() => {
    if (!isReady) {
      setIsLoading(true);
      return;
    }

    fetchPolls().catch((err) => {
      logger.error('Error in usePolls effect:', err);
    });
  }, [fetchPolls, isReady]);

  return {
    polls,
    isLoading,
    error,
    refetch: fetchPolls,
  };
}
