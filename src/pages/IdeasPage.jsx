import { useTranslation } from 'react-i18next';
import GoalsTab from '../components/GoalsTab';
import PageHeader from '../components/PageHeader';
import { Target } from 'lucide-react';

function IdeasPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <PageHeader
        title={t('goals.ideas')}
        subtitle={t('goals.browseIdeas')}
        icon={Target}
        gradient="from-primary via-primary to-blue-700"
        blurColor="orange"
      />

      <main className="container mx-auto px-4 pt-4 max-w-2xl">
        <GoalsTab />
      </main>
    </div>
  );
}

export default IdeasPage;
