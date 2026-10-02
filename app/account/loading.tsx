// Skeleton loaders, never blank screens (brief A5).
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 py-8" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-9 w-2/3" />
      <div className="skeleton h-28 w-full" />
      <div className="skeleton h-28 w-full" />
      <div className="skeleton h-12 w-full rounded-full" />
    </div>
  );
}
