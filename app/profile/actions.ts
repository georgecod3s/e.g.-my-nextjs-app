"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return;
    }

    const firstName = formData.get("first_name") as string;
    const lastName = formData.get("last_name") as string;

    const { error } = await supabase
        .from("profiles")
        .update({
            first_name: firstName,
            last_name: lastName,
        })
        .eq("id", user.id);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/profile");
}

export async function uploadAvatar(formData: FormData) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return;
    }

    const file = formData.get("avatar") as File;

    if (!file || file.size === 0) {
        return;
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

    if (uploadError) {
        throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

    const { error: updateError } = await supabase
        .from("profiles")
        .update({
            avatar_url: data.publicUrl,
        })
        .eq("id", user.id);

    if (updateError) {
        throw new Error(updateError.message);
    }

    revalidatePath("/profile");
}