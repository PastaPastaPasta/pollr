'use client'

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Switch from '@radix-ui/react-switch'
import { motion, AnimatePresence } from 'framer-motion'
import { useLoginModal } from '@/hooks/use-login-modal'
import { useAuth } from '@/contexts/auth-context'
import { useSdk } from '@/contexts/sdk-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { X } from 'lucide-react'
import { truncateId } from '@/lib/utils'

const IDENTITY_ID_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{42,46}$/

function isLikelyIdentityId(input: string): boolean {
  return IDENTITY_ID_PATTERN.test(input.trim())
}

interface ResolvedIdentity {
  identityId: string
  dpnsUsername: string | null
}

export function LoginModal() {
  const { isOpen, close } = useLoginModal()
  const { login } = useAuth()
  const { isReady } = useSdk()

  const [identityInput, setIdentityInput] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [resolvedIdentity, setResolvedIdentity] = useState<ResolvedIdentity | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    let cancelled = false
    const trimmedInput = identityInput.trim()
    if (!trimmedInput || !isReady) {
      setResolvedIdentity(null)
      setLookupError(null)
      setIsLookingUp(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLookingUp(true)
      setLookupError(null)
      setResolvedIdentity(null)

      try {
        const { identityService } = await import('@/lib/services/identity-service')
        const { dpnsService } = await import('@/lib/services/dpns-service')

        let resolvedIdentityId = trimmedInput
        if (!isLikelyIdentityId(trimmedInput)) {
          const resolvedId = await dpnsService.resolveIdentity(trimmedInput)
          if (cancelled) return
          if (!resolvedId) {
            setLookupError('DPNS username not found')
            return
          }
          resolvedIdentityId = resolvedId
        }

        const identity = await identityService.getIdentity(resolvedIdentityId)
        if (cancelled) return
        if (!identity) {
          setLookupError('Identity not found')
          return
        }

        const dpnsUsername = await dpnsService.resolveUsername(identity.id)
        if (cancelled) return
        setResolvedIdentity({
          identityId: identity.id,
          dpnsUsername
        })
      } catch (lookupError) {
        if (cancelled) return
        setLookupError(
          lookupError instanceof Error ? lookupError.message : 'Failed to look up identity'
        )
      } finally {
        if (!cancelled) {
          setIsLookingUp(false)
        }
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [identityInput, isOpen, isReady])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login(identityInput.trim(), privateKey.trim(), { rememberMe })
      // Reset form on success
      setIdentityInput('')
      setPrivateKey('')
      setRememberMe(false)
      setResolvedIdentity(null)
      setLookupError(null)
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      close()
      // Reset error when closing
      setError(null)
      setLookupError(null)
      setResolvedIdentity(null)
      setIdentityInput('')
      setPrivateKey('')
      setRememberMe(false)
      setIsLookingUp(false)
    }
  }

  const canSubmit = Boolean(
    isReady &&
    resolvedIdentity &&
    identityInput.trim() &&
    privateKey.trim() &&
    !isLoading &&
    !isLookingUp &&
    !lookupError
  )

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
              >
                <Dialog.Content asChild>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Close button */}
                    <Dialog.Close asChild>
                      <button
                        className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </Dialog.Close>

                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                      Login to Pollr
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Enter your Dash identity ID or DPNS username and your private key.
                    </Dialog.Description>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                      {!isReady && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300">
                          Connecting to Dash Platform...
                        </div>
                      )}

                      {/* Identity input */}
                      <div className="space-y-2">
                        <label
                          htmlFor="identity-id"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Identity ID or DPNS Username
                        </label>
                        <Input
                          id="identity-id"
                          type="text"
                          placeholder="Enter your identity ID or name.dash"
                          value={identityInput}
                          onChange={(e) => setIdentityInput(e.target.value)}
                          disabled={isLoading || !isReady}
                          required
                        />
                        {isLookingUp && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Resolving identity...
                          </p>
                        )}
                        {!isLookingUp && resolvedIdentity && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Signing in as {resolvedIdentity.dpnsUsername || truncateId(resolvedIdentity.identityId)}
                          </p>
                        )}
                        {!isLookingUp && lookupError && (
                          <p className="text-xs text-red-500">{lookupError}</p>
                        )}
                      </div>

                      {/* Private Key */}
                      <div className="space-y-2">
                        <label
                          htmlFor="private-key"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Private Key
                        </label>
                        <Input
                          id="private-key"
                          type="password"
                          placeholder="Enter your private key (WIF)"
                          value={privateKey}
                          onChange={(e) => setPrivateKey(e.target.value)}
                          disabled={isLoading || !isReady}
                          required
                        />
                      </div>

                      {/* Remember Me */}
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="remember-me"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Remember me
                        </label>
                        <Switch.Root
                          id="remember-me"
                          checked={rememberMe}
                          onCheckedChange={setRememberMe}
                          disabled={isLoading || !isReady}
                          className="relative h-6 w-11 cursor-pointer rounded-full bg-gray-200 transition-colors data-[state=checked]:bg-pollr-500 dark:bg-gray-700"
                        >
                          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[22px]" />
                        </Switch.Root>
                      </div>

                      {/* Error message */}
                      {error && (
                        <p className="text-sm text-red-500">{error}</p>
                      )}

                      {/* Submit button */}
                      <Button
                        type="submit"
                        className="w-full bg-gradient-pollr hover:opacity-90"
                        disabled={!canSubmit}
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <Spinner size="xs" className="border-white" />
                            Logging in...
                          </span>
                        ) : (
                          'Login'
                        )}
                      </Button>
                    </form>
                  </motion.div>
                </Dialog.Content>
              </motion.div>
            </Dialog.Overlay>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
