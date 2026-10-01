import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-24">
      <h1 className="text-4xl font-bold">Hello World</h1>
      {user ? (
        <p>Signed in as {user.email}</p>
      ) : (
        <p>You are not signed in.</p>
      )}
      <nav className="flex gap-4 underline">
        <Link href="/humor">Humor</Link>
        {user ? (
          <>
            <Link href="/profile">Profile</Link>
            <Link href="/protected">Protected Page</Link>
          </>
        ) : (
          <Link href="/login">Sign in with Google</Link>
        )}
      </nav>
    </main>
  );
}
