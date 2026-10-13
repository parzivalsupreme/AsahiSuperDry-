import AuthGate from '../components/AuthGate';
import PlacesMap from '../components/PlacesMap';

export const metadata = { title: 'Places · Journal' };

export default function PlacesPage() {
  return (
    <AuthGate>
      <PlacesMap />
    </AuthGate>
  );
}
