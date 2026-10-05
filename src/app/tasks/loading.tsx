export default function TasksLoading() {
  return (
    <main
      className="min-h-screen bg-gray-50 p-6 md:p-8"
      aria-busy="true"
      aria-label="Loading tasks"
    >
      <div className="mx-auto max-w-7xl">
        <div className="h-9 w-40 animate-pulse rounded bg-gray-200" />

        <div className="mt-8 h-40 animate-pulse rounded-lg bg-white shadow" />

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((column) => (
            <div
              key={column}
              className="min-h-96 animate-pulse rounded-lg bg-white shadow"
            />
          ))}
        </div>
      </div>
    </main>
  );
}