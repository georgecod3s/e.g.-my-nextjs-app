import { createClient } from "@/utils/supabase/server";
import { describeImage, writeCaptions } from "@/lib/gemini";

export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;

// Streams newline-delimited JSON so the UI can animate each step of the chain:
//   {step:"uploading"} -> {step:"describing", imageUrl} -> {step:"captioning", description}
//   -> {step:"done", imageId, captions:[{id,content}]}   or   {step:"error", message}
export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return Response.json({ error: "You must be signed in." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File) || file.size === 0) {
        return Response.json({ error: "No image uploaded." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
        return Response.json({ error: "That file is not an image." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
        return Response.json({ error: "Image is too large (4 MB max)." }, { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: object) =>
                controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

            try {
                // 1. Store the file in Supabase Storage (never in the database)
                send({ step: "uploading" });
                const bytes = Buffer.from(await file.arrayBuffer());
                const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
                const storagePath = `${user.id}/${Date.now()}.${ext}`;

                const { error: uploadError } = await supabase.storage
                    .from("caption-images")
                    .upload(storagePath, bytes, { contentType: file.type });
                if (uploadError) throw new Error(uploadError.message);

                const {
                    data: { publicUrl },
                } = supabase.storage.from("caption-images").getPublicUrl(storagePath);

                // 2. LLM call #1: image -> description
                send({ step: "describing", imageUrl: publicUrl });
                const description = await describeImage(bytes.toString("base64"), file.type);

                // 3. LLM call #2: description -> captions
                send({ step: "captioning", description });
                const captionTexts = await writeCaptions(description);
                if (captionTexts.length === 0) throw new Error("No captions came back. Try again!");

                // 4. Save image + captions
                const { data: image, error: imageError } = await supabase
                    .from("images")
                    .insert({
                        user_id: user.id,
                        storage_path: storagePath,
                        image_url: publicUrl,
                        description,
                    })
                    .select("id")
                    .single();
                if (imageError) throw new Error(imageError.message);

                const { data: captions, error: captionError } = await supabase
                    .from("captions")
                    .insert(
                        captionTexts.map((content) => ({
                            image_id: image.id,
                            user_id: user.id,
                            content,
                        })),
                    )
                    .select("id, content");
                if (captionError) throw new Error(captionError.message);

                send({ step: "done", imageId: image.id, captions });
            } catch (err) {
                send({
                    step: "error",
                    message: err instanceof Error ? err.message : "Something went wrong.",
                });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });
}
