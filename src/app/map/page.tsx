import type { Metadata } from 'next';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { MapExplorer } from '@/components/campus/map-explorer';
import { Alert } from '@/components/ui/misc';
import { pageMetadata } from '@/lib/metadata';
import { listLocations } from '@/server/db/repositories/catalog';
import { param, type SearchParams } from '@/lib/query-params';

/** Interactive campus plan. */

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: 'Campus map',
  description:
    'Find academic blocks, hostels, the library, dining halls, sports facilities, the auditorium and every major venue on the VIT-AP campus.',
  path: '/map',
});

export default async function MapPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const selected = param(params, 'location');
  const locations = await listLocations();

  return (
    <>
      <PageHeader
        eyebrow="Find your way"
        title="Campus map"
        description="Every block, hostel, facility and venue on campus. Select a pin for opening hours and contacts."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Campus', href: '/campus' }, { label: 'Map' }]}
        compact
      />
      <PageBody>
        <MapExplorer locations={locations} initialSelected={selected} />
        <Alert tone="neutral" className="mt-6">
          Names, descriptions and opening hours come from VIT-AP&rsquo;s own campus tour and facilities pages.
          Coordinates and building heights come from OpenStreetMap contributors (ODbL), rendered with MapLibre GL JS
          and OpenFreeMap&rsquo;s public tiles — both free and open source, no API key. Places with no published
          position are listed as unmapped rather than given an invented one.
        </Alert>
      </PageBody>
    </>
  );
}
