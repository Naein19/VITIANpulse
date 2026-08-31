/**
 * Structured data.
 *
 * The payload is always an object we constructed ourselves in `lib/metadata`,
 * never user input, and is serialised with `<` escaped so it cannot break out of
 * the script element.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON-LD requires a raw script body. The payload is constructed by us in
      // lib/metadata (never user input) and `<` is escaped so it cannot break out.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
