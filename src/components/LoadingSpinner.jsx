/**
 * Loading spinner component with various sizes and styles
 */

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    xs: 'loading-xs',
    sm: 'loading-sm',
    md: 'loading-md',
    lg: 'loading-lg',
  };

  return (
    <span
      className={`loading loading-spinner ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

// Full screen loading overlay
export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-base-200/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <LoadingSpinner size="lg" className="text-primary" />
        <p className="mt-3 text-base-content/70">{message}</p>
      </div>
    </div>
  );
}

// Inline loading with text
export function InlineLoading({ message = 'Loading...', size = 'sm' }) {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size={size} />
      <span className="text-sm text-base-content/70">{message}</span>
    </div>
  );
}

// Button loading state
export function ButtonLoading({ size = 'sm' }) {
  return <LoadingSpinner size={size} />;
}

// Card loading placeholder
export function CardLoading() {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body items-center justify-center py-8">
        <LoadingSpinner size="md" className="text-primary" />
        <p className="text-sm text-base-content/60 mt-2">Loading...</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;
