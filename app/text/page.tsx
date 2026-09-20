import { Metadata } from "next";
import { CategoryPageClient } from "@/components/pages/CategoryPageClient";
export const metadata: Metadata = { title: "Text Tools", description: "Free text tools — word counter, character counter, case converter, sort lines and more." };
export default function Page() { return <CategoryPageClient category="Text" />; }
