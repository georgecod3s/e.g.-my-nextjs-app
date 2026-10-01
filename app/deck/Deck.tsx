"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { CaptionCard } from "@/lib/feed";
import { voteOnCaption } from "./actions";

const THRESHOLD = 110;

type Burst = { id: number; x: number; y: number; good: boolean };

export default function Deck({
    initialCards,
    signedIn,
    totalCount,
    alreadyVoted,
    top,
}: {
    initialCards: CaptionCard[];
    signedIn: boolean;
    totalCount: number;
    alreadyVoted: number;
    top: CaptionCard[];
}) {
    const [cards, setCards] = useState(initialCards);
    const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
    const [leaving, setLeaving] = useState<null | 1 | -1>(null);
    const [showLogin, setShowLogin] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [laughs, setLaughs] = useState(0);
    const [votesCast, setVotesCast] = useState(0);
    const [streak, setStreak] = useState(0);
    const [bursts, setBursts] = useState<Burst[]>([]);
    const [, startTransition] = useTransition();
    const start = useRef<{ x: number; y: number } | null>(null);

    const current = cards[0];

    const flash = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2200);
    };

    const commitVote = useCallback(
        (dir: 1 | -1) => {
            if (!current || leaving) return;

            if (!signedIn) {
                setDrag({ x: 0, y: 0, active: false });
                setShowLogin(true);
                return;
            }

            setLeaving(dir);
            setDrag((d) => ({ x: dir * 900, y: d.y + 60, active: false }));

            if (dir === 1) {
                const id = Date.now();
                setBursts((b) => [...b, { id, x: 0, y: 0, good: true }]);
                setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1100);
                setLaughs((n) => n + 1);
                setStreak((s) => s + 1);
            } else {
                setStreak(0);
            }
            setVotesCast((n) => n + 1);

            const captionId = current.id;
            startTransition(async () => {
                const res = await voteOnCaption(captionId, dir);
                if (!res.ok) {
                    if (res.reason === "signed-out") setShowLogin(true);
                    else if (res.reason === "already-voted") flash("You already rated that one");
                    else flash(res.message ?? "Vote failed. Try again.");
                }
            });

            setTimeout(() => {
                setCards((c) => c.slice(1));
                setDrag({ x: 0, y: 0, active: false });
                setLeaving(null);
            }, 320);
        },
        [current, leaving, signedIn],
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (showLogin) {
                if (e.key === "Escape") setShowLogin(false);
                return;
            }
            if (e.key === "ArrowRight") commitVote(1);
            if (e.key === "ArrowLeft") commitVote(-1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [commitVote, showLogin]);

    const onPointerDown = (e: React.PointerEvent) => {
        if (leaving) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, y: e.clientY };
        setDrag({ x: 0, y: 0, active: true });
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!start.current) return;
        setDrag({
            x: e.clientX - start.current.x,
            y: e.clientY - start.current.y,
            active: true,
        });
    };

    const onPointerUp = () => {
        if (!start.current) return;
        start.current = null;
        if (drag.x > THRESHOLD) commitVote(1);
        else if (drag.x < -THRESHOLD) commitVote(-1);
        else setDrag({ x: 0, y: 0, active: false });
    };

    const progress = Math.max(-1, Math.min(1, drag.x / THRESHOLD));

    return (
        <div className="flex w-full max-w-5xl flex-col items-center gap-10 lg:flex-row lg:items-start lg:justify-center">
            {/* ---------- the deck ---------- */}
            <div className="flex w-full max-w-sm flex-col items-center">
                <div className="mb-4 flex w-full justify-between text-xs font-semibold uppercase tracking-widest text-white/50">
                    <span>
                        {cards.length} left
                        {signedIn && alreadyVoted > 0 ? ` · ${alreadyVoted} rated before` : ""}
                    </span>
                    <span className={streak >= 3 ? "text-amber-300 animate-pulse" : ""}>
                        {streak >= 3 ? `${streak}x laugh streak!` : `${laughs} laughs`}
                    </span>
                </div>

                <div className="relative h-[520px] w-full select-none">
                    {cards.length === 0 && (
                        <EmptyState totalCount={totalCount} votesCast={votesCast} signedIn={signedIn} />
                    )}

                    {cards
                        .slice(0, 3)
                        .reverse()
                        .map((card, i, arr) => {
                            const depth = arr.length - 1 - i; // 0 = top card
                            const isTop = depth === 0;
                            const style: React.CSSProperties = isTop
                                ? {
                                      transform: `translate(${drag.x}px, ${drag.y * 0.4}px) rotate(${drag.x / 14}deg)`,
                                      transition: drag.active
                                          ? "none"
                                          : "transform 0.35s cubic-bezier(.2,.9,.3,1.3)",
                                      zIndex: 30,
                                  }
                                : {
                                      transform: `translateY(${depth * 14}px) scale(${1 - depth * 0.05})`,
                                      transition: "transform 0.35s ease",
                                      zIndex: 30 - depth,
                                      filter: `brightness(${1 - depth * 0.15})`,
                                  };

                            return (
                                <div
                                    key={card.id}
                                    className={`deck-card absolute inset-0 ${isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}`}
                                    style={style}
                                    onPointerDown={isTop ? onPointerDown : undefined}
                                    onPointerMove={isTop ? onPointerMove : undefined}
                                    onPointerUp={isTop ? onPointerUp : undefined}
                                    onPointerCancel={isTop ? onPointerUp : undefined}
                                >
                                    <CardFace card={card} />
                                    {isTop && (
                                        <>
                                            <div
                                                className="stamp stamp-lol"
                                                style={{ opacity: Math.max(0, progress) }}
                                            >
                                                LOL
                                            </div>
                                            <div
                                                className="stamp stamp-meh"
                                                style={{ opacity: Math.max(0, -progress) }}
                                            >
                                                MEH
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}

                    {bursts.map((b) => (
                        <Confetti key={b.id} />
                    ))}
                </div>

                {cards.length > 0 && (
                    <div className="mt-8 flex items-center gap-6">
                        <button
                            aria-label="Not funny"
                            onClick={() => commitVote(-1)}
                            className="vote-btn border-rose-400/40 text-rose-300 hover:bg-rose-500/20"
                        >
                            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                <path d="M6 6l12 12M18 6L6 18" />
                            </svg>
                        </button>
                        <span className="text-xs uppercase tracking-widest text-white/40">or swipe</span>
                        <button
                            aria-label="Funny"
                            onClick={() => commitVote(1)}
                            className="vote-btn border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/20"
                        >
                            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
                                <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.2 4.4 2.5.8-1.3 2.3-2.5 4.4-2.5 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" />
                            </svg>
                        </button>
                    </div>
                )}

                {!signedIn && cards.length > 0 && (
                    <p className="mt-4 text-center text-xs text-white/50">
                        Browsing as a guest.{" "}
                        <Link href="/login" className="font-semibold text-fuchsia-300 underline">
                            Sign in
                        </Link>{" "}
                        to vote.
                    </p>
                )}
            </div>

            {/* ---------- mini podium ---------- */}
            <aside className="glass w-full max-w-sm rounded-3xl p-5 lg:mt-10 lg:w-72">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-lg font-black">Top of the room</h2>
                    <Link href="/leaderboard" className="text-xs font-semibold text-fuchsia-300 hover:underline">
                        Full board →
                    </Link>
                </div>
                {top.length === 0 ? (
                    <p className="text-sm text-white/50">No votes yet. Be the first critic.</p>
                ) : (
                    <ol className="space-y-3">
                        {top.map((c, i) => (
                            <li key={c.id} className="flex items-center gap-3">
                                <span className="font-display w-5 text-center text-lg font-black text-amber-300">
                                    {i + 1}
                                </span>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={c.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                                <p className="line-clamp-2 flex-1 text-xs leading-snug text-white/80">{c.content}</p>
                                <span className="text-xs font-bold text-emerald-300">
                                    {c.score > 0 ? "+" : ""}
                                    {c.score}
                                </span>
                            </li>
                        ))}
                    </ol>
                )}
                <Link
                    href="/upload"
                    className="mt-5 block rounded-2xl bg-gradient-to-r from-fuchsia-500 to-amber-400 py-3 text-center text-sm font-bold text-black transition hover:scale-[1.02]"
                >
                    + Make new captions
                </Link>
            </aside>

            {/* ---------- sign-in gate ---------- */}
            {showLogin && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                    onClick={() => setShowLogin(false)}
                >
                    <div
                        className="glass pop-in w-full max-w-sm rounded-3xl p-8 text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="font-display text-5xl font-black text-gradient">Hold up!</div>
                        <p className="mt-3 text-white/70">
                            Only signed-in critics can rate captions. It takes two seconds with Google.
                        </p>
                        <Link
                            href="/login"
                            className="mt-6 block rounded-2xl bg-white py-3 font-bold text-black transition hover:scale-[1.02]"
                        >
                            Sign in with Google
                        </Link>
                        <button
                            onClick={() => setShowLogin(false)}
                            className="mt-3 text-sm text-white/50 hover:text-white"
                        >
                            Keep browsing
                        </button>
                    </div>
                </div>
            )}

            {toast && (
                <div className="pop-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black shadow-xl">
                    {toast}
                </div>
            )}
        </div>
    );
}

function CardFace({ card }: { card: CaptionCard }) {
    return (
        <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900 shadow-2xl shadow-fuchsia-900/30">
            <div className="relative min-h-0 flex-1 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={card.imageUrl}
                    alt={card.description ?? "Uploaded image"}
                    draggable={false}
                    className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                <span className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold backdrop-blur">
                    {card.score > 0 ? "+" : ""}
                    {card.score} pts
                </span>
            </div>
            <div className="px-6 pb-7 pt-2">
                <p className="font-display text-2xl font-black leading-tight">&ldquo;{card.content}&rdquo;</p>
            </div>
        </div>
    );
}

function EmptyState({
    totalCount,
    votesCast,
    signedIn,
}: {
    totalCount: number;
    votesCast: number;
    signedIn: boolean;
}) {
    return (
        <div className="glass pop-in flex h-full flex-col items-center justify-center rounded-[2rem] p-8 text-center">
            <div className="font-display text-6xl font-black text-gradient">
                {totalCount === 0 ? "Empty stage" : "All caught up"}
            </div>
            <p className="mt-4 text-white/70">
                {totalCount === 0
                    ? "No captions yet. Upload a photo and let the AI roast it."
                    : votesCast > 0
                      ? `You rated ${votesCast} caption${votesCast === 1 ? "" : "s"}. The crowd thanks you.`
                      : "You have rated every caption. Feed the machine a new photo."}
            </p>
            <Link
                href={signedIn ? "/upload" : "/login"}
                className="mt-6 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-amber-400 px-6 py-3 font-bold text-black transition hover:scale-105"
            >
                {signedIn ? "Upload a photo" : "Sign in to upload"}
            </Link>
            <Link href="/leaderboard" className="mt-3 text-sm text-white/60 underline">
                See the leaderboard
            </Link>
        </div>
    );
}

const CONFETTI_COLORS = ["#f0abfc", "#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#ffffff"];

function Confetti() {
    const [pieces] = useState(() =>
        Array.from({ length: 28 }, (_, i) => ({
            i,
            dx: (Math.random() - 0.3) * 520,
            dy: -Math.random() * 380 - 60,
            r: Math.random() * 720 - 360,
            c: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            d: Math.random() * 0.15,
        })),
    );
    return (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-40">
            {pieces.map((p) => (
                <span
                    key={p.i}
                    className="confetti"
                    style={
                        {
                            background: p.c,
                            "--dx": `${p.dx}px`,
                            "--dy": `${p.dy}px`,
                            "--r": `${p.r}deg`,
                            animationDelay: `${p.d}s`,
                        } as React.CSSProperties
                    }
                />
            ))}
        </div>
    );
}
