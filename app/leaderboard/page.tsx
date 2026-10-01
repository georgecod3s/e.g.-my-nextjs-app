import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getCaptionCards } from "@/lib/feed";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
    const supabase = await createClient();
    const cards = await getCaptionCards(supabase);
    const ranked = [...cards]
        .filter((c) => c.upvotes + c.downvotes > 0)
        .sort((a, b) => b.score - a.score || b.upvotes - a.upvotes)
        .slice(0, 20);

    const [first, second, third, ...rest] = ranked;

    return (
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-6">
            <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">Hall of Fame</p>
                <h1 className="font-display mt-2 text-5xl font-black sm:text-6xl">
                    <span className="text-gradient">The Leaderboard</span>
                </h1>
                <p className="mt-3 text-white/60">The captions the crowd swiped right on the most.</p>
            </div>

            {ranked.length === 0 ? (
                <div className="glass mx-auto mt-12 max-w-md rounded-3xl p-10 text-center">
                    <p className="text-white/70">No votes yet. Go start the show.</p>
                    <Link
                        href="/deck"
                        className="mt-6 inline-block rounded-2xl bg-gradient-to-r from-fuchsia-500 to-amber-400 px-6 py-3 font-bold text-black"
                    >
                        Open the deck
                    </Link>
                </div>
            ) : (
                <>
                    {/* podium */}
                    <div className="mt-14 grid grid-cols-1 items-end gap-6 sm:grid-cols-3">
                        {[second, first, third].map((c, idx) => {
                            if (!c) return <div key={idx} className="hidden sm:block" />;
                            const place = idx === 1 ? 1 : idx === 0 ? 2 : 3;
                            const height = place === 1 ? "sm:h-44" : place === 2 ? "sm:h-32" : "sm:h-24";
                            const medal =
                                place === 1
                                    ? "from-amber-300 to-yellow-500"
                                    : place === 2
                                      ? "from-zinc-200 to-zinc-400"
                                      : "from-orange-300 to-orange-600";
                            return (
                                <div
                                    key={c.id}
                                    className={`float-slow flex flex-col items-center ${place === 1 ? "order-first sm:order-none" : ""}`}
                                    style={{ animationDelay: `${place * 0.4}s` }}
                                >
                                    <div className="glass w-full overflow-hidden rounded-3xl">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={c.imageUrl} alt="" className="aspect-square w-full object-cover" />
                                        <p className="font-display p-4 text-lg font-black leading-tight">
                                            &ldquo;{c.content}&rdquo;
                                        </p>
                                        <div className="flex justify-between px-4 pb-4 text-xs font-bold">
                                            <span className="text-emerald-300">▲ {c.upvotes}</span>
                                            <span className="text-rose-300">▼ {c.downvotes}</span>
                                        </div>
                                    </div>
                                    <div
                                        className={`mt-3 flex h-16 w-full items-center justify-center rounded-t-2xl bg-gradient-to-b ${medal} ${height} font-display text-4xl font-black text-black`}
                                    >
                                        {place}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {rest.length > 0 && (
                        <ol className="mt-12 space-y-3">
                            {rest.map((c, i) => (
                                <li key={c.id} className="glass flex items-center gap-4 rounded-2xl p-3">
                                    <span className="font-display w-8 text-center text-xl font-black text-white/40">
                                        {i + 4}
                                    </span>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={c.imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
                                    <p className="flex-1 text-sm">{c.content}</p>
                                    <span className="text-sm font-bold text-emerald-300">
                                        {c.score > 0 ? "+" : ""}
                                        {c.score}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}
                </>
            )}
        </main>
    );
}
