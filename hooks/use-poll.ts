'use client';

import { useState, useEffect, useCallback } from 'react';
import { pollService, type PollDocument } from '@/lib/services/poll-service';
import { voteService, type VoteDocument } from '@/lib/services/vote-service';
import { useAuth } from '@/contexts/auth-context';
import { logger } from '@/lib/logger';
import { computeVoteCounts } from '@/lib/utils';
import toast from 'react-hot-toast';

interface UsePollResult {
  poll: PollDocument | null;
  votes: VoteDocument[];
  voteCounts: number[];
  totalVotes: number;
  userVote: VoteDocument | null;
  isLoading: boolean;
  error: string | null;
  castVote: (selectedOptions: number[]) => Promise<boolean>;
  isVoting: boolean;
  refetch: () => Promise<void>;
}

export function usePoll(pollId: string | null): UsePollResult {
  const { user } = useAuth();
  const [poll, setPoll] = useState<PollDocument | null>(null);
  const [votes, setVotes] = useState<VoteDocument[]>([]);
  const [voteCounts, setVoteCounts] = useState<number[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [userVote, setUserVote] = useState<VoteDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const updateVoteCounts = useCallback((allVotes: VoteDocument[], optionCount: number) => {
    const { counts, total } = computeVoteCounts(allVotes, optionCount);
    setVoteCounts(counts);
    setTotalVotes(total);
  }, []);

  const fetchData = useCallback(async () => {
    if (!pollId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [fetchedPoll, fetchedVotes] = await Promise.all([
        pollService.getPoll(pollId),
        voteService.getVotesForPoll(pollId),
      ]);

      if (!fetchedPoll) {
        setError('Poll not found');
        setPoll(null);
        return;
      }

      setPoll(fetchedPoll);
      setVotes(fetchedVotes);
      updateVoteCounts(fetchedVotes, fetchedPoll.options.length);

      // Check if current user has voted
      if (user) {
        const existingVote = fetchedVotes.find(v => v.$ownerId === user.identityId);
        setUserVote(existingVote || null);
      } else {
        setUserVote(null);
      }
    } catch (err) {
      logger.error('Error fetching poll data:', err);
      setError('Failed to load poll');
    } finally {
      setIsLoading(false);
    }
  }, [pollId, user, updateVoteCounts]);

  useEffect(() => {
    fetchData().catch((err) => {
      logger.error('Error in usePoll effect:', err);
    });
  }, [fetchData]);

  const castVote = useCallback(async (selectedOptions: number[]): Promise<boolean> => {
    if (!poll || !user) return false;

    try {
      setIsVoting(true);
      const newVote = await voteService.castVote(
        user.identityId,
        poll.$id,
        poll.$ownerId,
        selectedOptions
      );

      setUserVote(newVote);

      // Optimistically update vote counts
      const newVotes = [...votes, newVote];
      setVotes(newVotes);
      updateVoteCounts(newVotes, poll.options.length);

      toast.success('Vote submitted!');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cast vote';

      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        toast.error('You have already voted on this poll');
        // Refetch to get current state
        await fetchData();
      } else {
        toast.error(errorMessage);
      }

      logger.error('Error casting vote:', err);
      return false;
    } finally {
      setIsVoting(false);
    }
  }, [poll, user, votes, updateVoteCounts, fetchData]);

  return {
    poll,
    votes,
    voteCounts,
    totalVotes,
    userVote,
    isLoading,
    error,
    castVote,
    isVoting,
    refetch: fetchData,
  };
}
