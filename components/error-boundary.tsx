'use client'

import { logger } from '@/lib/logger'
import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  level?: 'app' | 'page' | 'component'
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo)

    this.setState({
      error,
      errorInfo
    })

    this.props.onError?.(error, errorInfo)

    if (process.env.NODE_ENV === 'production') {
      logger.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        level: this.props.level || 'component'
      })
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error ?? new Error('Unknown error')
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={error} retry={this.retry} />
      }

      return <DefaultErrorFallback
        error={error}
        retry={this.retry}
        level={this.props.level || 'component'}
      />
    }

    return this.props.children
  }
}

interface DefaultErrorFallbackProps {
  error: Error
  retry: () => void
  level: 'app' | 'page' | 'component'
}

function DefaultErrorFallback({ error, retry, level }: DefaultErrorFallbackProps) {
  const getErrorContent = () => {
    switch (level) {
      case 'app':
        return {
          title: 'Application error',
          description: 'Something went wrong with the application. Please try refreshing the page.',
          actionText: 'Refresh page',
          action: () => window.location.reload()
        }
      case 'page':
        return {
          title: 'Page error',
          description: 'There was an error loading this page. Please try again.',
          actionText: 'Try Again',
          action: retry
        }
      default:
        return {
          title: 'Something went wrong',
          description: 'There was an error with this component. Please try again.',
          actionText: 'Retry',
          action: retry
        }
    }
  }

  const { title, description, actionText, action } = getErrorContent()

  return (
    <div className="dh-card flex flex-col items-center justify-center min-h-[200px] ">
      <AlertTriangle className="h-12 w-12 text-[var(--dh-bad)] mb-4" />
      <h2 className="dh-section__title text-[var(--dh-ink)] dark:text-white mb-2">
        {title}
      </h2>
      <p className="text-[var(--dh-ink-2)] text-center mb-4 max-w-md">
        {description}
      </p>

      {process.env.NODE_ENV === 'development' && (
        <details className="mb-4 max-w-md w-full">
          <summary className="cursor-pointer text-sm text-[var(--dh-ink-2)] hover:text-[var(--dh-ink-2)] dark:hover:text-[var(--dh-ink)]">
            Error details
          </summary>
          <div className="mt-2 p-2 bg-[var(--dh-sunken)] rounded text-xs font-mono text-[var(--dh-ink-2)] overflow-auto max-h-32">
            <div className="font-semibold mb-1">Error:</div>
            <div className="mb-2">{error.message}</div>
            {error.stack && (
              <>
                <div className="font-semibold mb-1">Stack:</div>
                <div className="whitespace-pre-wrap break-all">{error.stack}</div>
              </>
            )}
          </div>
        </details>
      )}

      <button
        onClick={action}
        className="dh-btn dh-btn--quiet inline-flex items-center gap-2 text-[var(--dh-ink)] transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        {actionText}
      </button>
    </div>
  )
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

export default ErrorBoundary
