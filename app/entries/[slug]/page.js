import Link from 'next/link';
import { notFound } from 'next/navigation';
import FileView from '../../components/FileView';
import { getAllEntries, getEntry } from '../../../lib/entries';
import config from '../../../journal.config.js';

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllEntries().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const entry = getEntry(slug);
  return { title: entry ? `${entry.title} · ${config.name}` : config.name };
}

export default async function EntryPage({ params }) {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry) notFound();

  const editUrl = config.repo
    ? `https://github.com/${config.repo}/edit/${config.branch}/${config.entriesDir}/${entry.file}`
    : null;

  return (
    <div style={{ maxWidth: 1012, margin: '0 auto' }}>
      <nav className="breadcrumb">
        <Link href="/">{config.entriesDir}</Link>
        <span className="sep">/</span>
        <strong>{entry.file}</strong>
      </nav>

      <FileView entry={entry} editUrl={editUrl} />

      <nav className="pager">
        {entry.older ? (
          <Link href={`/entries/${entry.older.slug}/`}>
            <small>← Older</small>
            {entry.older.title}
          </Link>
        ) : (
          <span style={{ flex: 1 }} />
        )}
        {entry.newer ? (
          <Link href={`/entries/${entry.newer.slug}/`} className="next">
            <small>Newer →</small>
            {entry.newer.title}
          </Link>
        ) : (
          <span style={{ flex: 1 }} />
        )}
      </nav>
    </div>
  );
}
