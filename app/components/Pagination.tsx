import Link from 'next/link';

// URL-driven pagination: keeps every other query parameter (search, sort, filters) intact.
export function Pagination({ basePath, params, page, pageCount }: { basePath: string; params: Record<string, string | undefined>; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const href = (target: number) => {
    const query = new URLSearchParams(Object.entries({ ...params, page: target > 1 ? String(target) : undefined }).filter((entry): entry is [string, string] => Boolean(entry[1])));
    const text = query.toString();
    return text ? `${basePath}?${text}` : basePath;
  };
  return <nav className="pagination" aria-label="Pagination">
    {page > 1 ? <Link href={href(page - 1)} rel="prev">← Previous</Link> : <span aria-disabled="true">← Previous</span>}
    <span>Page {page} of {pageCount}</span>
    {page < pageCount ? <Link href={href(page + 1)} rel="next">Next →</Link> : <span aria-disabled="true">Next →</span>}
  </nav>;
}
