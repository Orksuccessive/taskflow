"use client";

export default function TasksError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <section
        role="alert"
        className="max-w-md rounded-lg border bg-white p-6 text-center shadow"
      >
        <h1 className="text-xl font-semibold">
          Unable to load tasks
        </h1>

        <p className="mt-2 text-gray-600">
          Something went wrong while loading your
          tasks.
        </p>

        <button
          type="button"
          onClick={() => reset()}
          className="mt-5 rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
        >
          Try again
        </button>
      </section>
    </main>
  );
}