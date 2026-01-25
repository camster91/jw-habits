/**
 * Skeleton loading components for better UX
 */

// Basic skeleton pulse animation
export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse bg-base-300 rounded ${className}`}
      {...props}
    />
  );
}

// Card skeleton
export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-3"
            style={{ width: `${Math.random() * 40 + 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// List item skeleton
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// News card skeleton
export function NewsCardSkeleton() {
  return (
    <div className="flex gap-3 p-3">
      <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

// Daily tasks section skeleton
export function DailyTasksSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <CardSkeleton key={i} lines={2} />
      ))}
    </div>
  );
}

// Tab content skeleton
export function TabContentSkeleton() {
  return (
    <div className="space-y-4">
      <CardSkeleton lines={4} />
      <CardSkeleton lines={3} />
    </div>
  );
}

// Full page loading skeleton
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header skeleton */}
      <div className="bg-primary p-4">
        <Skeleton className="h-6 w-32 bg-primary-content/20" />
        <Skeleton className="h-3 w-40 mt-1 bg-primary-content/20" />
      </div>

      {/* Content skeleton */}
      <div className="container mx-auto px-4 py-4 space-y-4 max-w-2xl">
        <Skeleton className="h-4 w-24" />
        <DailyTasksSkeleton />
        <Skeleton className="h-10 w-full rounded-lg" />
        <TabContentSkeleton />
      </div>
    </div>
  );
}

export default Skeleton;
