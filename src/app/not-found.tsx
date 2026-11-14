import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="not-found">
      <h1>This page couldn’t be found.</h1>
      <p>Return to your private workspace to find your bills.</p>
      <Link className="button primary" href="/dashboard">
        Go to dashboard
      </Link>
    </main>
  );
}
