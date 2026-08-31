'use client';

import {
  Children, cloneElement, isValidElement,
  type HTMLAttributes, type ReactElement, type Ref,
} from 'react';
import { cn } from '@/lib/cn';

/**
 * Minimal `asChild` implementation.
 *
 * Merges the wrapper's props onto its single child element so `<Button asChild>
 * <Link/></Button>` renders one `<a>` carrying the button styles — rather than a
 * button wrapping a link, which breaks keyboard and middle-click behaviour.
 *
 * `Children.only` is deliberately avoided: it rejects a single element that
 * arrives wrapped in an array, which is exactly what happens when children
 * cross the server/client component boundary or when JSX contains a
 * conditional sibling that renders nothing. Normalising through
 * `Children.toArray` accepts both shapes, and anything genuinely ambiguous
 * falls back to a plain wrapper instead of crashing the route.
 */

type SlotProps = HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> };

export function Slot({ children, className, ...props }: SlotProps) {
  // `toArray` drops null/undefined/boolean children and flattens fragments.
  const candidates = Children.toArray(children).filter(isValidElement);
  const child = candidates[0];

  if (candidates.length !== 1 || !child) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[Slot] expected exactly one element child, received ${candidates.length}. ` +
          'Rendering a wrapper instead — check the `asChild` call site.',
      );
    }
    return (
      <span className={className} {...props}>
        {children}
      </span>
    );
  }

  const childProps = child.props as HTMLAttributes<HTMLElement> & { className?: string };

  return cloneElement(child as ReactElement<HTMLAttributes<HTMLElement>>, {
    ...props,
    // The child's own props win, so an explicit href/onClick is never clobbered.
    ...childProps,
    className: cn(className, childProps.className),
  });
}
