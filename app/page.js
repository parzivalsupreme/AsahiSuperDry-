import Dashboard from './components/Dashboard';
import { getEntrySummaries } from '../lib/entries';

export default function Home() {
  const entries = getEntrySummaries();
  return <Dashboard entries={entries} />;
}
