'use client';

import { useState, useEffect, useCallback } from 'react';
import { pollService, type PollDocument } from '@/lib/services/poll-service';
import { logger } from '@/lib/logger';

interface UsePollsResult {
  polls: PollDocument[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePolls(limit = 20): UsePollsResult {
  const [polls, setPolls] = useState<PollDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPolls = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await pollService.getRecentPolls(limit);
      setPolls(result);
    } catch (err) {
      logger.error('Error fetching polls:', err);
      setError('Failed to load polls');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPolls().catch((err) => {
      logger.error('Error in usePolls effect:', err);
    });
  }, [fetchPolls]);

  return {
    polls,
    isLoading,
    error,
    refetch: fetchPolls,
  };
}
