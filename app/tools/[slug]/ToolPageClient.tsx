'use client';
import React, { lazy, Suspense } from 'react';
import { TOOL_MAP } from '@/lib/registry';
import { ToolLayout } from '@/components/tools/ToolLayout';
import { ComingSoon } from '@/components/tools/ComingSoon';

// Lazy-load active tool implementations
const TOOL_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  // ── Images (36 Tools) ─────────────────────────────────────────────────────
  'image-to-text': lazy(() => import('@/tools/image/ocr/ImageToTextTool')),
  'image-compressor': lazy(() => import('@/tools/image/compressor/ImageCompressorTool')),
  'image-resizer': lazy(() => import('@/tools/image/resizer/ImageResizerTool')),
  'image-cropper': lazy(() => import('@/tools/image/cropper/ImageCropperTool')),
  'image-rotator': lazy(() => import('@/tools/image/rotator/ImageRotatorTool')),
  'image-flipper': lazy(() => import('@/tools/image/flipper/ImageFlipperTool')),
  'image-converter': lazy(() => import('@/tools/image/converter/ImageConverterTool')),
  'image-quality': lazy(() => import('@/tools/image/quality/ImageQualityTool')),
  'image-metadata-viewer': lazy(() => import('@/tools/image/metadata/ImageMetadataViewerTool')),
  'image-metadata-remover': lazy(() => import('@/tools/image/metadata/ImageMetadataRemoverTool')),
  'image-dpi': lazy(() => import('@/tools/image/dpi/ImageDpiTool')),
  'image-color-picker': lazy(() => import('@/tools/image/color-picker/ImageColorPickerTool')),
  'image-blur': lazy(() => import('@/tools/image/blur/ImageBlurTool')),
  'image-watermark': lazy(() => import('@/tools/image/watermark/ImageWatermarkTool')),
  'image-grayscale': lazy(() => import('@/tools/image/grayscale/ImageGrayscaleTool')),
  'jpg-to-png': lazy(() => import('@/tools/image/format/FormatConverterTool').then(m => ({ default: m.JpgToPngTool }))),
  'png-to-jpg': lazy(() => import('@/tools/image/format/FormatConverterTool').then(m => ({ default: m.PngToJpgTool }))),
  'jpg-to-webp': lazy(() => import('@/tools/image/format/FormatConverterTool').then(m => ({ default: m.JpgToWebpTool }))),
  'png-to-webp': lazy(() => import('@/tools/image/format/FormatConverterTool').then(m => ({ default: m.PngToWebpTool }))),
  'webp-to-jpg': lazy(() => import('@/tools/image/format/FormatConverterTool').then(m => ({ default: m.WebpToJpgTool }))),
  'webp-to-png': lazy(() => import('@/tools/image/format/FormatConverterTool').then(m => ({ default: m.WebpToPngTool }))),
  'webp-to-avif': lazy(() => import('@/tools/image/format/FormatConverterTool').then(m => ({ default: m.WebpToAvifTool }))),
  'avif-to-jpg': lazy(() => import('@/tools/image/format/FormatConverterTool').then(m => ({ default: m.AvifToJpgTool }))),
  'avif-to-png': lazy(() => import('@/tools/image/format/FormatConverterTool').then(m => ({ default: m.AvifToPngTool }))),
  'heic-to-jpg': lazy(() => import('@/tools/image/format/FormatConverterTool').then(m => ({ default: m.HeicToJpgTool }))),
  'heic-to-png': lazy(() => import('@/tools/image/format/FormatConverterTool').then(m => ({ default: m.HeicToPngTool }))),
  'gif-to-jpg': lazy(() => import('@/tools/image/format/FormatConverterTool').then(m => ({ default: m.GifToJpgTool }))),
  'gif-to-png': lazy(() => import('@/tools/image/format/FormatConverterTool').then(m => ({ default: m.GifToPngTool }))),
  'batch-image-compressor': lazy(() => import('@/tools/image/batch/BatchImageCompressorTool')),
  'batch-image-resizer': lazy(() => import('@/tools/image/batch/BatchImageResizerTool')),
  'batch-image-converter': lazy(() => import('@/tools/image/batch/BatchImageConverterTool')),
  'svg-cleaner': lazy(() => import('@/tools/image/svg/SvgCleanerTool')),
  'svg-optimizer': lazy(() => import('@/tools/image/svg/SvgOptimizerTool')),
  'svg-to-png': lazy(() => import('@/tools/image/svg/SvgToPngTool')),
  'svg-to-jpg': lazy(() => import('@/tools/image/svg/SvgToJpgTool')),
  'svg-preview': lazy(() => import('@/tools/image/svg/SvgPreviewTool')),
  'background-remover': lazy(() => import('@/tools/image/background-remover/BackgroundRemoverTool')),

  // ── PDF ─────────────────────────────────────────────────────────────────
  'pdf-compressor': lazy(() => import('@/tools/pdf/compressor/PdfCompressorTool')),
  'pdf-merger': lazy(() => import('@/tools/pdf/merger/PdfMergerTool')),
  'pdf-splitter': lazy(() => import('@/tools/pdf/splitter/PdfSplitterTool')),
  'pdf-rotator': lazy(() => import('@/tools/pdf/rotator/PdfRotatorTool')),
  'pdf-page-extractor': lazy(() => import('@/tools/pdf/page-extractor/PdfPageExtractorTool')),
  'pdf-page-deleter': lazy(() => import('@/tools/pdf/page-deleter/PdfPageDeleterTool')),
  'pdf-to-jpg': lazy(() => import('@/tools/pdf/to-jpg/PdfToJpgTool')),
  'pdf-to-png': lazy(() => import('@/tools/pdf/to-png/PdfToPngTool')),
  'pdf-to-text': lazy(() => import('@/tools/pdf/to-text/PdfToTextTool')),
  'jpg-to-pdf': lazy(() => import('@/tools/pdf/image-to-pdf/JpgToPdfTool')),
  'png-to-pdf': lazy(() => import('@/tools/pdf/image-to-pdf/PngToPdfTool')),
  'image-to-pdf': lazy(() => import('@/tools/pdf/image-to-pdf/ImageToPdfTool')),
  'pdf-metadata-viewer': lazy(() => import('@/tools/pdf/metadata/PdfMetadataViewerTool')),
  'pdf-watermark': lazy(() => import('@/tools/pdf/watermark/PdfWatermarkTool')),
  'pdf-password': lazy(() => import('@/tools/pdf/security/PdfPasswordTool')),
  'pdf-unlock': lazy(() => import('@/tools/pdf/security/PdfUnlockTool')),
  'json-formatter': lazy(() => import('@/tools/developer/json-formatter/JsonFormatterTool')),
  'csv-to-json': lazy(() => import('@/tools/data/csv-to-json/CsvToJsonTool')),
  'word-counter': lazy(() => import('@/tools/text/word-counter/WordCounterTool')),
  'character-counter': lazy(() => import('@/tools/text/character-counter/CharacterCounterTool')),
  'reading-time': lazy(() => import('@/tools/text/reading-time/ReadingTimeTool')),
  'sip-calculator': lazy(() => import('@/tools/calculators/sip/SipCalculatorTool')),
  'favicon-generator': lazy(() => import('@/tools/design/favicon-generator/FaviconGeneratorTool')),
  'base64-encoder': lazy(() => import('@/tools/security/base64-encoder/Base64EncoderTool')),
};

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)' }} className="animate-spin" />
    </div>
  );
}

export function ToolPageClient({ slug }: { slug: string }) {
  const tool = TOOL_MAP[slug];
  if (!tool) return null;

  const ToolComponent = TOOL_COMPONENTS[slug];

  return (
    <ToolLayout tool={tool}>
      {tool.status === 'active' && ToolComponent ? (
        <Suspense fallback={<LoadingSpinner />}>
          <ToolComponent />
        </Suspense>
      ) : (
        <ComingSoon toolName={tool.name} description={tool.longDescription || tool.description} />
      )}
    </ToolLayout>
  );
}
