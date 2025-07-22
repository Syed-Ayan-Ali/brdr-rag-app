'use client';

import { cn } from '@/lib/utils/utils';
import { forwardRef } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        className={cn('bg-white border border-gray-200 rounded-lg shadow-sm p-6', className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';