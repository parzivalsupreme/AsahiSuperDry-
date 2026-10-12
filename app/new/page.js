import { Suspense } from 'react';
import Composer from '../components/Composer';

export const metadata = { title: 'Write · Journal' };

export default function NewEntryPage() {
  return (
    <Suspense>
      <Composer />
    </Suspense>
  );
}
