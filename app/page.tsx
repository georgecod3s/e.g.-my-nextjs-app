import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getCaptionCards } from "@/lib/feed";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let cards: Awaited<ReturnType<typeof getCaptionCards>> = [];
  try {
    cards = await getCaptionCards(supabase);
  } catch {
    cards = [];
  }

  // one caption per image for the marquee
  const seen = new Set<string>();
  const strip = cards.filter((c) => (seen.has(c.imageId) ? false : (seen.add(c.imageId), true))).slice(0, 12);

  return (
    <main className="flex flex-1 flex-col items-center overflow-hidden pb-20">
      <section className="flex flex-col items-center px-4 pt-16 text-center sm:pt-24">
        <span className="glass rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-fuchsia-200">
          Photo in · jokes out · crowd decides
        </span>
        <h1 className="font-display mt-6 max-w-4xl text-6xl font-black leading-[0.95] tracking-tight sm:text-8xl">
          Who&apos;s the <span className="text-gradient">funniest</span> AI in the room?
        </h1>
        <p className="mt-6 max-w-xl text-lg text-white/60">
          Upload any photo. One AI describes it, another writes the punchlines, and everyone swipes
          to crown the best caption.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/deck"
            className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-amber-400 px-8 py-4 text-lg font-black text-black shadow-lg shadow-fuchsia-500/30 transition hover:scale-105"
          >
            Start swiping
          </Link>
          <Link
            href={user ? "/upload" : "/login"}
            className="glass rounded-2xl px-8 py-4 text-lg font-bold transition hover:bg-white/10"
          >
            {user ? "Upload a photo" : "Sign in with Google"}
          </Link>
        </div>
        {user && <p className="mt-4 text-sm text-white/40">Signed in as {user.email}</p>}
      </section>

      {strip.length > 0 && (
        <section className="mt-20 w-full">
          <div className="marquee gap-5 px-4">
            {[...strip, ...strip].map((c, i) => (
              <div
                key={`${c.id}-${i}`}
                className="glass w-64 shrink-0 overflow-hidden rounded-3xl"
                style={{ transform: `rotate(${i % 2 ? 2 : -2}deg)` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                <p className="font-display p-4 text-base font-black leading-snug">&ldquo;{c.content}&rdquo;</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-20 grid w-full max-w-5xl gap-5 px-4 sm:grid-cols-3">
        {[
          { n: "01", t: "Upload", d: "Drop in a photo. It goes to storage, never into the database." },
          { n: "02", t: "Two-AI chain", d: "Gemini describes the image, then a second call turns that into jokes." },
          { n: "03", t: "Swipe to rate", d: "Right for LOL, left for MEH. Every swipe is saved as a vote." },
        ].map((s) => (
          <div key={s.n} className="glass rounded-3xl p-6">
            <span className="font-display text-4xl font-black text-gradient">{s.n}</span>
            <h3 className="font-display mt-3 text-xl font-black">{s.t}</h3>
            <p className="mt-2 text-sm text-white/60">{s.d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
