import { supabase } from "@/lib/supabase";

export default async function HumorPage() {
    const { data: humor, error } = await supabase
        .from("humor class gdn2112")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        return <main className="p-8">Error loading humor: {error.message}</main>;
    }

    return (
        <main className="p-8">
            <h1 className="mb-6 text-3xl font-bold">Humor Class</h1>

            <div className="space-y-4">
                {humor?.map((item) => (
                    <div
                        key={item.id}
                        className="rounded-lg border border-gray-300 p-4"
                    >
                        <p>{item.humor}</p>
                    </div>
                ))}
            </div>
        </main>
    );
}