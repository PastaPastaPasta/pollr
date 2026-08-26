'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLoginModal } from '@/hooks/use-login-modal';
import { logger } from '@/lib/logger';

/**
 * Gate voting on being signed in.
 *
 * A ballot cast while signed out is held, the login modal opens, and the held ballot is
 * submitted once the user comes back signed in.
 */
export function useVoteWithLogin(
  castVote: (choices: number[]) => Promise<unknown>
): (choices: number[]) => void {
  const { user } = useAuth();
  const { open: openLogin } = useLoginModal();
  const [pendingVote, setPendingVote] = useState<number[] | null>(null);
  const submittingRef = useRef(false);

  // Auto-submit pending vote after login
  useEffect(() => {
    if (!pendingVote || !user || submittingRef.current) return;
    submittingRef.current = true;
    castVote(pendingVote)
      .catch((err) => { logger.error('Error casting pending vote:', err) })
      .finally(() => {
        setPendingVote(null);
        submittingRef.current = false;
      });
  }, [pendingVote, user, castVote]);

  return useCallback((choices: number[]) => {
    if (!user) {
      setPendingVote(choices);
      openLogin();
      return;
    }
    castVote(choices).catch((err) => {
      logger.error('Error casting vote:', err);
    });
  }, [user, castVote, openLogin]);
}
