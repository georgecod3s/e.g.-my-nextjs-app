import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function Nav() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    let avatar: string | null = null;
    if (user) {
        const { data } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", user.id)
            .maybeSingle();
        avatar = data?.avatar_url ?? null;
    }

    const links = [
        { href: "/deck", label: "Rate" },
        { href: "/upload", label: "Upload" },
        { href: "/leaderboard", label: "Leaderboard" },
        { href: "/humor", label: "Humor" },
    ];

    return (
        <header className="sticky top-0 z-40 w-full px-4 pt-4">
            <nav className="glass mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-2xl px-4 py-2.5">
                <Link href="/" className="font-display shrink-0 text-lg font-black tracking-tight">
                    <span className="text-gradient">Caption</span>Clash
                </Link>
                <div className="flex items-center gap-1 overflow-x-auto text-sm font-semibold">
                    {links.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className="rounded-xl px-3 py-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                            {l.label}
                        </Link>
                    ))}
                    {user ? (
                        <Link href="/profile" className="ml-1 shrink-0" title="Profile">
                            {avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatar} alt="Profile" className="h-8 w-8 rounded-full object-cover ring-2 ring-fuchsia-400" />
                            ) : (
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-amber-400 text-xs font-black text-black">
                                    {(user.email ?? "?")[0].toUpperCase()}
                                </span>
                            )}
                        </Link>
                    ) : (
                        <Link
                            href="/login"
                            className="ml-1 shrink-0 rounded-xl bg-white px-3 py-1.5 text-black transition hover:scale-105"
                        >
                            Sign in
                        </Link>
                    )}
                </div>
            </nav>
        </header>
    );
}
