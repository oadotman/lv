// =====================================================
// FILE VALIDATION UTILITY
// Validates audio files before upload
// =====================================================

// Supported audio formats
const SUPPORTED_FORMATS = [
  'audio/mpeg',       // .mp3
  'audio/mp4',        // .m4a
  'audio/wav',        // .wav
  'audio/x-wav',      // .wav (alternative)
  'audio/webm',       // .webm
  'audio/ogg',        // .ogg
  'audio/flac',       // .flac
  'audio/x-m4a',      // .m4a (alternative)
];

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_DURATION = 60 * 60; // 60 minutes in seconds
const MIN_DURATION = 10; // 10 seconds

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
  metadata?: {
    estimatedDuration?: number;
    sizeInMB?: number;
  };
}

/**
 * Validates an audio file before upload
 * Checks: format, size, and optionally duration
 */
export async function validateAudioFile(
  file: File
): Promise<FileValidationResult> {
  const warnings: string[] = [];
  const sizeInMB = file.size / 1024 / 1024;

  // Check file type
  if (!SUPPORTED_FORMATS.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file format: ${file.type}. Please use MP3, WAV, M4A, WEBM, OGG, or FLAC.`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 500MB limit. Current size: ${sizeInMB.toFixed(2)}MB`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  // Warn if file is very small
  if (file.size < 100 * 1024) { // < 100KB
    warnings.push('File is very small. It may be corrupted or incomplete.');
  }

  // Estimate duration from file size
  const estimatedDuration = estimateDuration(file);

  if (estimatedDuration > MAX_DURATION) {
    warnings.push(
      `Audio appears to exceed 60-minute limit (estimated ${Math.round(estimatedDuration / 60)} minutes). Processing may fail or take longer.`
    );
  }

  if (estimatedDuration < MIN_DURATION) {
    warnings.push(
      `Audio is very short (estimated ${Math.round(estimatedDuration)} seconds). Transcription may be less accurate.`
    );
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    metadata: {
      estimatedDuration,
      sizeInMB: parseFloat(sizeInMB.toFixed(2)),
    },
  };
}

/**
 * Estimates audio duration from file size
 * This is a rough estimate based on average bitrates
 */
function estimateDuration(file: File): number {
  let avgBytesPerSecond: number;

  switch (file.type) {
    case 'audio/wav':
    case 'audio/x-wav':
      // WAV: ~1.5MB per minute at 16-bit 44.1kHz stereo
      avgBytesPerSecond = 25000; // ~1.5MB/min / 60s
      break;
    case 'audio/flac':
      // FLAC: ~0.5-1MB per minute (compressed lossless)
      avgBytesPerSecond = 12000;
      break;
    case 'audio/mpeg':
    case 'audio/mp4':
    case 'audio/x-m4a':
      // MP3/M4A: 128kbps = 16KB/s typical
      avgBytesPerSecond = 16000;
      break;
    case 'audio/ogg':
    case 'audio/webm':
      // OGG/WEBM: ~10KB/s typical
      avgBytesPerSecond = 10000;
      break;
    default:
      // Default estimate
      avgBytesPerSecond = 16000;
  }

  return Math.round(file.size / avgBytesPerSecond);
}

/**
 * Gets actual audio duration using HTML5 Audio API
 * This is more accurate but requires loading the file in browser
 */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';

    const cleanup = () => {
      URL.revokeObjectURL(audio.src);
      audio.remove();
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout loading audio metadata'));
    }, 30000); // 30 second timeout

    audio.onloadedmetadata = () => {
      clearTimeout(timeout);
      const duration = audio.duration;
      cleanup();

      if (isNaN(duration) || duration === 0) {
        reject(new Error('Could not determine audio duration'));
      } else {
        resolve(Math.round(duration));
      }
    };

    audio.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error('Failed to load audio metadata'));
    };

    try {
      audio.src = URL.createObjectURL(file);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

/**
 * Gets SHA-256 hash of file for deduplication
 * Used to detect if same file has been uploaded before
 */
export async function getFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Sanitize filename for safe storage
 * Removes special characters and limits length
 */
export function sanitizeFilename(filename: string): string {
  // Get extension
  const lastDot = filename.lastIndexOf('.');
  const name = lastDot > 0 ? filename.substring(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.substring(lastDot) : '';

  // Remove special characters, keep only alphanumeric, dash, underscore
  const sanitized = name.replace(/[^a-zA-Z0-9-_]/g, '_');

  // Limit length
  const maxLength = 100;
  const truncated = sanitized.length > maxLength
    ? sanitized.substring(0, maxLength)
    : sanitized;

  return truncated + ext;
}
