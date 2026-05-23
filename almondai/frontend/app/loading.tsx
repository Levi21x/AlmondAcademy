export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-almond-bg px-4 py-6 md:px-6 md:py-8">
      <span
        aria-hidden="true"
        className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-almond-primary/30 border-t-almond-primary"
      />
      <p className="mt-4 text-sm font-medium text-almond-text-secondary">AlmondAI</p>
    </main>
  );
}
