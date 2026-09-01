'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Compass, Loader2, Maximize2, Square } from 'lucide-react';
import type { Map as MapLibreMap, Marker as MapLibreMarker, StyleSpecification } from 'maplibre-gl';
import { cn } from '@/lib/cn';
import { useTheme } from '@/components/layout/theme';
import { CAMPUS_VIEW } from '@/data/vitap';
import type { CampusLocation, LocationCategory } from '@/types/domain';

/**
 * The real campus map.
 *
 * MapLibre GL JS (BSD-3) rendering OpenStreetMap data through OpenFreeMap's
 * public vector tiles. Both are free and open — no API key, no account, no
 * usage ceiling to blow through — which is what makes this shippable in a
 * student project that anyone can clone and run.
 *
 * maplibre-gl is pinned to v5 deliberately: on v6.6 the style fetches but never
 * finishes loading here — no source caches are built, no tile is requested and
 * no error is raised — leaving a blank canvas. v5 is also the line OpenFreeMap
 * itself ships and tests its public instance against.
 *
 * The 3D is not decoration: OSM records `building:levels` for this campus, so
 * the extrusion shows the real massing — the eleven-storey Central Block really
 * does stand over the three-storey academic blocks, and the fourteen-storey
 * hostel towers really do dominate the south. That is the thing a flat plan
 * cannot tell a first-year.
 *
 * Everything heavy is loaded on demand: the library is imported inside an
 * effect, so a visitor who never opens the map never downloads it.
 */

const STYLE_URL = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

/** Marker hue per category, matching the badges used elsewhere. */
const CATEGORY_HUE: Record<LocationCategory, string> = {
  ACADEMIC: 'campus',
  HOSTEL: 'club',
  LIBRARY: 'announcement',
  FOOD: 'opportunity',
  SPORTS: 'sports',
  AUDITORIUM: 'guest',
  ADMIN: 'academic',
  MEDICAL: 'alert',
  SERVICE: 'placement',
  PARKING: 'academic',
};

type Placed = CampusLocation & { lat: number; lng: number };

function isPlaced(location: CampusLocation): location is Placed {
  return location.lat !== null && location.lng !== null;
}

export function CampusMap3D({
  locations,
  visibleIds,
  selectedId,
  onSelect,
  className,
}: {
  locations: readonly CampusLocation[];
  /** Ids passing the current search/category filter; others are dimmed. */
  visibleIds: ReadonlySet<string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Map<string, MapLibreMarker>>(new Map());
  /** The style URL currently applied, so a theme swap is never applied twice. */
  const appliedStyle = useRef<string | null>(null);
  /** Read inside map callbacks, which outlive the render that created them. */
  const themeRef = useRef<'light' | 'dark'>('light');
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const { resolved } = useTheme();
  themeRef.current = resolved;

  /**
   * The theme as the document already has it.
   *
   * `useTheme` resolves in an effect, and effects run child-first — so at the
   * moment this component creates the map, the provider has not resolved yet
   * and `resolved` is still the 'light' default. The inline theme script has
   * already stamped the real answer on <html>, so read it from there and start
   * on the right style instead of loading one and immediately swapping it.
   */
  const domTheme = (): 'light' | 'dark' =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [pitched, setPitched] = useState(true);

  const placed = locations.filter(isPlaced);

  /* ------------------------------------------------------------- lifecycle */

  useEffect(() => {
    let cancelled = false;
    const node = container.current;
    if (!node) return;
    // Captured for the cleanup: `markers.current` may point elsewhere by then.
    const markerStore = markers.current;

    // Imported here rather than at module scope: this keeps ~800 kB of mapping
    // library out of every other route's bundle.
    void (async () => {
      try {
        // v5 ships a default export; the namespace fallback keeps this working
        // under either interop mode.
        const mod = await import('maplibre-gl');
        const maplibre = mod.default ?? mod;
        if (cancelled || !container.current) return;

        const initialTheme = domTheme();
        themeRef.current = initialTheme;
        const instance = new maplibre.Map({
          container: node,
          style: STYLE_URL[initialTheme],
          center: [CAMPUS_VIEW.center.lng, CAMPUS_VIEW.center.lat],
          zoom: CAMPUS_VIEW.defaultZoom,
          pitch: CAMPUS_VIEW.defaultPitch,
          bearing: CAMPUS_VIEW.defaultBearing,
          minZoom: 14,
          maxZoom: 19,
          attributionControl: { compact: true },
        });

        instance.addControl(new maplibre.NavigationControl({ visualizePitch: true }), 'top-right');
        instance.addControl(new maplibre.ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left');
        // Only a failure to fetch the style is fatal. A missing tile at the
        // edge of the viewport is routine and must not blank a working map.
        instance.on('error', (event) => {
          const message = String(event.error?.message ?? event.error ?? '');
          if (message.includes('/styles/')) setStatus((s) => (s === 'ready' ? s : 'failed'));
          else console.warn('[vitpulse:map]', message);
        });

        // The map paints progressively, so the overlay comes down as soon as
        // there is a canvas to look at. Waiting on `load` — which needs every
        // source resolved — leaves a spinner over a map that is already drawing.
        setStatus('ready');

        // The extrusion layer has to be re-added after every style swap, since
        // setStyle discards it. Which event lands after the style is actually
        // loaded varies, so this is attached to all three and guarded by a
        // cheap `getLayer` check rather than guessing the right one.
        const ensureExtrusion = () => addBuildingExtrusion(instance, themeRef.current);
        instance.on('styledata', ensureExtrusion);
        instance.on('load', ensureExtrusion);
        instance.on('idle', ensureExtrusion);

        map.current = instance;
        appliedStyle.current = STYLE_URL[initialTheme];

        for (const location of placed) {
          const element = markerElement(location);
          element.addEventListener('click', (event) => {
            event.stopPropagation();
            onSelectRef.current(location.id);
          });
          const marker = new maplibre.Marker({ element, anchor: 'bottom' })
            .setLngLat([location.lng, location.lat])
            .addTo(instance);
          markers.current.set(location.id, marker);
        }

        instance.on('click', () => onSelectRef.current(null));
      } catch (error) {
        console.error('[vitpulse:map] init', error);
        if (!cancelled) setStatus('failed');
      }
    })();

    return () => {
      cancelled = true;
      markerStore.clear();
      map.current?.remove();
      map.current = null;
    };
    // Markers and the instance are created once; theme changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------------------------------------------------------- theme */

  useEffect(() => {
    const instance = map.current;
    const next = STYLE_URL[resolved];
    if (!instance || appliedStyle.current === next) return;

    // `setStyle` on a map whose first style is still loading abandons that load
    // half-finished: the source caches are never built, no tile is ever
    // requested, and the map sits there empty with no error. So the swap waits
    // for the first style to finish, and never re-applies the style already on.
    const apply = () => {
      appliedStyle.current = next;
      instance.setStyle(next);
    };

    if (instance.isStyleLoaded()) {
      apply();
      return;
    }

    // `once('load')` is not enough: load may already have fired by the time this
    // effect attaches, and then the swap would never happen. `styledata` keeps
    // firing, so poll the loaded flag from it and detach on the first success.
    const onStyleData = () => {
      if (!instance.isStyleLoaded()) return;
      instance.off('styledata', onStyleData);
      apply();
    };
    instance.on('styledata', onStyleData);
    return () => {
      instance.off('styledata', onStyleData);
    };
  }, [resolved, status]);

  /* --------------------------------------------------------- filter + select */

  useEffect(() => {
    for (const [id, marker] of markers.current) {
      const element = marker.getElement();
      element.dataset.dimmed = visibleIds.has(id) ? 'false' : 'true';
      element.dataset.active = id === selectedId ? 'true' : 'false';
    }
  }, [visibleIds, selectedId]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !selectedId) return;
    const target = placed.find((l) => l.id === selectedId);
    if (!target) return;
    instance.flyTo({ center: [target.lng, target.lat], zoom: 17.6, duration: 900, essential: true });
    // `placed` is derived from props and stable enough for this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  /* --------------------------------------------------------------- controls */

  const resetView = useCallback(() => {
    map.current?.fitBounds(CAMPUS_VIEW.bounds, {
      padding: 40,
      pitch: pitched ? CAMPUS_VIEW.defaultPitch : 0,
      bearing: pitched ? CAMPUS_VIEW.defaultBearing : 0,
      duration: 900,
    });
  }, [pitched]);

  const togglePitch = useCallback(() => {
    const instance = map.current;
    if (!instance) return;
    const next = !pitched;
    setPitched(next);
    instance.easeTo({
      pitch: next ? CAMPUS_VIEW.defaultPitch : 0,
      bearing: next ? CAMPUS_VIEW.defaultBearing : 0,
      duration: 700,
    });
  }, [pitched]);

  if (status === 'failed') {
    return (
      <div className={cn('flex min-h-[320px] items-center justify-center rounded-md border border-line bg-tertiary p-6', className)}>
        <p className="max-w-sm text-center text-[13px] leading-relaxed text-muted">
          The live map could not load — it needs a network connection to OpenFreeMap. The schematic plan below works
          offline and shows the same places.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-md border border-line bg-tertiary', className)}>
      <div ref={container} className="vp-map h-[clamp(320px,58vh,620px)] w-full" />

      {status === 'loading' && (
        <div className="absolute inset-0 grid place-items-center bg-tertiary">
          <p className="flex items-center gap-2 text-[12.5px] text-muted">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Loading the campus…
          </p>
        </div>
      )}

      <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
        <MapButton onClick={togglePitch} label={pitched ? 'Switch to flat view' : 'Switch to 3D view'}>
          {pitched ? <Square className="size-3.5" aria-hidden="true" /> : <Box className="size-3.5" aria-hidden="true" />}
          {pitched ? '2D' : '3D'}
        </MapButton>
        <MapButton onClick={resetView} label="Reset to the whole campus">
          <Maximize2 className="size-3.5" aria-hidden="true" />
          Fit
        </MapButton>
      </div>

      <p className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-sm bg-primary/85 px-1.5 py-0.5 text-[10px] font-medium text-muted backdrop-blur">
        <Compass className="size-3" aria-hidden="true" />
        {placed.length} places · heights ×{HEIGHT_EXAGGERATION}
      </p>
    </div>
  );
}

function MapButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-1 rounded-sm border border-line-strong bg-primary/90 px-2 py-1 text-[11px] font-semibold text-ink shadow-sm backdrop-blur transition-colors hover:bg-primary"
    >
      {children}
    </button>
  );
}

/**
 * Extruded buildings.
 *
 * OpenFreeMap's light style ships a `building-3d` layer but its dark style does
 * not, so rather than depend on either we add our own and get the same massing
 * in both themes. Heights come from OpenMapTiles' `render_height`, which is
 * derived from OSM's `height` / `building:levels`.
 */
/** Untagged OSM buildings report no height; treat them as single storey. */
const MIN_STOREY_METRES = 9;
/** Uniform vertical scale, so relative massing is preserved exactly. */
const HEIGHT_EXAGGERATION = 2.4;

const EXTRUSION_RAMP = {
  // Against the near-black dark basemap, buildings have to be lighter than the
  // ground or the massing is invisible; on the light basemap they have to be
  // darker. Same ramp, inverted.
  dark: ['rgba(78,92,124,0.85)', 'rgba(104,122,164,0.9)', 'rgba(138,160,208,0.95)'],
  light: ['rgba(176,184,200,0.8)', 'rgba(146,160,188,0.85)', 'rgba(112,132,172,0.9)'],
} as const;

function addBuildingExtrusion(instance: MapLibreMap, theme: 'light' | 'dark'): void {
  if (!instance.isStyleLoaded()) return;
  if (instance.getLayer('vitpulse-buildings')) return;

  // Wrapped: a rejected paint expression must degrade to a flat map, never
  // take the whole map down with it.
  try {
    const style = instance.getStyle() as StyleSpecification;
    if (!style.sources?.openmaptiles) return;

    // Draw under the labels so building names stay readable.
    const firstSymbol = style.layers.find((layer) => layer.type === 'symbol')?.id;

    // `render_height` arrives as an untyped feature property, so it is coerced
    // before any arithmetic — an `interpolate` input must be a number.
    const raw = ['coalesce', ['to-number', ['get', 'render_height']], 0];

    // Two adjustments, both deliberate:
    //
    // 1. A floor. Plenty of campus buildings are tagged `building=yes` with no
    //    height or levels, so they arrive at 0 m and would simply not appear —
    //    a campus that looks half demolished. One storey is the honest minimum.
    // 2. A uniform exaggeration. The campus is ~670 m across; at a zoom that
    //    fits it on screen, a real 11 m academic block is about three pixels
    //    tall and reads as flat. Scaling every building by the same factor
    //    keeps the relative massing exactly right — the eleven-storey Central
    //    Block still towers over the three-storey blocks — while making that
    //    difference visible. The UI says the heights are exaggerated.
    const height = ['*', ['max', raw, MIN_STOREY_METRES], HEIGHT_EXAGGERATION];
    const base = [
      '*',
      ['coalesce', ['to-number', ['get', 'render_min_height']], 0],
      HEIGHT_EXAGGERATION,
    ];

    instance.addLayer(
      {
        id: 'vitpulse-buildings',
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 13.5,
        paint: {
          // Tinted by the building's *real* height, so the colour still means
          // something even though the geometry is exaggerated.
          'fill-extrusion-color': [
            'interpolate', ['linear'], raw,
            0, EXTRUSION_RAMP[theme][0],
            15, EXTRUSION_RAMP[theme][1],
            45, EXTRUSION_RAMP[theme][2],
          ],
          // Grow in over a short zoom band so buildings do not pop into
          // existence, but reach full height well before the default view —
          // the previous ramp did not finish until z15.5 and left the campus
          // flat at the zoom the map actually opens at.
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13.6, 0, 14.6, height],
          'fill-extrusion-base': base,
          'fill-extrusion-opacity': 0.92,
          'fill-extrusion-vertical-gradient': true,
        },
      } as never,
      firstSymbol,
    );

    if (instance.getLayer('building-3d')) instance.removeLayer('building-3d');
  } catch (error) {
    console.warn('[vitpulse:map] extrusion skipped:', error);
  }
}

/** A marker is a plain DOM node so it can be styled with the app's tokens. */
function markerElement(location: Placed): HTMLElement {
  const hue = CATEGORY_HUE[location.category];
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'vp-marker';
  element.dataset.dimmed = 'false';
  element.dataset.active = 'false';
  element.style.setProperty('--marker-bg', `rgb(var(--cat-${hue}-bg))`);
  element.style.setProperty('--marker-fg', `rgb(var(--cat-${hue}-fg))`);
  element.setAttribute('aria-label', location.name);
  element.title = location.name;

  const dot = document.createElement('span');
  dot.className = 'vp-marker-dot';
  const label = document.createElement('span');
  label.className = 'vp-marker-label';
  label.textContent = location.shortName;

  element.append(dot, label);
  return element;
}
