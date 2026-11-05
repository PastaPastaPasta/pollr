
interface SpinnerProps { size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }
export function Spinner({ className = '' }: SpinnerProps) {
  return <span className={`dh-loading ${className}`} role="status"><span className="dh-spin" aria-hidden="true" /><span className="dh-sr">Loading</span></span>
}
