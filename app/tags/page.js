import { Suspense } from 'react';
import AuthGate from '../components/AuthGate';
import TagIndex from '../components/TagIndex';

export const metadata = { title: 'Tags · Journal' };

export default function TagsPage() {
  return (
    <AuthGate>
      <Suspense>
        <TagIndex />
      </Suspense>
    </AuthGate>
  );
}
