import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, Trash2 } from 'lucide-react';

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

  logError(error, errorInfo) {
    // Store error in localStorage for debugging
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: error?.message || 'Unknown error',
      stack: error?.stack || '',
      componentStack: errorInfo?.componentStack || '',
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    try {
      const existingLogs = JSON.parse(localStorage.getItem('jw-error-logs') || '[]');
      existingLogs.push(errorLog);
      // Keep only the last 10 errors
      const recentLogs = existingLogs.slice(-10);
      localStorage.setItem('jw-error-logs', JSON.stringify(recentLogs));
    } catch {
      // Ignore storage errors
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleClearAndReload = async () => {
    try {
      // Clear service worker caches (but not localStorage to preserve user data)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      }

      // Reload the page
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  handleClearAllAndReload = () => {
    if (window.confirm('This will clear all app data including your progress. Continue?')) {
      localStorage.clear();
      this.handleClearAndReload();
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
                The app encountered an unexpected error. Your data is safe, and you can try
                reloading the page.
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
                  Clear cache and reload
                </button>

                <button
                  onClick={this.handleClearAllAndReload}
                  className="btn btn-ghost btn-xs text-error/60 gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear all data & reload
                </button>
              </div>

              {/* Support Message */}
              <p className="text-xs text-base-content/70 mt-4">
                If this problem persists, try clearing your browser cache or reinstalling the app.
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
