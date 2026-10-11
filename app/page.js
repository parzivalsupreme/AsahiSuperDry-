import Dashboard from './components/Dashboard';
import { getEntrySummaries } from '../lib/entries';
import config from '../journal.config.js';

export default function Home() {
  const entries = getEntrySummaries();
  return <Dashboard entries={entries} config={config} />;
}
