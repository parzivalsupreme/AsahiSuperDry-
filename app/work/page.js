import AuthGate from '../components/AuthGate';
import WorkView from '../components/WorkView';

export const metadata = { title: 'Work · Journal' };

export default function WorkPage() {
  return (
    <AuthGate>
      <WorkView />
    </AuthGate>
  );
}
