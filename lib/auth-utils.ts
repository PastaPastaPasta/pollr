import { useLoginModal } from '@/lib/store'

/**
 * Prompt user to re-enter their private key.
 * Called from services when private key is missing mid-session.
 *
 * This handles the case where a user appears logged in but their
 * private key has been deleted from storage (manually, by another tab, etc.)
 */
export function promptForAuthKey(): void {
  useLoginModal.getState().open()
}
