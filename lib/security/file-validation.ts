/**
 * Advanced File Validation with Magic Number Verification
 * Validates file types by inspecting file signatures (magic numbers)
 * Prevents MIME type spoofing attacks
 */

// Audio file magic numbers (file signatures)
const AUDIO_SIGNATURES: Record<string, { signature: number[][]; offset: number; extension: string }> = {
  mp3: {
    signature: [
      [0xFF, 0xFB], // MP3 with MPEG-1 Layer 3
      [0xFF, 0xF3], // MP3 with MPEG-1 Layer 3
      [0xFF, 0xF2], // MP3 with MPEG-2 Layer 3
      [0x49, 0x44, 0x33], // ID3v2 container (MP3 with metadata)
    ],
    offset: 0,
    extension: 'mp3',
  },
  mp4: {
    signature: [
      [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp
      [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70],
      [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
    ],
    offset: 0,
    extension: 'mp4',
  },
  m4a: {
    signature: [
      [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41], // ftyp M4A
    ],
    offset: 0,
    extension: 'm4a',
  },
  wav: {
    signature: [
      [0x52, 0x49, 0x46, 0x46], // RIFF
    ],
    offset: 0,
    extension: 'wav',
  },
  ogg: {
    signature: [
      [0x4F, 0x67, 0x67, 0x53], // OggS
    ],
    offset: 0,
    extension: 'ogg',
  },
  flac: {
    signature: [
      [0x66, 0x4C, 0x61, 0x43], // fLaC
    ],
    offset: 0,
    extension: 'flac',
  },
  webm: {
    signature: [
      [0x1A, 0x45, 0xDF, 0xA3], // EBML header
    ],
    offset: 0,
    extension: 'webm',
  },
};

/**
 * Read magic numbers from file buffer
 */
function readMagicNumbers(buffer: Buffer, length: number = 12): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < Math.min(length, buffer.length); i++) {
    bytes.push(buffer[i]);
  }
  return bytes;
}

/**
 * Check if buffer matches a signature
 */
function matchesSignature(buffer: number[], signature: number[], offset: number = 0): boolean {
  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Detect audio file type from file content (magic numbers)
 */
export function detectAudioFileType(buffer: Buffer): string | null {
  const magicNumbers = readMagicNumbers(buffer, 32);

  for (const [fileType, { signature, offset }] of Object.entries(AUDIO_SIGNATURES)) {
    for (const sig of signature) {
      if (matchesSignature(magicNumbers, sig, offset)) {
        return fileType;
      }
    }
  }

  return null;
}

/**
 * Validate file by both MIME type and magic number
 */
export function validateAudioFile(
  buffer: Buffer,
  declaredMimeType: string,
  fileName: string
): {
  valid: boolean;
  detectedType: string | null;
  error?: string;
} {
  // Detect actual file type
  const detectedType = detectAudioFileType(buffer);

  if (!detectedType) {
    return {
      valid: false,
      detectedType: null,
      error: 'File is not a recognized audio format',
    };
  }

  // Map MIME types to detected types
  const mimeTypeMap: Record<string, string[]> = {
    mp3: ['audio/mpeg', 'audio/mp3'],
    mp4: ['audio/mp4', 'audio/x-m4a'],
    m4a: ['audio/mp4', 'audio/x-m4a'],
    wav: ['audio/wav', 'audio/x-wav', 'audio/wave'],
    ogg: ['audio/ogg', 'audio/vorbis'],
    flac: ['audio/flac', 'audio/x-flac'],
    webm: ['audio/webm'],
  };

  // Check if declared MIME type matches detected type
  const expectedMimeTypes = mimeTypeMap[detectedType] || [];

  if (!expectedMimeTypes.includes(declaredMimeType.toLowerCase())) {
    return {
      valid: false,
      detectedType,
      error: `MIME type mismatch: declared ${declaredMimeType} but file is ${detectedType}`,
    };
  }

  // Validate file extension matches
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['mp3', 'mp4', 'm4a', 'wav', 'ogg', 'flac', 'webm', 'oga'];

  if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      detectedType,
      error: `Invalid file extension: ${fileExtension}`,
    };
  }

  return {
    valid: true,
    detectedType,
  };
}

/**
 * Validate file size limits
 */
export function validateFileSize(
  sizeBytes: number,
  maxSizeMB: number = 500
): {
  valid: boolean;
  sizeMB: number;
  error?: string;
} {
  const maxBytes = maxSizeMB * 1024 * 1024;
  const sizeMB = sizeBytes / (1024 * 1024);

  if (sizeBytes > maxBytes) {
    return {
      valid: false,
      sizeMB,
      error: `File too large: ${sizeMB.toFixed(2)}MB (max: ${maxSizeMB}MB)`,
    };
  }

  if (sizeBytes === 0) {
    return {
      valid: false,
      sizeMB: 0,
      error: 'File is empty',
    };
  }

  return {
    valid: true,
    sizeMB,
  };
}

/**
 * Validate filename for security
 */
export function validateFileName(fileName: string): {
  valid: boolean;
  error?: string;
} {
  // Check for path traversal
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return {
      valid: false,
      error: 'Filename contains invalid characters (path traversal attempt)',
    };
  }

  // Check for null bytes
  if (fileName.includes('\0')) {
    return {
      valid: false,
      error: 'Filename contains null bytes',
    };
  }

  // Check length
  if (fileName.length > 255) {
    return {
      valid: false,
      error: 'Filename too long (max 255 characters)',
    };
  }

  if (fileName.length === 0) {
    return {
      valid: false,
      error: 'Filename is empty',
    };
  }

  // Check for valid characters (allow alphanumeric, dash, underscore, dot, space)
  const validNameRegex = /^[a-zA-Z0-9\-_.() ]+$/;
  if (!validNameRegex.test(fileName)) {
    return {
      valid: false,
      error: 'Filename contains invalid characters',
    };
  }

  // Check file has extension
  if (!fileName.includes('.')) {
    return {
      valid: false,
      error: 'Filename must have an extension',
    };
  }

  return {
    valid: true,
  };
}

/**
 * Comprehensive file validation
 * Validates MIME type, magic number, size, and filename
 */
export async function validateUploadedFile(
  file: File | Buffer,
  metadata: {
    fileName: string;
    mimeType: string;
    size: number;
  }
): Promise<{
  valid: boolean;
  errors: string[];
  detectedType?: string;
  sizeMB?: number;
}> {
  const errors: string[] = [];

  // Validate filename
  const fileNameValidation = validateFileName(metadata.fileName);
  if (!fileNameValidation.valid) {
    errors.push(fileNameValidation.error!);
  }

  // Validate file size
  const sizeValidation = validateFileSize(metadata.size);
  if (!sizeValidation.valid) {
    errors.push(sizeValidation.error!);
  }

  // Get buffer for magic number validation
  let buffer: Buffer;
  if (file instanceof Buffer) {
    buffer = file;
  } else {
    // Convert File to Buffer (for Node.js environment)
    const arrayBuffer = await (file as File).arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  // Validate file content
  const contentValidation = validateAudioFile(buffer, metadata.mimeType, metadata.fileName);
  if (!contentValidation.valid) {
    errors.push(contentValidation.error!);
  }

  return {
    valid: errors.length === 0,
    errors,
    detectedType: contentValidation.detectedType || undefined,
    sizeMB: sizeValidation.sizeMB,
  };
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  // Remove any path components
  fileName = fileName.split('/').pop()?.split('\\').pop() || fileName;

  // Replace spaces with underscores
  fileName = fileName.replace(/\s+/g, '_');

  // Remove any non-alphanumeric characters except dash, underscore, and dot
  fileName = fileName.replace(/[^a-zA-Z0-9\-_.]/g, '');

  // Ensure filename is not too long
  if (fileName.length > 200) {
    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    fileName = nameWithoutExt.substring(0, 195) + '.' + extension;
  }

  return fileName;
}

/**
 * Generate secure unique filename
 */
export function generateSecureFileName(originalFileName: string, userId: string): string {
  const crypto = require('crypto');
  const sanitized = sanitizeFileName(originalFileName);
  const extension = sanitized.split('.').pop();
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(8).toString('hex');

  return `${userId}_${timestamp}_${randomStr}.${extension}`;
}

export default {
  detectType: detectAudioFileType,
  validate: validateUploadedFile,
  validateAudio: validateAudioFile,
  validateSize: validateFileSize,
  validateName: validateFileName,
  sanitizeName: sanitizeFileName,
  generateName: generateSecureFileName,
};