'use client';

import { useState, useEffect, useCallback } from 'react';
import { voteService, type VoteDocument } from '@/lib/services/vote-service';
import { logger } from '@/lib/logger';

interface UseVotesResult {
  votes: VoteDocument[];
  voteCounts: number[];
  totalVotes: number;
  isLoading: boolean;
}

export function useVotes(pollId: string | null, optionCount: number): UseVotesResult {
  const [votes, setVotes] = useState<VoteDocument[]>([]);
  const [voteCounts, setVoteCounts] = useState<number[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVotes = useCallback(async () => {
    if (!pollId || optionCount <= 0) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const fetchedVotes = await voteService.getVotesForPoll(pollId);
      setVotes(fetchedVotes);

      // Compute counts
      const counts = new Array(optionCount).fill(0) as number[];
      let total = 0;
      for (const vote of fetchedVotes) {
        total++;
        for (const idx of vote.selectedOptions) {
          if (idx >= 0 && idx < optionCount) {
            counts[idx]++;
          }
        }
      }
      setVoteCounts(counts);
      setTotalVotes(total);
    } catch (err) {
      logger.error('Error fetching votes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [pollId, optionCount]);

  useEffect(() => {
    fetchVotes().catch((err) => {
      logger.error('Error in useVotes effect:', err);
    });
  }, [fetchVotes]);

  return {
    votes,
    voteCounts,
    totalVotes,
    isLoading,
  };
}
