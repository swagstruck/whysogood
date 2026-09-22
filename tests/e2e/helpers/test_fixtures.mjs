// @ts-check
/**
 * Test fixture file generators for Simple Mode E2E verification suite.
 * Generates synthetic File/Blob instances for all supported formats and edge cases.
 */

/**
 * Creates a synthetic image file.
 * @param {'png'|'jpg'|'jpeg'|'webp'|'gif'|'svg'|'avif'|'bmp'|'ico'|'tiff'} format
 * @param {string} name
 * @param {number} size
 * @returns {File}
 */
export function createTestImage(format = 'png', name = `test_image.${format}`, size = 1024) {
  const mimeMap = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    avif: 'image/avif',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    tiff: 'image/tiff',
  };

  const mime = mimeMap[format.toLowerCase()] || 'image/png';

  if (format.toLowerCase() === 'svg') {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#3b82f6"/><circle cx="50" cy="50" r="30" fill="#ef4444"/></svg>`;
    return new File([svgContent], name, { type: mime });
  }

  // Generate synthetic bytes with minimal signature
  const buffer = new Uint8Array(Math.max(size, 32));
  if (format === 'png') {
    buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  } else if (format === 'jpg' || format === 'jpeg') {
    buffer.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46], 0);
  } else if (format === 'gif') {
    buffer.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0); // GIF89a
  }

  return new File([buffer], name, { type: mime });
}

/**
 * Creates a synthetic minimal PDF file.
 * @param {string} name
 * @param {number} pages
 * @returns {File}
 */
export function createTestPdf(name = 'sample_document.pdf') {
  // Minimal syntactically valid PDF structure
  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 24 Tf 100 700 Td (WhySoGood Test PDF) ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000059 00000 n 
0000000116 00000 n 
0000000201 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
295
%%EOF`;

  return new File([pdfString], name, { type: 'application/pdf' });
}

/**
 * Creates a synthetic CSV data file.
 * @param {string} name
 * @param {number} rowCount
 * @returns {File}
 */
export function createTestCsv(name = 'data_export.csv', rowCount = 5) {
  let content = 'id,name,role,department,salary\n';
  for (let i = 1; i <= rowCount; i++) {
    content += `${i},User_${i},Engineer,Product,${75000 + i * 1000}\n`;
  }
  return new File([content], name, { type: 'text/csv' });
}

/**
 * Creates a synthetic JSON developer file.
 * @param {string} name
 * @param {Record<string, any>} payload
 * @returns {File}
 */
export function createTestJson(name = 'config.json', payload = null) {
  const content = JSON.stringify(
    payload || {
      appName: 'whysogood',
      version: '1.0.0',
      simpleMode: true,
      features: ['client-side', 'zero-storage', 'fflate-zip'],
      metrics: { latency: 12, memoryMb: 45 },
    },
    null,
    2
  );
  return new File([content], name, { type: 'application/json' });
}

/**
 * Creates a synthetic Text file.
 * @param {string} name
 * @param {string} text
 * @returns {File}
 */
export function createTestText(name = 'notes.txt', text = 'WhySoGood client-side single page workbench.') {
  return new File([text], name, { type: 'text/plain' });
}

/**
 * Creates synthetic Audio mock file.
 * @param {string} name
 * @returns {File}
 */
export function createTestAudio(name = 'recording.mp3') {
  const buffer = new Uint8Array(512);
  buffer.set([0x49, 0x44, 0x33], 0); // ID3 header
  return new File([buffer], name, { type: 'audio/mpeg' });
}

/**
 * Edge case file generators.
 */
export const EdgeCaseFiles = {
  // Uppercase extensions
  uppercasePng: () => new File([new Uint8Array([1, 2, 3])], 'BANNER_IMAGE.PNG', { type: 'image/png' }),
  uppercaseJpg: () => new File([new Uint8Array([1, 2, 3])], 'PHOTO_2026.JPEG', { type: 'image/jpeg' }),
  uppercasePdf: () => new File([new Uint8Array([1, 2, 3])], 'QUARTERLY_INVOICE.PDF', { type: 'application/pdf' }),
  uppercaseCsv: () => new File(['a,b\n1,2'], 'SALES_REPORT.CSV', { type: 'text/csv' }),
  uppercaseJson: () => new File(['{"ok":true}'], 'SETTINGS.JSON', { type: 'application/json' }),

  // Missing MIME types with valid extensions
  missingMimePng: () => new File([new Uint8Array([1, 2, 3])], 'screenshot.png', { type: '' }),
  missingMimePdf: () => new File([new Uint8Array([1, 2, 3])], 'annual_doc.pdf', { type: '' }),
  genericMimeJpg: () => new File([new Uint8Array([1, 2, 3])], 'snapshot.jpg', { type: 'application/octet-stream' }),

  // Multi-dot filenames
  multiDotPdf: () => new File([new Uint8Array([1, 2, 3])], 'company.finance.audit.v2.final.pdf', { type: 'application/pdf' }),
  multiDotPng: () => new File([new Uint8Array([1, 2, 3])], 'asset.min.highres.draft.png', { type: 'image/png' }),

  // Special characters and spaces
  specialCharFile: () =>
    new File([new Uint8Array([1, 2, 3])], 'My Vacation Photo (1) 🏖️ & [draft] #99.jpeg', { type: 'image/jpeg' }),

  // Zero-byte empty files
  emptyZeroByteFile: () => new File([], 'empty_file.png', { type: 'image/png' }),
  emptyZeroBytePdf: () => new File([], 'blank.pdf', { type: 'application/pdf' }),

  // Extremely long filename (>150 characters)
  longFilenameFile: () =>
    new File(
      [new Uint8Array([1, 2, 3])],
      'a_very_long_file_name_that_exceeds_normal_boundaries_and_might_break_flexbox_or_grid_layout_overflow_containers_in_the_ui_component_card_headers_2026_final_version.png',
      { type: 'image/png' }
    ),

  // Corrupted / invalid data
  corruptedPng: () => new File(['NOT_A_PNG_FILE_AT_ALL_CORRUPT'], 'corrupted.png', { type: 'image/png' }),
  corruptedPdf: () => new File(['CORRUPT_PDF_CONTENT'], 'corrupted.pdf', { type: 'application/pdf' }),
  corruptedJson: () => new File(['{ invalid json: missing quotes'], 'corrupt.json', { type: 'application/json' }),

  // Unusual image formats
  webpFile: () => createTestImage('webp', 'photo.webp'),
  avifFile: () => createTestImage('avif', 'modern.avif'),
  bmpFile: () => createTestImage('bmp', 'legacy.bmp'),
  icoFile: () => createTestImage('ico', 'favicon.ico'),
  svgFile: () => createTestImage('svg', 'icon.svg'),

  // Large simulated file (5MB)
  largeSimulatedFile: () => {
    const bigBuffer = new Uint8Array(5 * 1024 * 1024);
    return new File([bigBuffer], 'large_4k_photo.png', { type: 'image/png' });
  },
};
