'use client'

import { logger } from '@/lib/logger'
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { POLLR_CONTRACT_ID, DEFAULT_NETWORK } from '@/lib/constants'
import type { IdentityPublicKey } from '@/lib/services/identity-service'
import {
  findMatchingKeyIndex,
  getPurposeName,
  getSecurityLevelName,
  isPurposeAllowedForLogin,
  isSecurityLevelAllowedForLogin,
  type IdentityPublicKeyInfo,
} from '@/lib/crypto/keys'
import { validateWifNetwork, wifToPrivateKey, type DecodedWif } from '@/lib/crypto/wif'
import { normalizeBytes } from '@/lib/services/sdk-helpers'

export interface AuthUser {
  identityId: string
  balance: number
  dpnsUsername?: string
  publicKeys: IdentityPublicKey[]
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthRestoring: boolean
  error: string | null
  login: (identityOrUsername: string, privateKey: string, options?: { rememberMe?: boolean }) => Promise<void>
  logout: () => Promise<void>
  updateDPNSUsername: (username: string) => void
  refreshBalance: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const SESSION_KEY = 'pollr_session'
const IDENTITY_ID_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{42,46}$/

function isLikelyIdentityId(input: string): boolean {
  return IDENTITY_ID_PATTERN.test(input.trim())
}

function toLoginPublicKeys(publicKeys: IdentityPublicKey[]): IdentityPublicKeyInfo[] {
  return publicKeys.flatMap((key) => {
    const normalizedData = normalizeBytes(key.data)

    if (!normalizedData) {
      logger.warn(`Auth: Skipping public key ${key.id} because its data could not be normalized`)
      return []
    }

    return [{
      id: key.id,
      type: key.type,
      purpose: key.purpose,
      securityLevel: key.securityLevel,
      data: normalizedData
    }]
  })
}

// Helper to update a field in the saved session
function updateSavedSession(updater: (sessionData: Record<string, unknown>) => void): void {
  const savedSession = localStorage.getItem(SESSION_KEY)
  if (!savedSession) return

  try {
    const sessionData = JSON.parse(savedSession)
    updater(sessionData)
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
  } catch (e) {
    logger.error('Failed to update session:', e)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthRestoring, setIsAuthRestoring] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Restore session on mount
  useEffect(() => {
    async function restoreSession(): Promise<void> {
      const savedSession = localStorage.getItem(SESSION_KEY)
      if (!savedSession) return

      try {
        const sessionData = JSON.parse(savedSession)
        const savedUser = sessionData.user

        // Validate private key exists before restoring session
        const { hasPrivateKey, clearRememberMe } = await import('@/lib/secure-storage')
        if (!hasPrivateKey(savedUser.identityId)) {
          logger.warn('Auth: Session found but private key missing - clearing invalid session')
          localStorage.removeItem(SESSION_KEY)
          clearRememberMe()
          return
        }

        setUser(savedUser)

        // Resolve DPNS username in background if missing
        if (savedUser && !savedUser.dpnsUsername) {
          logger.info('Auth: Fetching DPNS username in background...')
          import('@/lib/services/dpns-service').then(async ({ dpnsService }) => {
            try {
              const dpnsUsername = await dpnsService.resolveUsername(savedUser.identityId)
              if (dpnsUsername) {
                logger.info('Auth: Found DPNS username:', dpnsUsername)
                setUser(prev => prev ? { ...prev, dpnsUsername } : prev)
                updateSavedSession(data => {
                  (data.user as Record<string, unknown>).dpnsUsername = dpnsUsername
                })
              }
            } catch (e) {
              logger.error('Auth: Background DPNS fetch failed:', e)
            }
          }).catch(e => {
            logger.error('Auth: Failed to import dpns-service:', e)
          })
        }
      } catch (e) {
        logger.error('Failed to restore session:', e)
        localStorage.removeItem(SESSION_KEY)
      }
    }

    restoreSession().catch(e => {
      logger.error('Auth: Unexpected error during session restore:', e)
    }).finally(() => {
      setIsAuthRestoring(false)
    })
  }, [])

  const login = useCallback(async (
    identityOrUsername: string,
    privateKey: string,
    options: { rememberMe?: boolean } = {}
  ) => {
    const { rememberMe = false } = options
    setIsLoading(true)
    setError(null)

    try {
      const trimmedIdentity = identityOrUsername.trim()
      const trimmedPrivateKey = privateKey.trim()
      const network = (process.env.NEXT_PUBLIC_NETWORK as 'testnet' | 'mainnet') || DEFAULT_NETWORK

      if (!trimmedIdentity || !trimmedPrivateKey) {
        throw new Error('Identity ID or DPNS username and private key are required')
      }

      const { identityService } = await import('@/lib/services/identity-service')
      const { evoSdkService } = await import('@/lib/services/evo-sdk-service')
      const { dpnsService } = await import('@/lib/services/dpns-service')

      // Initialize SDK if needed
      await evoSdkService.initialize({
        network,
        contractId: POLLR_CONTRACT_ID
      })

      let resolvedIdentityId = trimmedIdentity
      if (!isLikelyIdentityId(trimmedIdentity)) {
        const resolved = await dpnsService.resolveIdentity(trimmedIdentity)
        if (!resolved) {
          throw new Error('DPNS username not found')
        }
        resolvedIdentityId = resolved
      }

      logger.info('Fetching identity with EvoSDK...')
      const identityData = await identityService.getIdentity(resolvedIdentityId)

      if (!identityData) {
        throw new Error('Identity not found')
      }

      let decodedPrivateKey: DecodedWif
      try {
        decodedPrivateKey = wifToPrivateKey(trimmedPrivateKey)
      } catch {
        throw new Error('Invalid private key format')
      }

      if (!validateWifNetwork(decodedPrivateKey.prefix, network)) {
        throw new Error(`This private key is for a different network (${network} expected)`)
      }

      const publicKeys = toLoginPublicKeys(identityData.publicKeys)
      const matchingKey = findMatchingKeyIndex(trimmedPrivateKey, publicKeys, network)

      if (!matchingKey) {
        throw new Error('This private key does not belong to the selected identity')
      }

      if (!isPurposeAllowedForLogin(matchingKey.purpose)) {
        throw new Error(
          `This key cannot be used for authentication (it's a ${getPurposeName(matchingKey.purpose)} key)`
        )
      }

      if (!isSecurityLevelAllowedForLogin(matchingKey.securityLevel)) {
        if (matchingKey.securityLevel === 0) {
          throw new Error('This is your MASTER key. Use a HIGH or CRITICAL authentication key instead.')
        }

        throw new Error(
          `This key's security level is not allowed for login (${getSecurityLevelName(matchingKey.securityLevel)})`
        )
      }

      const dpnsUsername = await dpnsService.resolveUsername(identityData.id)

      const authUser: AuthUser = {
        identityId: identityData.id,
        balance: typeof identityData.balance === 'bigint'
          ? Number(identityData.balance)
          : identityData.balance,
        dpnsUsername: dpnsUsername || undefined,
        publicKeys: identityData.publicKeys
      }

      // Save session to localStorage
      const sessionData = {
        user: authUser,
        timestamp: Date.now()
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))

      // Store private key with remember-me preference
      const { storePrivateKey, setRememberMe } = await import('@/lib/secure-storage')
      setRememberMe(rememberMe)
      storePrivateKey(identityData.id, trimmedPrivateKey)

      setUser(authUser)

      logger.info('Login successful, redirecting to home...')
      router.push('/')
    } catch (err) {
      logger.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Failed to login')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const logout = useCallback(async () => {
    localStorage.removeItem(SESSION_KEY)

    if (user?.identityId) {
      const { clearPrivateKey, clearRememberMe } = await import('@/lib/secure-storage')
      clearPrivateKey(user.identityId)
      clearRememberMe()
    }

    setUser(null)
    router.push('/login')
  }, [router, user?.identityId])

  const updateDPNSUsername = useCallback((username: string) => {
    if (!user) return

    setUser({ ...user, dpnsUsername: username })
    updateSavedSession(data => {
      (data.user as Record<string, unknown>).dpnsUsername = username
    })
  }, [user])

  const refreshBalance = useCallback(async () => {
    const identityId = user?.identityId
    if (!identityId) return

    try {
      const { identityService } = await import('@/lib/services/identity-service')
      identityService.clearCache(identityId)
      const balance = await identityService.getBalance(identityId)

      setUser(prev => prev ? { ...prev, balance: balance.confirmed } : prev)
      updateSavedSession(data => {
        (data.user as Record<string, unknown>).balance = balance.confirmed
      })
    } catch (err) {
      logger.error('Failed to refresh balance:', err)
    }
  }, [user?.identityId])

  // Stable ref so the interval always calls the latest refreshBalance
  const refreshBalanceRef = useRef(refreshBalance)
  refreshBalanceRef.current = refreshBalance

  // Periodic balance refresh (every 5 minutes when logged in)
  useEffect(() => {
    if (!user?.identityId) return

    const FIVE_MINUTES = 300000
    const interval = setInterval(() => {
      refreshBalanceRef.current().catch(err => {
        logger.error('Periodic balance refresh failed:', err)
      })
    }, FIVE_MINUTES)

    return () => clearInterval(interval)
  }, [user?.identityId])

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthRestoring,
      error,
      login,
      logout,
      updateDPNSUsername,
      refreshBalance
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

function AuthLoadingSpinner(): JSX.Element {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
    </div>
  )
}

// HOC for protecting routes - redirects to /login if not authenticated
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  function AuthenticatedComponent(props: P): JSX.Element {
    const { user, isAuthRestoring } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (isAuthRestoring) return

      if (!user) {
        logger.info('withAuth: No user found, redirecting to login...')
        router.push('/login')
      }
    }, [user, isAuthRestoring, router])

    if (isAuthRestoring || !user) {
      return <AuthLoadingSpinner />
    }

    return <Component {...props} />
  }

  return AuthenticatedComponent
}
