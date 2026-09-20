import { Metadata } from "next";
import { CategoryPageClient } from "@/components/pages/CategoryPageClient";
export const metadata: Metadata = { title: "PDF Tools", description: "Free online PDF tools — merge, split, compress, convert and more. All run in your browser." };
export default function Page() { return <CategoryPageClient category="PDF" />; }
