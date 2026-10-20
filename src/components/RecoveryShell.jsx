import { isWeb } from '../utils/native.js';
import { PWAProvider } from './PWAProvider.jsx';
import UpdatePrompt from './UpdatePrompt.jsx';

/**
 * Full-screen recovery layout. The normal App never mounts in these states,
 * so the web update action stays reachable here.
 */
export default function RecoveryShell({ children }) {
  const content = (
    <main
      className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-5 text-base-content"
      style={{
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
      }}
    >
      {children}
    </main>
  );
  return isWeb ? (
    <PWAProvider>
      <UpdatePrompt />
      {content}
    </PWAProvider>
  ) : (
    content
  );
}
