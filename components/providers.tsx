'use client'

import { SdkProvider } from '@/contexts/sdk-context'
import { AuthProvider } from '@/contexts/auth-context'
import { LoginModal } from '@/components/auth/login-modal'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SdkProvider>
      <AuthProvider>
        {children}
        <LoginModal />
      </AuthProvider>
    </SdkProvider>
  )
}
