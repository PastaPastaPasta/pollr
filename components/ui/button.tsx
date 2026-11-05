import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'dh-btn',
  {
    variants: {
      variant: {
        default: 'dh-btn--secondary',
        primary: 'dh-btn--primary',
        destructive: 'dh-btn--destructive',
        outline: 'dh-btn--secondary',
        secondary: 'dh-btn--secondary',
        ghost: 'dh-btn--quiet',
        link: 'dh-btn--link',
      },
      size: {
        default: '',
        sm: 'dh-btn--sm',
        lg: 'dh-btn--lg',
        icon: 'dh-btn--icon',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    if (asChild) {
      const child = React.Children.only(props.children as React.ReactElement)
      return React.cloneElement(child, {
        className: cn(buttonVariants({ variant, size, className }), child.props.className),
        ref,
      })
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
