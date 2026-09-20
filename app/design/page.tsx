import { Metadata } from "next";
import { CategoryPageClient } from "@/components/pages/CategoryPageClient";
export const metadata: Metadata = { title: "Design Tools", description: "Free design tools — color picker, gradient generator, CSS shadow, favicon generator and more." };
export default function Page() { return <CategoryPageClient category="Design" />; }
