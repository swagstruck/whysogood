import { Metadata } from "next";
import { CategoryPageClient } from "@/components/pages/CategoryPageClient";
export const metadata: Metadata = { title: "Data Tools", description: "Free data processing tools — convert CSV, JSON, XML, YAML. All in your browser." };
export default function Page() { return <CategoryPageClient category="Data" />; }
