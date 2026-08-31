import type { Metadata } from 'next';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { CampusMap } from '@/components/campus/campus-map';
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
        <CampusMap locations={locations} initialSelected={selected} />
        <Alert tone="neutral" className="mt-6">
          The plan is illustrative and shows relative positions rather than surveyed coordinates. Each location row
          already carries latitude and longitude columns, so a real mapping provider can be wired in without a schema
          change.
        </Alert>
      </PageBody>
    </>
  );
}
