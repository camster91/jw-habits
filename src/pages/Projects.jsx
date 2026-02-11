import { FolderKanban } from 'lucide-react';
import ProjectsTab from '../components/ProjectsTab';

function Projects() {
  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <header
        className="relative bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-300/10 rounded-full blur-3xl" />
        </div>
        <div className="relative px-4 pt-6 pb-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-sm">
                <FolderKanban className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Projects</h1>
                <p className="text-white/70 text-sm">Manage your spiritual projects</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 pt-4 max-w-2xl">
        <ProjectsTab />
      </main>
    </div>
  );
}

export default Projects;
