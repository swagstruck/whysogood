import { Metadata } from "next";
import { CategoryPageClient } from "@/components/pages/CategoryPageClient";
export const metadata: Metadata = { title: "Security & Encoding Tools", description: "Free security tools — base64 encoder, hash generator, JWT decoder, password strength checker." };
export default function Page() { return <CategoryPageClient category="Security" />; }
