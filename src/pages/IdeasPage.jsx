import { useTranslation } from 'react-i18next';
import GoalsTab from '../components/GoalsTab';
import { Target } from 'lucide-react';

function IdeasPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <h1 className="ios-large-title"><Target className="w-6 h-6 inline mr-2 text-primary/70" aria-hidden="true" />
        {t("goals.ideas")}
        <span className="sub">{t("goals.browseIdeas")}</span>
      </h1>

      <main className="container mx-auto px-4 pt-4 max-w-2xl">
        <GoalsTab />
      </main>
    </div>
  );
}

export default IdeasPage;
