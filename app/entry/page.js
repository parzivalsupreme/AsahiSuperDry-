import { Suspense } from 'react';
import EntryView from '../components/EntryView';

export default function EntryPage() {
  return (
    <Suspense>
      <EntryView />
    </Suspense>
  );
}
