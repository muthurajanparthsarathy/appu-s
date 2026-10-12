'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="wrap empty-state"><h1>We couldn’t load this aisle</h1><p>Please try again in a moment.</p><button className="button" onClick={reset}>Try again</button></main>; }
