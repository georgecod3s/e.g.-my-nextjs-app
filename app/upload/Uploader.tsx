"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Step = "idle" | "uploading" | "describing" | "captioning" | "done" | "error";

const STAGES: { key: Step; label: string; sub: string }[] = [
    { key: "uploading", label: "Upload", sub: "Saving to storage" },
    { key: "describing", label: "AI #1 looks", sub: "Image → description" },
    { key: "captioning", label: "AI #2 jokes", sub: "Description → captions" },
];

const ORDER: Step[] = ["idle", "uploading", "describing", "captioning", "done"];

// Shrink big phone photos in the browser so uploads stay fast and under the size limit.
async function shrinkImage(file: File, maxSide = 1600): Promise<Blob> {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return file;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85));
}

export default function Uploader() {
    const [step, setStep] = useState<Step>("idle");
    const [preview, setPreview] = useState<string | null>(null);
    const [description, setDescription] = useState("");
    const [typed, setTyped] = useState("");
    const [captions, setCaptions] = useState<{ id: string; content: string }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [hover, setHover] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // typewriter effect for the description
    useEffect(() => {
        if (!description) return;
        let i = 0;
        const t = setInterval(() => {
            i += 3;
            setTyped(description.slice(0, i));
            if (i >= description.length) clearInterval(t);
        }, 18);
        return () => clearInterval(t);
    }, [description]);

    const busy = step === "uploading" || step === "describing" || step === "captioning";

    const reset = () => {
        setStep("idle");
        setPreview(null);
        setDescription("");
        setTyped("");
        setCaptions([]);
        setError(null);
    };

    const run = async (file: File) => {
        if (busy) return;
        if (!file.type.startsWith("image/")) {
            setError("That's not an image file.");
            setStep("error");
            return;
        }
        reset();
        setPreview(URL.createObjectURL(file));
        setStep("uploading");

        try {
            const blob = await shrinkImage(file);
            const body = new FormData();
            body.append("image", new File([blob], "upload.jpg", { type: blob.type || "image/jpeg" }));

            const res = await fetch("/api/generate", { method: "POST", body });
            if (!res.ok || !res.body) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.error ?? `Upload failed (${res.status})`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                    if (!line.trim()) continue;
                    const ev = JSON.parse(line);
                    if (ev.step === "error") throw new Error(ev.message);
                    if (ev.step === "captioning") setDescription(ev.description);
                    if (ev.step === "done") setCaptions(ev.captions);
                    setStep(ev.step);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
            setStep("error");
        }
    };

    const reached = (s: Step) => ORDER.indexOf(step) > ORDER.indexOf(s);
    const activeNow = (s: Step) => step === s;

    return (
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
            {/* ---------- drop zone / preview ---------- */}
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    setHover(true);
                }}
                onDragLeave={() => setHover(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setHover(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) run(f);
                }}
                onClick={() => !busy && inputRef.current?.click()}
                className={`group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-[2rem] border-2 border-dashed transition ${
                    hover ? "scale-[1.02] border-fuchsia-400 bg-fuchsia-500/10" : "border-white/20 bg-white/5 hover:border-white/40"
                }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) run(f);
                        e.target.value = "";
                    }}
                />

                {preview ? (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="Your upload" className="h-full w-full object-cover" />
                        {busy && <div className="scan-line" />}
                        {busy && <div className="absolute inset-0 bg-fuchsia-900/20 mix-blend-overlay" />}
                    </>
                ) : (
                    <div className="p-8 text-center">
                        <div className="float-slow mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-500 to-amber-400 text-black">
                            <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="font-display mt-6 text-2xl font-black">Drop a photo here</p>
                        <p className="mt-1 text-sm text-white/50">or click to choose one</p>
                    </div>
                )}
            </div>

            {/* ---------- pipeline + results ---------- */}
            <div className="flex flex-col">
                <div className="glass rounded-3xl p-5">
                    <div className="flex items-center justify-between gap-2">
                        {STAGES.map((s, i) => (
                            <div key={s.key} className="flex flex-1 items-center">
                                <div className="flex flex-col items-center text-center">
                                    <div
                                        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black transition-all duration-500 ${
                                            reached(s.key)
                                                ? "bg-emerald-400 text-black"
                                                : activeNow(s.key)
                                                  ? "pulse-ring bg-fuchsia-500 text-white"
                                                  : "bg-white/10 text-white/40"
                                        }`}
                                    >
                                        {reached(s.key) ? "✓" : i + 1}
                                    </div>
                                    <span className="mt-2 text-xs font-bold">{s.label}</span>
                                    <span className="text-[10px] text-white/40">{s.sub}</span>
                                </div>
                                {i < STAGES.length - 1 && (
                                    <div className="relative mx-2 mb-8 h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                                        <div
                                            className={`absolute inset-y-0 left-0 bg-gradient-to-r from-fuchsia-500 to-amber-400 transition-all duration-700 ${
                                                reached(s.key) ? "w-full" : activeNow(s.key) ? "w-1/2 animate-pulse" : "w-0"
                                            }`}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {typed && (
                    <div className="glass pop-in mt-5 rounded-3xl p-5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-fuchsia-300">
                            What AI #1 saw
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/80">
                            {typed}
                            {typed.length < description.length && <span className="caret">▍</span>}
                        </p>
                    </div>
                )}

                {step === "captioning" && (
                    <div className="mt-5 space-y-3">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="shimmer h-14 rounded-2xl" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                    </div>
                )}

                {captions.length > 0 && (
                    <div className="mt-5 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300">
                            What AI #2 wrote
                        </p>
                        {captions.map((c, i) => (
                            <div
                                key={c.id}
                                className="pop-in rounded-2xl border border-white/10 bg-white/5 p-4 font-display text-lg font-black leading-snug"
                                style={{ animationDelay: `${i * 0.12}s` }}
                            >
                                &ldquo;{c.content}&rdquo;
                            </div>
                        ))}
                        <div className="flex gap-3 pt-2">
                            <Link
                                href="/deck"
                                className="flex-1 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-amber-400 py-3 text-center font-bold text-black transition hover:scale-[1.02]"
                            >
                                Go rate them →
                            </Link>
                            <button
                                onClick={reset}
                                className="rounded-2xl border border-white/20 px-5 py-3 font-bold transition hover:bg-white/10"
                            >
                                Another
                            </button>
                        </div>
                    </div>
                )}

                {step === "error" && (
                    <div className="pop-in mt-5 rounded-3xl border border-rose-400/40 bg-rose-500/10 p-5">
                        <p className="font-bold text-rose-200">The joke machine jammed.</p>
                        <p className="mt-1 text-sm text-rose-100/80">{error}</p>
                        <button onClick={reset} className="mt-3 text-sm font-bold underline">
                            Try again
                        </button>
                    </div>
                )}

                {step === "idle" && (
                    <p className="mt-5 text-sm text-white/40">
                        Tip: faces, pets, and awkward situations make the best material.
                    </p>
                )}
            </div>
        </div>
    );
}
