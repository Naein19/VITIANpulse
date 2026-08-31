'use client';

import { Children, cloneElement, isValidElement, type HTMLAttributes, type ReactElement, type Ref } from 'react';
import { cn } from '@/lib/cn';

/**
 * Minimal `asChild` implementation.
 *
 * Merges the wrapper's props onto its single child element so `<Button asChild>
 * <Link/></Button>` renders one `<a>` carrying the button styles — rather than a
 * button wrapping a link, which breaks keyboard and middle-click behaviour.
 */

type SlotProps = HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> };

export function Slot({ children, className, ...props }: SlotProps) {
  const child = Children.only(children);
  if (!isValidElement(child)) return null;

  const childProps = child.props as HTMLAttributes<HTMLElement> & { className?: string };

  return cloneElement(child as ReactElement<HTMLAttributes<HTMLElement>>, {
    ...props,
    ...childProps,
    className: cn(className, childProps.className),
  });
}
