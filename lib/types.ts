export type Category =
  | 'Images'
  | 'PDF'
  | 'Developer'
  | 'Data'
  | 'Text'
  | 'Calculators'
  | 'Design'
  | 'Audio'
  | 'Generators'
  | 'Security'
  | 'Files';

export type ToolStatus = 'active' | 'stub' | 'beta';

export interface Tool {
  name: string;
  slug: string;
  category: Category;
  description: string;
  longDescription?: string;
  keywords: string[];
  icon: string;
  formats?: { in: string[]; out?: string[] };
  related: string[];
  status: ToolStatus;
  processing: 'client';
  dataStorage: 'none';
  isNew?: boolean;
  isBeta?: boolean;
}

export type Theme = 'dark' | 'light' | 'system';
