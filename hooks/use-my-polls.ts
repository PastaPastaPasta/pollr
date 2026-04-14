'use client';

import { useState, useEffect, useCallback } from 'react';
import { pollService, type PollDocument } from '@/lib/services/poll-service';
import { logger } from '@/lib/logger';

interface UseMyPollsResult {
  polls: PollDocument[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMyPolls(ownerId: string | null): UseMyPollsResult {
  const [polls, setPolls] = useState<PollDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyPolls = useCallback(async () => {
    if (!ownerId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await pollService.getPollsByOwner(ownerId);
      setPolls(result);
    } catch (err) {
      logger.error('Error fetching my polls:', err);
      setError('Failed to load your polls');
    } finally {
      setIsLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    fetchMyPolls().catch((err) => {
      logger.error('Error in useMyPolls effect:', err);
    });
  }, [fetchMyPolls]);

  return {
    polls,
    isLoading,
    error,
    refetch: fetchMyPolls,
  };
}
