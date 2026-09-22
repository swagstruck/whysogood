import type { Category } from '../types';

export interface SimpleModeOutput {
  id: string;
  toolSlug: string;
  toolName: string;
  sourceFilename: string;
  outputFilename: string;
  mimeType: string;
  size: number;
  originalSize: number;
  blob: Blob;
  previewUrl: string;
  createdAt: number;
  metadata?: Record<string, string | number>;
}

export type RunnerOptions = Record<string, unknown>;

export interface ToolRunnerResult {
  blob: Blob;
  filename: string;
  metadata?: Record<string, string | number>;
  previewUrl?: string;
}

export interface ToolRunner {
  slug: string;
  name: string;
  category: Category;
  description?: string;
  run: (file: File, options?: RunnerOptions) => Promise<ToolRunnerResult>;
}

export interface WorkbenchFileInfo {
  file: File;
  name: string;
  size: number;
  formattedSize: string;
  type: string;
  extension: string;
  previewUrl: string;
  detectedCategory: Category;
}
