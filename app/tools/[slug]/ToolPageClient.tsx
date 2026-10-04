'use client';
import React, { lazy, Suspense } from 'react';
import { TOOL_MAP } from '@/lib/registry';
import { ToolLayout } from '@/components/tools/ToolLayout';
import { ComingSoon } from '@/components/tools/ComingSoon';
import { ToolErrorBoundary } from '@/components/ui/ToolErrorBoundary';

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
  'image-format-changer': lazy(() => import('@/tools/image/converter/ImageConverterTool')),
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

  // ── Audio ────────────────────────────────────────────────────────────────
  'mp3-trimmer': lazy(() => import('@/tools/audio/mp3-trimmer/Mp3TrimmerTool')),
  'audio-trimmer': lazy(() => import('@/tools/audio/audio-trimmer/AudioTrimmerTool')),
  'audio-merger': lazy(() => import('@/tools/audio/audio-merger/AudioMergerTool')),
  'mp3-to-wav': lazy(() => import('@/tools/audio/mp3-to-wav/Mp3ToWavTool')),
  'wav-to-mp3': lazy(() => import('@/tools/audio/wav-to-mp3/WavToMp3Tool')),
  'audio-volume': lazy(() => import('@/tools/audio/audio-volume/AudioVolumeTool')),
  'audio-metadata-remover': lazy(() => import('@/tools/audio/audio-metadata-remover/AudioMetadataRemoverTool')),

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

  // ── Files ────────────────────────────────────────────────────────────────
  'file-hash': lazy(() => import('@/tools/files/file-hash/FileHashTool')),
  'file-metadata': lazy(() => import('@/tools/files/file-metadata/FileMetadataTool')),
  'mime-checker': lazy(() => import('@/tools/files/mime-checker/MimeCheckerTool')),
  'zip-creator': lazy(() => import('@/tools/files/zip-creator/ZipCreatorTool')),

  // ── Developer ────────────────────────────────────────────────────────────
  'json-formatter': lazy(() => import('@/tools/developer/json-formatter/JsonFormatterTool')),
  'json-validator': lazy(() => import('@/tools/developer/json-validator/JsonValidatorTool')),
  'json-minifier': lazy(() => import('@/tools/developer/json-minifier/JsonMinifierTool')),
  'json-to-csv': lazy(() => import('@/tools/developer/json-to-csv/JsonToCsvTool')),
  'json-to-xml': lazy(() => import('@/tools/developer/json-to-xml/JsonToXmlTool')),
  'xml-to-json': lazy(() => import('@/tools/developer/xml-to-json/XmlToJsonTool')),
  'html-formatter': lazy(() => import('@/tools/developer/html-formatter/HtmlFormatterTool')),
  'css-formatter': lazy(() => import('@/tools/developer/css-formatter/CssFormatterTool')),
  'js-formatter': lazy(() => import('@/tools/developer/js-formatter/JsFormatterTool')),
  'html-minifier': lazy(() => import('@/tools/developer/html-minifier/HtmlMinifierTool')),
  'css-minifier': lazy(() => import('@/tools/developer/css-minifier/CssMinifierTool')),
  'sql-formatter': lazy(() => import('@/tools/developer/sql-formatter/SqlFormatterTool')),
  'markdown-to-html': lazy(() => import('@/tools/developer/markdown-to-html/MarkdownToHtmlTool')),
  'regex-tester': lazy(() => import('@/tools/developer/regex-tester/RegexTesterTool')),
  'uuid-generator': lazy(() => import('@/tools/developer/uuid-generator/UuidGeneratorTool')),
  'timestamp-converter': lazy(() => import('@/tools/developer/timestamp-converter/TimestampConverterTool')),
  'hash-generator': lazy(() => import('@/tools/developer/hash-generator/HashGeneratorTool')),
  'jwt-decoder': lazy(() => import('@/tools/developer/jwt-decoder/JwtDecoderTool')),
  'text-diff': lazy(() => import('@/tools/developer/text-diff/TextDiffTool')),
  'cron-generator': lazy(() => import('@/tools/developer/cron-generator/CronGeneratorTool')),

  // ── Data ─────────────────────────────────────────────────────────────────
  'csv-to-json': lazy(() => import('@/tools/data/csv-to-json/CsvToJsonTool')),
  'json-to-csv-data': lazy(() => import('@/tools/data/json-to-csv/JsonToCsvDataTool')),
  'csv-cleaner': lazy(() => import('@/tools/data/csv-cleaner/CsvCleanerTool')),
  'csv-deduplicator': lazy(() => import('@/tools/data/csv-deduplicator/CsvDeduplicatorTool')),
  'csv-column-extractor': lazy(() => import('@/tools/data/csv-column-extractor/CsvColumnExtractorTool')),
  'csv-sorter': lazy(() => import('@/tools/data/csv-sorter/CsvSorterTool')),
  'yaml-to-json': lazy(() => import('@/tools/data/yaml-to-json/YamlToJsonTool')),
  'json-to-yaml': lazy(() => import('@/tools/data/json-to-yaml/JsonToYamlTool')),

  // ── Text ─────────────────────────────────────────────────────────────────
  'word-counter': lazy(() => import('@/tools/text/word-counter/WordCounterTool')),
  'character-counter': lazy(() => import('@/tools/text/character-counter/CharacterCounterTool')),
  'reading-time': lazy(() => import('@/tools/text/reading-time/ReadingTimeTool')),
  'case-converter': lazy(() => import('@/tools/text/case-converter/CaseConverterTool')),
  'remove-duplicate-lines': lazy(() => import('@/tools/text/remove-duplicate-lines/RemoveDuplicateLinesTool')),
  'sort-lines': lazy(() => import('@/tools/text/sort-lines/SortLinesTool')),
  'reverse-text': lazy(() => import('@/tools/text/reverse-text/ReverseTextTool')),
  'find-replace': lazy(() => import('@/tools/text/find-replace/FindReplaceTool')),
  'text-cleaner': lazy(() => import('@/tools/text/text-cleaner/TextCleanerTool')),
  'whitespace-remover': lazy(() => import('@/tools/text/whitespace-remover/WhitespaceRemoverTool')),
  'slug-generator': lazy(() => import('@/tools/text/slug-generator/SlugGeneratorTool')),
  'lorem-ipsum': lazy(() => import('@/tools/text/lorem-ipsum/LoremIpsumTool')),

  // ── Calculators ──────────────────────────────────────────────────────────
  'sip-calculator': lazy(() => import('@/tools/calculators/sip/SipCalculatorTool')),
  'percentage-calculator': lazy(() => import('@/tools/calculators/percentage/PercentageCalculatorTool')),
  'age-calculator': lazy(() => import('@/tools/calculators/age/AgeCalculatorTool')),
  'bmi-calculator': lazy(() => import('@/tools/calculators/bmi/BmiCalculatorTool')),
  'emi-calculator': lazy(() => import('@/tools/calculators/emi/EmiCalculatorTool')),
  'loan-calculator': lazy(() => import('@/tools/calculators/loan/LoanCalculatorTool')),
  'compound-interest': lazy(() => import('@/tools/calculators/compound-interest/CompoundInterestTool')),
  'simple-interest': lazy(() => import('@/tools/calculators/simple-interest/SimpleInterestTool')),
  'gst-calculator': lazy(() => import('@/tools/calculators/gst/GstCalculatorTool')),
  'discount-calculator': lazy(() => import('@/tools/calculators/discount/DiscountCalculatorTool')),
  'fd-calculator': lazy(() => import('@/tools/calculators/fd/FdCalculatorTool')),
  'date-difference': lazy(() => import('@/tools/calculators/date-difference/DateDifferenceTool')),
  'unit-converter': lazy(() => import('@/tools/calculators/unit-converter/UnitConverterTool')),

  // ── Design ───────────────────────────────────────────────────────────────
  'favicon-generator': lazy(() => import('@/tools/design/favicon-generator/FaviconGeneratorTool')),
  'color-picker': lazy(() => import('@/tools/design/color-picker/ColorPickerTool')),
  'hex-to-rgb': lazy(() => import('@/tools/design/hex-to-rgb/HexToRgbTool')),
  'rgb-to-hex': lazy(() => import('@/tools/design/rgb-to-hex/RgbToHexTool')),
  'hsl-converter': lazy(() => import('@/tools/design/hsl-converter/HslConverterTool')),
  'color-palette': lazy(() => import('@/tools/design/color-palette/ColorPaletteTool')),
  'css-gradient': lazy(() => import('@/tools/design/css-gradient/CssGradientTool')),
  'css-shadow': lazy(() => import('@/tools/design/css-shadow/CssShadowTool')),
  'glassmorphism': lazy(() => import('@/tools/design/glassmorphism/GlassmorphismTool')),
  'border-radius-generator': lazy(() => import('@/tools/design/border-radius-generator/BorderRadiusTool')),
  'svg-blob': lazy(() => import('@/tools/design/svg-blob/SvgBlobTool')),
  'svg-wave': lazy(() => import('@/tools/design/svg-wave/SvgWaveTool')),

  
  // ── Generators ───────────────────────────────────────────────────────────
  'qr-generator': lazy(() => import('@/tools/generators/qr/QrGeneratorTool')),
  'barcode-generator': lazy(() => import('@/tools/generators/barcode/BarcodeGeneratorTool')),
  'password-generator': lazy(() => import('@/tools/generators/password/PasswordGeneratorTool')),
  'random-number': lazy(() => import('@/tools/generators/random/RandomNumberTool')),
  'placeholder-image': lazy(() => import('@/tools/generators/placeholder-image/PlaceholderImageTool')),
  'timestamp-generator': lazy(() => import('@/tools/generators/timestamp/TimestampGeneratorTool')),

  // ── Security ─────────────────────────────────────────────────────────────
  'base64-encoder': lazy(() => import('@/tools/security/base64-encoder/Base64EncoderTool')),
  'base64-decoder': lazy(() => import('@/tools/security/base64-decoder/Base64DecoderTool')),
  'url-encoder': lazy(() => import('@/tools/security/url-encoder/UrlEncoderTool')),
  'url-decoder': lazy(() => import('@/tools/security/url-decoder/UrlDecoderTool')),
  'md5-hash': lazy(() => import('@/tools/security/md5-hash/Md5HashTool')),
  'sha256-hash': lazy(() => import('@/tools/security/sha256-hash/Sha256HashTool')),
  'sha512-hash': lazy(() => import('@/tools/security/sha512-hash/Sha512HashTool')),
  'jwt-decoder-sec': lazy(() => import('@/tools/security/jwt-decoder/JwtDecoderSecTool')),
  'password-strength': lazy(() => import('@/tools/security/password-strength/PasswordStrengthTool')),

// ── Other Categories ─────────────────────────────────────────────────────
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
        <ToolErrorBoundary toolName={tool.name}>
          <Suspense fallback={<LoadingSpinner />}>
            <ToolComponent />
          </Suspense>
        </ToolErrorBoundary>
      ) : (
        <ComingSoon toolName={tool.name} description={tool.longDescription || tool.description} />
      )}
    </ToolLayout>
  );
}
