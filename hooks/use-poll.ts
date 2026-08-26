'use client';

import { useState, useEffect, useCallback } from 'react';
import { pollService, type PollDocument } from '@/lib/services/poll-service';
import { voteService } from '@/lib/services/vote-service';
import { useAuth } from '@/contexts/auth-context';
import { useSdk } from '@/contexts/sdk-context';
import { logger } from '@/lib/logger';
import toast from 'react-hot-toast';

interface UsePollResult {
  poll: PollDocument | null;
  ownerUsername: string | null;
  voteCounts: number[];
  totalVotes: number;
  /** Option indices the signed-in user has already voted for. */
  userChoices: number[];
  isLoading: boolean;
  error: string | null;
  castVote: (choices: number[]) => Promise<boolean>;
  isVoting: boolean;
  refetch: () => Promise<void>;
}

export function usePoll(pollId: string | null): UsePollResult {
  const { user } = useAuth();
  const { isReady } = useSdk();
  const [poll, setPoll] = useState<PollDocument | null>(null);
  const [ownerUsername, setOwnerUsername] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<number[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [userChoices, setUserChoices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const resetPollState = useCallback(() => {
    setPoll(null);
    setOwnerUsername(null);
    setVoteCounts([]);
    setTotalVotes(0);
    setUserChoices([]);
  }, []);

  const fetchData = useCallback(async () => {
    if (!isReady) {
      return;
    }

    if (!pollId) {
      resetPollState();
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { dpnsService } = await import('@/lib/services/dpns-service');
      const fetchedPoll = await pollService.getPoll(pollId);

      if (!fetchedPoll) {
        setError('Poll not found');
        resetPollState();
        return;
      }

      const [username, tally, choices] = await Promise.all([
        dpnsService.resolveUsername(fetchedPoll.$ownerId),
        voteService.getVoteTally(pollId, fetchedPoll.options.length),
        user ? voteService.getMyVotes(pollId, user.identityId) : Promise.resolve<number[]>([]),
      ]);

      setPoll(fetchedPoll);
      setOwnerUsername(username);
      setVoteCounts(tally.counts);
      setTotalVotes(tally.total);
      setUserChoices(choices);
    } catch (err) {
      logger.error('Error fetching poll data:', err);
      resetPollState();
      setError('Failed to load poll');
    } finally {
      setIsLoading(false);
    }
  }, [isReady, pollId, user, resetPollState]);

  useEffect(() => {
    if (!isReady) {
      setIsLoading(true);
      return;
    }

    fetchData().catch((err) => {
      logger.error('Error in usePoll effect:', err);
    });
  }, [fetchData, isReady]);

  const castVote = useCallback(async (choices: number[]): Promise<boolean> => {
    if (!poll || !user) return false;

    try {
      setIsVoting(true);
      const result = await voteService.castVote(
        user.identityId,
        poll.$id,
        poll.$ownerId,
        choices
      );

      const recorded = result.choices.filter(choice => !result.alreadyVoted.includes(choice));

      setUserChoices(result.choices);
      setVoteCounts(prev => {
        const updated = [...prev];
        recorded.forEach(choice => { updated[choice] = (updated[choice] || 0) + 1 });
        return updated;
      });
      setTotalVotes(prev => prev + recorded.length);

      if (recorded.length === 0) {
        toast('You had already voted on this poll');
      } else {
        toast.success('Vote submitted!');
      }
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cast vote');
      logger.error('Error casting vote:', err);
      // Part of a multi-choice ballot may have landed before the failure — resync from Platform.
      await fetchData();
      return false;
    } finally {
      setIsVoting(false);
    }
  }, [poll, user, fetchData]);

  return {
    poll,
    ownerUsername,
    voteCounts,
    totalVotes,
    userChoices,
    isLoading,
    error,
    castVote,
    isVoting,
    refetch: fetchData,
  };
}
