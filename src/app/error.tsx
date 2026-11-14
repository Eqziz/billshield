"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="not-found">
      <h1>We couldn’t open this page.</h1>
      <p>
        Please retry. If this continues, check the database connection and
        application configuration.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
