import { Metadata } from "next";
import { CategoryPageClient } from "@/components/pages/CategoryPageClient";
export const metadata: Metadata = { title: "Generators", description: "Free generators — QR code, password, UUID, lorem ipsum, placeholder image and more." };
export default function Page() { return <CategoryPageClient category="Generators" />; }
