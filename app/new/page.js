import Composer from '../components/Composer';
import config from '../../journal.config.js';

export const metadata = { title: `New entry · ${config.name}` };

export default function NewEntryPage() {
  return <Composer config={config} />;
}
