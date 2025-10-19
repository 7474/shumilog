import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, style, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Enable vertical resizing and scrolling
          'resize-y overflow-auto touch-pan-y',
          // Prevent parent scrolling when scrolling within textarea
          'overscroll-contain',
          // Set a max height to ensure textarea can scroll
          'max-h-[60vh]',
          className
        )}
        style={{ WebkitOverflowScrolling: 'touch', ...style }}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
