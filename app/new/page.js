import { Suspense } from 'react';
import AuthGate from '../components/AuthGate';
import Composer from '../components/Composer';

export const metadata = { title: 'Write · Journal' };

export default function NewEntryPage() {
  return (
    <AuthGate>
      <Suspense>
        <Composer />
      </Suspense>
    </AuthGate>
  );
}
