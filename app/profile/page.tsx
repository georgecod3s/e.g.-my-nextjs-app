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
        <main className="flex flex-1 items-center justify-center px-4 py-12">
            <div className="glass w-full max-w-md rounded-3xl p-8">
                <h1 className="font-display text-4xl font-black"><span className="text-gradient">Profile</span></h1>

                {profile?.avatar_url && (
                    <img
                        src={profile.avatar_url}
                        alt="Profile photo"
                        className="mt-6 h-24 w-24 rounded-full object-cover ring-4 ring-fuchsia-400/60"
                    />
                )}

                <p className="mt-4">
                    Signed in as {user.email}
                </p>

                {(!profile?.first_name || !profile?.last_name) && (
                    <div className="mt-4 rounded border border-amber-400/50 bg-amber-400/10 p-3 text-amber-100">
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
                            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 p-2.5 outline-none focus:border-fuchsia-400"
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
                            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 p-2.5 outline-none focus:border-fuchsia-400"
                        />
                    </div>

                    <button
                        type="submit"
                        className="rounded-2xl bg-white px-5 py-2.5 font-bold text-black transition hover:scale-[1.02]"
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
                        className="rounded-2xl bg-white px-5 py-2.5 font-bold text-black transition hover:scale-[1.02]"
                    >
                        Upload Photo
                    </button>
                </form>
            </div>
        </main>
    );
}