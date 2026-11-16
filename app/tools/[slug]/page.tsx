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

  const url = `https://whysogood.space/tools/${slug}/`;
  const title = `${tool.name} — Free Online Tool | whysogood`;
  const description = `${tool.description} 100% free, private, and running locally in your browser with zero uploads.`;

  return {
    title,
    description,
    keywords: tool.keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'whysogood',
      type: 'website',
      images: [
        {
          url: 'https://whysogood.space/icon-512.png',
          width: 512,
          height: 512,
          alt: tool.name,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  const tool = TOOL_MAP[slug];
  if (!tool) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.name,
    url: `https://whysogood.space/tools/${slug}/`,
    description: tool.description,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ToolPageClient slug={slug} />
    </>
  );
}
