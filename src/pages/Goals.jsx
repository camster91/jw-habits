import { Target } from 'lucide-react';
import GoalsTab from '../components/GoalsTab';
import PageHeader from '../components/PageHeader';

function Goals() {
  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <PageHeader
        title="Goals"
        subtitle="Set and track your spiritual goals"
        icon={Target}
        gradient="from-amber-500 via-amber-600 to-orange-600"
        blurColor="orange"
      />

      {/* Content */}
      <main className="container mx-auto px-4 pt-4 max-w-2xl">
        <GoalsTab />
      </main>
    </div>
  );
}

export default Goals;
