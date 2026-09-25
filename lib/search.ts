import type { Tool } from './types';
import { TOOLS_DEDUPED } from './registry';

export interface SearchResult {
  tool: Tool;
  score: number;
}

function scoreMatch(tool: Tool, q: string): number {
  const query = q.toLowerCase().trim();
  if (!query) return 0;

  const name = tool.name.toLowerCase();
  const desc = tool.description.toLowerCase();
  const keywords = tool.keywords.map(k => k.toLowerCase());
  const slug = tool.slug.toLowerCase();

  // Exact name match
  if (name === query) return 100;
  // Name starts with query
  if (name.startsWith(query)) return 85;
  // Slug contains query
  if (slug.includes(query)) return 75;
  // Name contains all words in query
  const words = query.split(/\s+/);
  if (words.every(w => name.includes(w))) return 70;
  // Any keyword exact match
  if (keywords.some(k => k === query)) return 65;
  // Any keyword starts with query
  if (keywords.some(k => k.startsWith(query))) return 55;
  // Any keyword contains query
  if (keywords.some(k => k.includes(query))) return 45;
  // Name contains any query word
  if (words.some(w => name.includes(w))) return 35;
  // Description contains query
  if (desc.includes(query)) return 25;
  // Description contains any query word
  if (words.some(w => desc.includes(w))) return 15;

  return 0;
}

export function searchTools(query: string, limit = 8): SearchResult[] {
  if (!query.trim()) return [];
  return TOOLS_DEDUPED
    .filter(tool => !tool.hidden)
    .map(tool => ({ tool, score: scoreMatch(tool, query) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
    .slice(0, limit);
}

export function getSuggestions(query: string, limit = 5): string[] {
  return searchTools(query, limit).map(r => r.tool.name);
}
