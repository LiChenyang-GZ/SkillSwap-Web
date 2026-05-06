import { CreateWorkshopForm } from './CreateWorkshopForm';
import { CreateWorkshopHeader } from '../components/CreateWorkshopHeader';

export function CreateWorkshopScreen() {
  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <CreateWorkshopHeader />
        <CreateWorkshopForm />
      </div>
    </div>
  );
}
