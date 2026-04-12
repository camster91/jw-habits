import { FolderKanban } from 'lucide-react';
import ProjectsTab from '../components/ProjectsTab';
import PageHeader from '../components/PageHeader';

function Projects() {
  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <PageHeader
        title="Projects"
        subtitle="Manage your spiritual projects"
        icon={FolderKanban}
        gradient="from-purple-500 via-purple-600 to-pink-600"
        blurColor="pink"
      />

      {/* Content */}
      <main className="container mx-auto px-4 pt-4 max-w-2xl">
        <ProjectsTab />
      </main>
    </div>
  );
}

export default Projects;
