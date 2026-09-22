import type { Category } from '../types';

const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'bmp', 'svg', 'ico', 'tiff', 'tif', 'heic',
]);

const DATA_EXTENSIONS = new Set([
  'csv', 'tsv', 'yaml', 'yml',
]);

const DEVELOPER_EXTENSIONS = new Set([
  'json', 'xml', 'html', 'css', 'js', 'jsx', 'ts', 'tsx', 'sql', 'sh',
]);

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'log', 'rtf', 'nfo',
]);

const AUDIO_EXTENSIONS = new Set([
  'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma', 'opus',
]);

const ARCHIVE_EXTENSIONS = new Set([
  'zip', 'tar', 'gz', '7z', 'rar',
]);

/**
 * Auto-detects the matching category for an uploaded file using its MIME type and extension.
 */
export function detectCategoryFromFile(file: File): Category {
  const mime = (file.type || '').toLowerCase();
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  // 1. PDF detection (highest specificity)
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'PDF';
  }

  // 2. Image detection
  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.has(ext)) {
    return 'Images';
  }

  // 3. Audio detection
  if (mime.startsWith('audio/') || AUDIO_EXTENSIONS.has(ext)) {
    return 'Audio';
  }

  // 4. Data detection (CSV/TSV/YAML)
  if (
    mime === 'text/csv' ||
    mime === 'text/tab-separated-values' ||
    mime === 'application/csv' ||
    DATA_EXTENSIONS.has(ext)
  ) {
    return 'Data';
  }

  // 5. Developer detection (JSON, XML, Code)
  if (
    mime === 'application/json' ||
    mime === 'application/xml' ||
    mime === 'text/html' ||
    mime === 'text/css' ||
    mime === 'text/javascript' ||
    DEVELOPER_EXTENSIONS.has(ext)
  ) {
    return 'Developer';
  }

  // 6. Text files
  if (mime === 'text/plain' || TEXT_EXTENSIONS.has(ext)) {
    return 'Text';
  }

  // 7. Archive / File utilities
  if (
    mime === 'application/zip' ||
    mime === 'application/x-zip-compressed' ||
    ARCHIVE_EXTENSIONS.has(ext)
  ) {
    return 'Files';
  }

  // Default fallback for any unrecognized file format
  return 'Images';
}

/**
 * Checks if a given file is reasonably compatible with a chosen category.
 */
export function isCategoryCompatible(file: File, category: Category): boolean {
  const detected = detectCategoryFromFile(file);
  if (detected === category) return true;

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const mime = (file.type || '').toLowerCase();

  // Images can be converted to PDF (Image-to-PDF is in PDF category)
  if (category === 'PDF' && (mime.startsWith('image/') || IMAGE_EXTENSIONS.has(ext))) {
    return true;
  }

  // Text/Data/Developer formats share text interoperability
  if (['Text', 'Data', 'Developer'].includes(category)) {
    if (
      mime.startsWith('text/') ||
      DATA_EXTENSIONS.has(ext) ||
      DEVELOPER_EXTENSIONS.has(ext) ||
      TEXT_EXTENSIONS.has(ext)
    ) {
      return true;
    }
  }

  // Security (Base64) accepts any file
  if (category === 'Security') {
    return true;
  }

  return false;
}

/**
 * Returns suggested default tool slug for a given category.
 */
export function getCategoryDefaultTool(category: Category): string {
  switch (category) {
    case 'Images':
      return 'image-compressor';
    case 'PDF':
      return 'pdf-compressor';
    case 'Data':
      return 'csv-to-json';
    case 'Developer':
      return 'json-formatter';
    case 'Text':
      return 'word-counter';
    case 'Security':
      return 'base64-encoder';
    case 'Design':
      return 'favicon-generator';
    default:
      return '';
  }
}
