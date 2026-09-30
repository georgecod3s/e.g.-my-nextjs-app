"use client";

import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
    const supabase = createClient();

    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    return (
        <main className="min-h-screen flex items-center justify-center">
            <button
                onClick={signInWithGoogle}
                className="rounded-lg bg-black px-6 py-3 text-white"
            >
                Sign in with Google
            </button>
        </main>
    );
}