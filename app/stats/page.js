import AuthGate from '../components/AuthGate';
import StatsView from '../components/StatsView';

export const metadata = { title: 'Stats · Journal' };

export default function StatsPage() {
  return (
    <AuthGate>
      <StatsView />
    </AuthGate>
  );
}
