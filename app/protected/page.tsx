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
        <main className="flex min-h-screen items-center justify-center">
            <div>
                <h1 className="text-3xl font-bold">Protected Page</h1>
                <p className="mt-4">
                    You are logged in as {user.email}
                </p>
            </div>
        </main>
    );
}