'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Switch from '@radix-ui/react-switch'
import { motion, AnimatePresence } from 'framer-motion'
import { useLoginModal } from '@/hooks/use-login-modal'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { X } from 'lucide-react'

export function LoginModal() {
  const { isOpen, close } = useLoginModal()
  const { login } = useAuth()

  const [identityId, setIdentityId] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login(identityId.trim(), privateKey.trim(), { rememberMe })
      // Reset form on success
      setIdentityId('')
      setPrivateKey('')
      setRememberMe(false)
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
    }
  }

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
                      Enter your Dash Platform credentials to continue.
                    </Dialog.Description>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                      {/* Identity ID */}
                      <div className="space-y-2">
                        <label
                          htmlFor="identity-id"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Identity ID
                        </label>
                        <Input
                          id="identity-id"
                          type="text"
                          placeholder="Enter your Identity ID"
                          value={identityId}
                          onChange={(e) => setIdentityId(e.target.value)}
                          disabled={isLoading}
                          required
                        />
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
                          disabled={isLoading}
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
                          disabled={isLoading}
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
                        disabled={isLoading || !identityId.trim() || !privateKey.trim()}
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
