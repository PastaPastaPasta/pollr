/**
 * Deployment-scoped storage keys.
 *
 * Parallel deployments can share an origin (Pollr at the root and under /pollr),
 * so every persistent key must carry
 * the deployment scope — otherwise the two apps, which target different
 * contract IDs, would read each other's sessions, caches, and stored keys.
 *
 * The scope is derived from BASE_PATH at build time (next.config.js). The root
 * build has no base path, so its keys keep their historical names.
 */
export const STORAGE_SCOPE = process.env.NEXT_PUBLIC_STORAGE_SCOPE || ''

export function scopedKey(key: string): string {
  return STORAGE_SCOPE ? `${STORAGE_SCOPE}:${key}` : key
}

/** localStorage key holding the persisted login session. */
export const SESSION_STORAGE_KEY = scopedKey('pollr_session')
