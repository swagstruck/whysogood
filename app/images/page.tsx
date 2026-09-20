import { Metadata } from 'next';
import { CategoryPageClient } from '@/components/pages/CategoryPageClient';
export const metadata: Metadata = { title: 'Image Tools', description: 'Free online image tools — compress, resize, convert, crop, rotate and more. All run in your browser.' };
export default function Page() { return <CategoryPageClient category="Images" />; }
