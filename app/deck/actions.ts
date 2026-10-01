"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type VoteResult =
    | { ok: true }
    | { ok: false; reason: "signed-out" | "already-voted" | "error"; message?: string };

// Inserts ONE new row into caption_votes for the signed-in user.
export async function voteOnCaption(captionId: string, vote: 1 | -1): Promise<VoteResult> {
    if (vote !== 1 && vote !== -1) {
        return { ok: false, reason: "error", message: "Invalid vote" };
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { ok: false, reason: "signed-out" };
    }

    const { error } = await supabase.from("caption_votes").insert({
        caption_id: captionId,
        user_id: user.id,
        vote,
    });

    if (error) {
        // 23505 = unique violation -> this user already voted on this caption
        if (error.code === "23505") {
            return { ok: false, reason: "already-voted" };
        }
        return { ok: false, reason: "error", message: error.message };
    }

    revalidatePath("/leaderboard");
    return { ok: true };
}
