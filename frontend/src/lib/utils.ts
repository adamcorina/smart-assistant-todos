/**
 * Combines class names conditionally.
 * Usage: cn('base', condition && 'conditional', ...more)
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
