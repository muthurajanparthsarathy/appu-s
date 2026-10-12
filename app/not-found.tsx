import Link from 'next/link';
export default function NotFound() { return <main className="wrap empty-state"><h1>This aisle doesn’t exist</h1><p>Let’s help you find something fresh.</p><Link className="button" href="/shop">Back to the store</Link></main>; }
