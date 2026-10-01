import type { SupabaseClient } from "@supabase/supabase-js";

export type CaptionCard = {
    id: string;
    content: string;
    createdAt: string;
    imageId: string;
    imageUrl: string;
    description: string | null;
    upvotes: number;
    downvotes: number;
    score: number;
};

type CaptionRow = {
    id: string;
    content: string;
    created_at: string;
    image: { id: string; image_url: string; description: string | null } | null;
};

type ScoreRow = { caption_id: string; upvotes: number; downvotes: number; score: number };

export async function getCaptionCards(supabase: SupabaseClient): Promise<CaptionCard[]> {
    const [{ data: captions, error }, { data: scores }] = await Promise.all([
        supabase
            .from("captions")
            .select("id, content, created_at, image:images(id, image_url, description)")
            .order("created_at", { ascending: false })
            .limit(300),
        supabase.rpc("caption_scores"),
    ]);

    if (error) {
        throw new Error(error.message);
    }

    const scoreMap = new Map<string, ScoreRow>();
    for (const s of (scores ?? []) as ScoreRow[]) {
        scoreMap.set(s.caption_id, s);
    }

    return ((captions ?? []) as unknown as CaptionRow[])
        .filter((c) => c.image)
        .map((c) => {
            const s = scoreMap.get(c.id);
            return {
                id: c.id,
                content: c.content,
                createdAt: c.created_at,
                imageId: c.image!.id,
                imageUrl: c.image!.image_url,
                description: c.image!.description,
                upvotes: Number(s?.upvotes ?? 0),
                downvotes: Number(s?.downvotes ?? 0),
                score: Number(s?.score ?? 0),
            };
        });
}

export async function getMyVotedIds(supabase: SupabaseClient): Promise<Set<string>> {
    const { data } = await supabase.from("caption_votes").select("caption_id");
    return new Set((data ?? []).map((v: { caption_id: string }) => v.caption_id));
}

export function shuffle<T>(items: T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}
