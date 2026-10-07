import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, Trash2 } from 'lucide-react';
import i18n from 'i18next';
import { recoveryCopy, resetCurrentStore, refreshAppShell } from '../utils/recovery.js';
import { saveBackup, isShareCancel } from '../utils/backup.js';
import { recordDiagnostic } from '../utils/diagnostics.js';

/**
 * Error Boundary component to catch JavaScript errors in child components.
 * Prevents entire app crashes and shows user-friendly error UI.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryStatus: '',
      acceptReset: false,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    this.setState({ errorInfo });

    // Log to error tracking
    this.logError(error, errorInfo);
  }

  logError() {
    recordDiagnostic('component');
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleClearAndReload = async () => {
    try {
      await refreshAppShell();
      this.handleReload();
    } catch {
      this.setState({ recoveryStatus: i18n.t('fd.recovery.refreshFailed') });
    }
  };

  handleBackup = async () => {
    try {
      const raw = await recoveryCopy();
      if (raw === null) {
        this.setState({ recoveryStatus: i18n.t('fd.recovery.noCopy') });
        return;
      }
      await saveBackup(raw, `faithful-days-recovery-${Date.now()}.json`, 'Faithful Days');
      this.setState({ recoveryStatus: i18n.t('fd.recovery.copyOffered') });
    } catch (error) {
      this.setState({
        recoveryStatus: i18n.t(
          isShareCancel(error) ? 'fd.recovery.copyCancelled' : 'fd.recovery.copyFailed'
        ),
      });
    }
  };

  handleClearAllAndReload = async () => {
    if (!this.state.acceptReset || !window.confirm(i18n.t('fd.recovery.resetConfirm'))) return;
    try {
      await resetCurrentStore(i18n.resolvedLanguage || 'en');
      this.handleReload();
    } catch {
      this.setState({ recoveryStatus: i18n.t('fd.recovery.resetFailed') });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen bg-base-200 flex items-center justify-center p-4"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="card bg-base-100 shadow-xl max-w-md w-full">
            <div className="card-body text-center">
              {/* Error Icon */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-error" />
              </div>

              {/* Error Title */}
              <h2 className="text-xl font-bold text-base-content">Something went wrong</h2>

              {/* Error Description */}
              <p className="text-sm text-base-content/70 mt-2">
                {i18n.t('fd.recovery.explanation')}
              </p>

              {/* Error Details (Development Only) */}
              {import.meta.env.DEV && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-error">
                    Error Details
                  </summary>
                  <pre className="mt-2 p-3 bg-base-200 rounded-lg text-xs overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-6">
                <button onClick={this.handleReload} className="btn btn-primary gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>

                <button onClick={this.handleGoHome} className="btn btn-outline gap-2">
                  <Home className="w-4 h-4" />
                  Go to Home
                </button>

                <button
                  onClick={this.handleClearAndReload}
                  className="btn btn-ghost btn-sm text-base-content/70"
                >
                  {i18n.t('fd.recovery.refresh')}
                </button>

                <button
                  type="button"
                  className="btn btn-outline min-h-11"
                  onClick={this.handleBackup}
                >
                  {i18n.t('fd.recovery.copy')}
                </button>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={this.state.acceptReset}
                    onChange={(event) => this.setState({ acceptReset: event.target.checked })}
                  />
                  {i18n.t('fd.recovery.acceptReset')}
                </label>
                <p role="status">{this.state.recoveryStatus}</p>
                <button
                  onClick={this.handleClearAllAndReload}
                  disabled={!this.state.acceptReset}
                  className="btn btn-ghost btn-xs text-error/60 gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  {i18n.t('fd.recovery.reset')}
                </button>
              </div>

              {/* Support Message */}
              <p className="text-xs text-base-content/70 mt-4">
                {i18n.t('fd.recovery.support')}{' '}
                <a href="https://jwhabits.ashbi.ca/support/" className="underline">
                  {i18n.t('fd.settings.about.support')}
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
