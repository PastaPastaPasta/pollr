'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import * as Switch from '@radix-ui/react-switch'
import { motion, AnimatePresence } from 'framer-motion'
import { useLoginModal } from '@/hooks/use-login-modal'
import { useAuth } from '@/contexts/auth-context'
import { useSdk } from '@/contexts/sdk-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
      setError(err instanceof Error ? err.message : 'Could not sign in')
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
                    className="relative w-full max-w-md max-h-[calc(100dvh-32px)] overflow-y-auto rounded-lg bg-[var(--dh-surface)] p-6 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Close button */}
                    <Dialog.Close asChild>
                      <button
                        className="dh-btn absolute right-3 top-3 flex items-center justify-center text-[var(--dh-ink-2)] hover:text-[var(--dh-ink-2)] dark:hover:text-[var(--dh-ink-2)]"
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </Dialog.Close>

                    <Dialog.Title className="text-lg font-semibold text-[var(--dh-ink)] dark:text-white">
                      Sign in to Pollr
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-[var(--dh-ink-2)]">
                      Creating a poll or voting signs a public action with your Testnet identity and spends its credits. Reading polls and results is free.
                    </Dialog.Description>

                    <div className="mt-4 space-y-3 text-sm text-[var(--dh-ink-2)]">
                      <p><strong>One identity, separate app authorization.</strong> Your Testnet Platform identity and credits can be reused in Pollr, Forge and Yappr. Each app needs its own sign-in; app passwords and passkeys are not shared.</p><h2 className="dh-section__title text-[var(--dh-ink)]">New to Platform?</h2>
                      <ol className="list-decimal pl-5 space-y-2">
                        <li><a className="text-[var(--dh-brand-ink)] underline" href="https://bridge.thepasta.org/?mode=create&journey=start&network=testnet" data-family="bridge" data-path="/?mode=create&journey=start" data-network="testnet">Create a Testnet identity in Bridge →</a> Keep its key backup private.</li>
                        <li>When bridge gives you a deposit address, <a className="text-[var(--dh-brand-ink)] underline" href="https://faucet.dashhq.org/?network=testnet" data-family="faucet" data-network="testnet">get free test funds from Faucet →</a>, then finish registration in Bridge.</li>
                        <li>Return here with the identity ID (a username is optional) and its HIGH or CRITICAL authentication key in WIF format.</li>
                      </ol>
                      <p>Test funds have no cash value; Testnet data may reset.</p>
                      <Link href="/" onClick={() => handleOpenChange(false)} className="inline-flex min-h-10 items-center text-[var(--dh-brand-ink)] underline">Browse polls without signing in →</Link>
                    </div>
                    <details className="mt-4">
                      <summary className="cursor-pointer py-3 text-sm font-medium text-[var(--dh-ink)]">Use an existing signing key (advanced)</summary>
                      <p className="text-sm text-[var(--dh-ink-2)]">Pollr currently requires a private key; wallet approval and an app-limited credential are not available. Use a dedicated Testnet identity. This key can authorize actions beyond Pollr. Never enter your recovery phrase, MASTER key or a key holding real funds.</p>
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                      {!isReady && (
                        <div className="dh-card px-3 py-2 text-sm text-[var(--dh-ink-2)]">
                          Connecting to Dash Platform…
                        </div>
                      )}

                      {/* Identity input */}
                      <div className="space-y-2">
                        <label
                          htmlFor="identity-id"
                          className="dh-field__label"
                        >
                          Identity ID or username
                        </label>
                        <Input
                          id="identity-id"
                          autoCapitalize="none"
                          spellCheck={false}
                          aria-invalid={Boolean(lookupError)}
                          type="text"
                          placeholder="Enter your identity ID or name.dash"
                          value={identityInput}
                          onChange={(e) => setIdentityInput(e.target.value)}
                          disabled={isLoading || !isReady}
                          required
                        />
                        {isLookingUp && (
                          <p className="text-xs text-[var(--dh-ink-2)]">
                            Resolving identity…
                          </p>
                        )}
                        {!isLookingUp && resolvedIdentity && (
                          <p className="text-xs text-[var(--dh-ink-2)]">
                            Signing in as {resolvedIdentity.dpnsUsername || truncateId(resolvedIdentity.identityId)}
                          </p>
                        )}
                        {!isLookingUp && lookupError && (
                          <p className="text-xs text-[var(--dh-bad)]">{lookupError}</p>
                        )}
                      </div>

                      {/* Private Key */}
                      <div className="space-y-2">
                        <label
                          htmlFor="private-key"
                          className="dh-field__label"
                        >
                          Private key (WIF)
                        </label>
                        <Input
                          id="private-key"
                          autoComplete="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          aria-describedby="key-hint"
                          type="password"
                          placeholder="Enter your private key (WIF)"
                          value={privateKey}
                          onChange={(e) => setPrivateKey(e.target.value)}
                          disabled={isLoading || !isReady}
                          required
                        />
                      </div>

                      <p id="key-hint" className="text-xs text-[var(--dh-ink-2)]">
                        Your key signs actions in this browser. Use a Testnet key only, never a key holding real funds.
                      </p>

                      {/* Remember Me */}
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="remember-me"
                          className="dh-field__label"
                        >
                          Keep my key on this device
                        </label>
                        <Switch.Root
                          id="remember-me"
                          checked={rememberMe}
                          onCheckedChange={setRememberMe}
                          disabled={isLoading || !isReady}
                          className="relative h-6 w-11 cursor-pointer rounded-full bg-[var(--dh-line)] transition-colors data-[state=checked]:bg-[var(--dh-brand-fill)]"
                        >
                          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[22px]" />
                        </Switch.Root>
                      </div>

                      <p className="text-xs text-[var(--dh-ink-2)]" aria-live="polite">
                        {rememberMe
                          ? 'Your key will stay in this browser’s local storage until you sign out. It is not encrypted.'
                          : 'Your key stays in this tab’s session storage until the tab closes or you sign out. It is not encrypted.'}
                      </p>

                      {/* Error message */}
                      {error && (
                        <p className="text-sm text-[var(--dh-bad)]">{error}</p>
                      )}

                      {/* Submit button */}
                      <Button
                        type="submit"
                        variant="primary" className="w-full"
                        disabled={!canSubmit}
                        aria-busy={isLoading}
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">

                            Signing in…
                          </span>
                        ) : (
                          'Sign in'
                        )}
                      </Button>
                    </form>
                    </details>
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
