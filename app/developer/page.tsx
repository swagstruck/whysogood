import { Metadata } from "next";
import { CategoryPageClient } from "@/components/pages/CategoryPageClient";
export const metadata: Metadata = { title: "Developer Tools", description: "Free developer tools — JSON formatter, regex tester, base64 encoder, hash generator and more." };
export default function Page() { return <CategoryPageClient category="Developer" />; }
