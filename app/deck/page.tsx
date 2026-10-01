import { createClient } from "@/utils/supabase/server";
import { getCaptionCards, getMyVotedIds, shuffle } from "@/lib/feed";
import Deck from "./Deck";

export const dynamic = "force-dynamic";

export default async function DeckPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const cards = await getCaptionCards(supabase);
    const voted = user ? await getMyVotedIds(supabase) : new Set<string>();

    // Unvoted first, then shuffle so the same image's captions don't all appear back to back
    const queue = shuffle(cards.filter((c) => !voted.has(c.id)));

    const top = [...cards].sort((a, b) => b.score - a.score).slice(0, 3);

    return (
        <main className="relative flex flex-1 flex-col items-center px-4 pb-16 pt-6">
            <div className="mb-6 text-center">
                <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
                    <span className="text-gradient">Swipe the funny.</span>
                </h1>
                <p className="mt-2 text-sm text-white/60">
                    Drag right if it made you laugh, left if it didn&apos;t. Arrow keys work too.
                </p>
            </div>

            <Deck
                initialCards={queue}
                signedIn={!!user}
                totalCount={cards.length}
                alreadyVoted={voted.size}
                top={top}
            />
        </main>
    );
}
