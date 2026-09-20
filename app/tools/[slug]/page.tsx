import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TOOL_MAP, TOOLS } from '@/lib/registry';
import { ToolPageClient } from './ToolPageClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return TOOLS.map(t => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tool = TOOL_MAP[slug];
  if (!tool) return { title: 'Tool Not Found' };
  return {
    title: tool.name,
    description: tool.description,
    keywords: tool.keywords,
  };
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  const tool = TOOL_MAP[slug];
  if (!tool) notFound();
  return <ToolPageClient slug={slug} />;
}
