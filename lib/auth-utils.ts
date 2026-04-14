/**
 * Prompt user to re-enter their private key.
 * Called from services when private key is missing mid-session.
 *
 * This handles the case where a user appears logged in but their
 * private key has been deleted from storage (manually, by another tab, etc.)
 *
 * TODO: Wire up to login modal once auth context is implemented
 */
export function promptForAuthKey(): void {
  // Placeholder — will be connected to a login modal store in Phase 4
  console.warn('Auth key required but no login modal available yet')
}
