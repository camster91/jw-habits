/**
 * Recovery layout adapted from the accepted release-branch implementation.
 * The retired website/PWA update controls are deliberately not restored.
 */
export default function RecoveryShell({ children }) {
  return (
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
}
