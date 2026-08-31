import Image from 'next/image';

/**
 * The desktop wallpaper.
 *
 * Two matched illustrations of the campus — day and night — swapped by theme.
 * Both are rendered and toggled with CSS rather than swapped in JavaScript, so
 * the correct one is already painted when the theme script runs and there is no
 * flash on load. `priority` on the light image keeps it out of the LCP path's
 * way; the pair is `object-cover` so the composition holds at any aspect ratio.
 */
export function Wallpaper() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Both are always mounted and crossfaded by opacity. A hard swap would
          pop mid-transition; dissolving keeps the day/night change continuous
          with the rest of the theme sweep. */}
      <Image
        src="/LightBG.png"
        alt=""
        fill
        priority
        sizes="100vw"
        quality={85}
        className="object-cover object-center opacity-100 transition-opacity duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] dark:opacity-0"
      />
      <Image
        src="/DarkBG.png"
        alt=""
        fill
        sizes="100vw"
        quality={85}
        className="object-cover object-center opacity-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] dark:opacity-100"
      />
      {/* A faint scrim keeps the window edge and desktop labels legible over
          the busiest part of the illustration. */}
      <div className="absolute inset-0 bg-secondary/25 transition-colors duration-[900ms] dark:bg-black/25" />
    </div>
  );
}
