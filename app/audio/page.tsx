import { Metadata } from "next";
import { CategoryPageClient } from "@/components/pages/CategoryPageClient";
export const metadata: Metadata = { title: "Audio Tools", description: "Free audio tools — MP3 trimmer, converter, merger and more. All in your browser." };
export default function Page() { return <CategoryPageClient category="Audio" />; }
