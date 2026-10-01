import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { updateProfile, uploadAvatar } from "./actions";

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
        .select("first_name, last_name, avatar_url")
        .eq("id", user.id)
        .single();

    return (
        <main className="flex min-h-screen items-center justify-center">
            <div className="w-full max-w-md">
                <h1 className="text-3xl font-bold">Profile</h1>

                {profile?.avatar_url && (
                    <img
                        src={profile.avatar_url}
                        alt="Profile photo"
                        className="mt-6 h-24 w-24 rounded-full object-cover"
                    />
                )}

                <p className="mt-4">
                    Signed in as {user.email}
                </p>

                {(!profile?.first_name || !profile?.last_name) && (
                    <div className="mt-4 rounded border border-yellow-400 bg-yellow-50 p-3 text-yellow-900">
                        Welcome! Please add your first and last name to finish setting up your profile.
                    </div>
                )}

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

                <form action={uploadAvatar} className="mt-8 space-y-4">
                    <div>
                        <label
                            htmlFor="avatar"
                            className="block font-semibold"
                        >
                            Profile Photo
                        </label>

                        <input
                            id="avatar"
                            name="avatar"
                            type="file"
                            accept="image/*"
                            className="mt-2 w-full"
                        />
                    </div>

                    <button
                        type="submit"
                        className="rounded bg-black px-4 py-2 text-white"
                    >
                        Upload Photo
                    </button>
                </form>
            </div>
        </main>
    );
}