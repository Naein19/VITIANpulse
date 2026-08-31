/**
 * URL query-string helpers.
 *
 * Filters live in the URL rather than in component state so every filtered view
 * is linkable, back-button friendly and server-renderable. These helpers build
 * hrefs that preserve unrelated parameters and drop a parameter when it returns
 * to its default.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

/** Reads a single value, ignoring repeated keys. */
export function param(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function intParam(params: SearchParams, key: string, fallback: number): number {
  const raw = param(params, key);
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Narrows a raw value to a known union member, or returns the fallback. */
export function enumParam<T extends string>(
  params: SearchParams,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = param(params, key);
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

export function optionalEnumParam<T extends string>(
  params: SearchParams,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const raw = param(params, key);
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

export interface HrefBuilderOptions {
  /** Values equal to their default are removed, keeping URLs short. */
  defaults?: Record<string, string>;
  /** Parameters cleared whenever any other parameter changes (e.g. `page`). */
  resetOnChange?: readonly string[];
}

/**
 * Returns a function that builds `pathname?query` for a set of parameter
 * overrides, merged over the current parameters.
 */
export function hrefBuilder(pathname: string, current: SearchParams, options: HrefBuilderOptions = {}) {
  const { defaults = {}, resetOnChange = ['page'] } = options;

  return (overrides: Record<string, string | number | undefined | null>): string => {
    const next = new URLSearchParams();

    for (const [key, value] of Object.entries(current)) {
      if (value === undefined) continue;
      const single = Array.isArray(value) ? value[0] : value;
      if (single) next.set(key, single);
    }

    const changingSomethingElse = Object.keys(overrides).some((key) => !resetOnChange.includes(key));
    if (changingSomethingElse) {
      for (const key of resetOnChange) next.delete(key);
    }

    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === null || value === '') {
        next.delete(key);
        continue;
      }
      const asString = String(value);
      if (defaults[key] === asString) next.delete(key);
      else next.set(key, asString);
    }

    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
}

/** True when any filter beyond pagination is applied. */
export function hasActiveFilters(params: SearchParams, ignore: readonly string[] = ['page']): boolean {
  return Object.entries(params).some(([key, value]) => !ignore.includes(key) && Boolean(value));
}
