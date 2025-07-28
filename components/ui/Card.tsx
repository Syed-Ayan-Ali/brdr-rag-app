'use client';

import { cn } from '@/utils/utils';
import { forwardRef } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, role, ...props }, ref) => {
    return (
      <div
        // based on the role, change the background color
        
        // add a border and shadow
        className={cn('border border-gray-200 rounded-lg shadow-sm p-6', className)}
         
        ref={ref}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';