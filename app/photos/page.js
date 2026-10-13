import AuthGate from '../components/AuthGate';
import PhotoGallery from '../components/PhotoGallery';

export const metadata = { title: 'Photos · Journal' };

export default function PhotosPage() {
  return (
    <AuthGate>
      <PhotoGallery />
    </AuthGate>
  );
}
