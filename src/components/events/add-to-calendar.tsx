'use client';

import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

/**
 * Calendar export.
 *
 * Builds an RFC 5545 .ics file in the browser and hands it to the user as a
 * download, so it works with Google Calendar, Outlook and Apple Calendar without
 * an integration or a third-party redirect.
 */
export function AddToCalendar({
  title,
  description,
  location,
  startsAt,
  endsAt,
  slug,
}: {
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  slug: string;
}) {
  const { toast } = useToast();

  const download = () => {
    const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    // Long lines must be folded, and commas/semicolons escaped, per the spec.
    const escape = (value: string) => value.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const fold = (line: string) =>
      line.length <= 74 ? line : line.match(/.{1,74}/g)!.join('\r\n ');

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//VITPulse//Campus Events//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${slug}@vitpulse`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(startsAt)}`,
      `DTEND:${stamp(endsAt)}`,
      fold(`SUMMARY:${escape(title)}`),
      fold(`DESCRIPTION:${escape(description)}`),
      fold(`LOCATION:${escape(location)}`),
      fold(`URL:${window.location.origin}/events/${slug}`),
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      fold(`DESCRIPTION:${escape(title)} starts in an hour`),
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ];

    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${slug}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast('Calendar file downloaded — open it to add the event', 'success');
  };

  return (
    <Button variant="secondary" size="sm" onClick={download} className="justify-center">
      <CalendarPlus className="size-3.5" aria-hidden="true" />
      Add to calendar
    </Button>
  );
}
