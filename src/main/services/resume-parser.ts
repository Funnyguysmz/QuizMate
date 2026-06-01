import fs from 'fs';
import path from 'path';

/**
 * Parse a PDF file and extract its text content.
 * Uses pdf-parse library under the hood.
 */
export async function parseResumePdf(filePath: string): Promise<string> {
  // Validate file existence
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.pdf') {
    throw new Error(`Unsupported file type: ${ext}. Only PDF files are supported.`);
  }

  const { PDFParse } = await import('pdf-parse');
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  try {
    const result = await parser.getText();
    const text = (result.text || '').trim();
    if (!text) {
      throw new Error(
        'PDF parsed successfully but no text content was found. The file may be scanned or image-based.',
      );
    }
    return text;
  } finally {
    parser.destroy();
  }
}
