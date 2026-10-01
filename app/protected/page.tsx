import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <main className="flex flex-1 items-center justify-center px-4 py-12">
            <div className="glass rounded-3xl p-8 text-center">
                <h1 className="text-3xl font-bold">Protected Page</h1>
                <p className="mt-4">
                    You are logged in as {user.email}
                </p>
                <div className="mt-6 flex justify-center gap-3">
                    <Link href="/upload" className="rounded-2xl bg-white px-5 py-2.5 font-bold text-black">Upload a photo</Link>
                    <Link href="/deck" className="rounded-2xl border border-white/20 px-5 py-2.5 font-bold">Rate captions</Link>
                </div>
            </div>
        </main>
    );
}