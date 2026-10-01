import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Uploader from "./Uploader";

export default async function UploadPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-6">
            <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-fuchsia-300">The Joke Machine</p>
                <h1 className="font-display mt-2 text-5xl font-black sm:text-6xl">
                    <span className="text-gradient">Feed it a photo.</span>
                </h1>
                <p className="mx-auto mt-3 max-w-xl text-white/60">
                    One AI looks at your picture and describes it. A second AI reads that description and
                    writes the jokes. Then the crowd decides who&apos;s funny.
                </p>
            </div>
            <Uploader />
        </main>
    );
}
