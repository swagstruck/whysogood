import { Metadata } from "next";
import { CategoryPageClient } from "@/components/pages/CategoryPageClient";
export const metadata: Metadata = { title: "File Utilities", description: "Free file utilities — file hash, MIME checker, ZIP creator and more." };
export default function Page() { return <CategoryPageClient category="Files" />; }
