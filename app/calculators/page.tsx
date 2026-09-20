import { Metadata } from "next";
import { CategoryPageClient } from "@/components/pages/CategoryPageClient";
export const metadata: Metadata = { title: "Calculators", description: "Free online calculators — EMI, SIP, compound interest, BMI, GST and more." };
export default function Page() { return <CategoryPageClient category="Calculators" />; }
