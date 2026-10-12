import { Suspense } from 'react';
import AuthGate from '../components/AuthGate';
import EntryView from '../components/EntryView';

export default function EntryPage() {
  return (
    <AuthGate>
      <Suspense>
        <EntryView />
      </Suspense>
    </AuthGate>
  );
}
