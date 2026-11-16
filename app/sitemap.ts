import type { MetadataRoute } from 'next';
import { TOOLS } from '@/lib/registry';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://whysogood.space';

  const categories = [
    'images',
    'pdf',
    'developer',
    'data',
    'text',
    'calculators',
    'design',
    'audio',
    'generators',
    'security',
    'files',
  ];

  const categoryEntries: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/${cat}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const toolEntries: MetadataRoute.Sitemap = TOOLS.filter((tool) => !tool.hidden).map((tool) => ({
    url: `${baseUrl}/tools/${tool.slug}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...categoryEntries,
    ...toolEntries,
  ];
}
