export default function DashboardLoading() {
  return (
    <main
      className="min-h-screen bg-gray-50 p-6 md:p-8"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div className="mx-auto max-w-7xl">
        <div className="h-9 w-48 animate-pulse rounded bg-gray-200" />

        <div className="mt-2 h-5 w-64 animate-pulse rounded bg-gray-200" />

        <section className="mt-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-lg bg-white shadow"
              />
            ))}
          </div>
        </section>

        <div className="mt-8 h-64 animate-pulse rounded-lg bg-white shadow" />
      </div>
    </main>
  );
}