import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { updateProfile } from "./actions";

export default async function ProfilePage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

    return (
        <main className="flex min-h-screen items-center justify-center">
            <div className="w-full max-w-md">
                <h1 className="text-3xl font-bold">Profile</h1>

                <p className="mt-4">
                    Signed in as {user.email}
                </p>

                <form action={updateProfile} className="mt-6 space-y-4">
                    <div>
                        <label
                            htmlFor="first_name"
                            className="block font-semibold"
                        >
                            First Name
                        </label>

                        <input
                            id="first_name"
                            name="first_name"
                            type="text"
                            defaultValue={profile?.first_name ?? ""}
                            className="mt-1 w-full rounded border p-2"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="last_name"
                            className="block font-semibold"
                        >
                            Last Name
                        </label>

                        <input
                            id="last_name"
                            name="last_name"
                            type="text"
                            defaultValue={profile?.last_name ?? ""}
                            className="mt-1 w-full rounded border p-2"
                        />
                    </div>

                    <button
                        type="submit"
                        className="rounded bg-black px-4 py-2 text-white"
                    >
                        Save Profile
                    </button>
                </form>
            </div>
        </main>
    );
}