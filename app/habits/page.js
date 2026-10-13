import AuthGate from '../components/AuthGate';
import HabitsView from '../components/HabitsView';

export const metadata = { title: 'Habits · Journal' };

export default function HabitsPage() {
  return (
    <AuthGate>
      <HabitsView />
    </AuthGate>
  );
}
