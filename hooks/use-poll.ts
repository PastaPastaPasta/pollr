'use client';

import { useState, useEffect, useCallback } from 'react';
import { pollService, type PollDocument } from '@/lib/services/poll-service';
import { voteService, applyCastVoteResult, type PollTally } from '@/lib/services/vote-service';
import { useAuth } from '@/contexts/auth-context';
import { useSdk } from '@/contexts/sdk-context';
import { logger } from '@/lib/logger';
import { isPollClosed } from '@/lib/utils';
import { reportCastVote } from '@/lib/vote-feedback';
import toast from 'react-hot-toast';

interface UsePollResult extends PollTally {
  poll: PollDocument | null;
  ownerUsername: string | null;
  isLoading: boolean;
  error: string | null;
  castVote: (choices: number[]) => Promise<void>;
  isVoting: boolean;
  refetch: () => Promise<void>;
}

/**
 * The tally before anything has been read, and after a failed read.
 *
 * Null rather than zero throughout: neither state is knowledge that a poll has no votes, and an
 * empty `userChoices` would reopen a ballot the voter may already have cast.
 */
function unknownTally(): PollTally {
  return { voteCounts: null, totalVotes: null, userChoices: null };
}

export function usePoll(pollId: string | null): UsePollResult {
  const { user } = useAuth();
  const { isReady } = useSdk();
  const [poll, setPoll] = useState<PollDocument | null>(null);
  const [ownerUsername, setOwnerUsername] = useState<string | null>(null);
  const [tally, setTally] = useState<PollTally>(unknownTally);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const resetPollState = useCallback(() => {
    setPoll(null);
    setOwnerUsername(null);
    setTally(unknownTally());
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

      const [username, fetchedTally] = await Promise.all([
        dpnsService.resolveUsername(fetchedPoll.$ownerId),
        voteService.getPollTally(fetchedPoll, user?.identityId),
      ]);

      setPoll(fetchedPoll);
      setOwnerUsername(username);
      setTally(fetchedTally);
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

  const castVote = useCallback(async (choices: number[]): Promise<void> => {
    if (!poll || !user) return;

    // The card hides the vote UI on a closed poll, but a tab left open past the deadline still
    // holds a stale render. Re-check against the clock at submit time.
    if (isPollClosed(poll)) {
      toast.error('This poll is closed');
      return;
    }

    try {
      setIsVoting(true);
      const result = await voteService.castVote(user.identityId, poll, choices);

      // Optimistic update using a functional updater to avoid a stale closure.
      setTally(prev => applyCastVoteResult(prev, result));

      reportCastVote(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cast vote');
      logger.error('Error casting vote:', err);
      // Part of a multi-choice ballot may have landed before the failure — resync from Platform.
      await fetchData();
    } finally {
      setIsVoting(false);
    }
  }, [poll, user, fetchData]);

  return {
    poll,
    ownerUsername,
    ...tally,
    isLoading,
    error,
    castVote,
    isVoting,
    refetch: fetchData,
  };
}
