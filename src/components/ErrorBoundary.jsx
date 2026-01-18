import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearAndReload = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
          <div className="card bg-base-100 shadow-xl max-w-md w-full">
            <div className="card-body text-center">
              <h2 className="card-title justify-center text-error">Something went wrong</h2>
              <p className="text-base-content/70 mt-2">
                The app encountered an unexpected error. You can try reloading the page.
              </p>
              <div className="card-actions justify-center mt-4 flex-col gap-2">
                <button
                  className="btn btn-primary w-full"
                  onClick={this.handleReload}
                >
                  Reload Page
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={this.handleClearAndReload}
                >
                  Clear Data & Reload
                </button>
              </div>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-base-content/50">
                    Error details
                  </summary>
                  <pre className="text-xs mt-2 p-2 bg-base-200 rounded overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
