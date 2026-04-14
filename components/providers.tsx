'use client'

import { ThemeProvider } from 'next-themes'
import { SdkProvider } from '@/contexts/sdk-context'
import { AuthProvider } from '@/contexts/auth-context'
import { LoginModal } from '@/components/auth/login-modal'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SdkProvider>
        <AuthProvider>
          {children}
          <LoginModal />
        </AuthProvider>
      </SdkProvider>
    </ThemeProvider>
  )
}
