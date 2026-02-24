import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-medium transition-all duration-200',
          'touch-feedback disabled:opacity-50 disabled:pointer-events-none',
          'rounded-[var(--radius-button)]',

          // Variants
          variant === 'primary' && [
            'bg-primary text-white',
            'hover:bg-primary-hover',
            'active:scale-[0.98]',
          ],
          variant === 'secondary' && [
            'glass',
            'hover:glass-hover',
            'text-text',
          ],
          variant === 'ghost' && [
            'bg-transparent',
            'hover:bg-surface',
            'text-text-muted hover:text-text',
          ],

          // Sizes
          size === 'sm' && 'h-8 px-3 text-sm',
          size === 'md' && 'h-10 px-4 text-base',
          size === 'lg' && 'h-12 px-6 text-lg',

          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
