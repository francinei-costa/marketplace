export function PageLoader() {
  return (
    <div
      className="mx-auto min-h-[45vh] max-w-300 px-5 py-10"
      role="status"
      aria-label="Carregando"
    >
      <div className="shimmer h-8 w-48 rounded" />
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="shimmer aspect-square rounded-lg" />
        <div className="shimmer aspect-square rounded-lg" />
        <div className="shimmer aspect-square rounded-lg" />
        <div className="shimmer aspect-square rounded-lg" />
      </div>
    </div>
  );
}
