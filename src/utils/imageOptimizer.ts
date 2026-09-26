/**
 * Image Optimizer Utility for ChapterCraft
 * Compresses oversized user-uploaded / pasted images (which can be 20MB - 60MB from camera/phone)
 * into lightweight, high-fidelity WebP/JPEG images (~150KB - 300KB) maintaining original aspect ratio.
 */

export interface OptimizedImageResult {
  dataUrl: string;
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  width: number;
  height: number;
  compressionRatio: number;
}

/**
 * Optimizes an image (File or existing base64 Data URL)
 * Max dimensions: 800px width, 1200px height (retina-sharp on screen, but only ~3.8MB uncompressed RAM footprint)
 * Quality: 0.85 JPEG
 */
export async function optimizeCoverImage(
  source: File | string,
  maxWidth: number = 800,
  maxHeight: number = 1200,
  quality: number = 0.85
): Promise<OptimizedImageResult> {
  let originalSizeBytes = 0;
  let srcUrl = '';

  if (typeof source === 'string') {
    srcUrl = source;
    // Estimate size of base64 string
    const base64Content = source.split(',')[1] || source;
    originalSizeBytes = Math.round((base64Content.length * 3) / 4);
  } else {
    originalSizeBytes = source.size;
    srcUrl = URL.createObjectURL(source);
  }

  return new Promise<OptimizedImageResult>((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // If source was Blob URL, revoke it
        if (typeof source !== 'string') {
          URL.revokeObjectURL(srcUrl);
        }

        // Calculate proportional scale
        let scale = 1;
        if (width > maxWidth || height > maxHeight) {
          scale = Math.min(maxWidth / width, maxHeight / height);
        }

        const targetWidth = Math.round(width * scale);
        const targetHeight = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Export as JPEG with 0.88 quality (superb visual fidelity, small file size)
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);

        // Compute optimized size
        const optBase64 = optimizedDataUrl.split(',')[1] || '';
        const optimizedSizeBytes = Math.round((optBase64.length * 3) / 4);
        const ratio = originalSizeBytes > 0 ? (originalSizeBytes - optimizedSizeBytes) / originalSizeBytes : 0;

        resolve({
          dataUrl: optimizedDataUrl,
          originalSizeBytes,
          optimizedSizeBytes,
          width: targetWidth,
          height: targetHeight,
          compressionRatio: Math.max(0, ratio),
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(srcUrl);
      }
      reject(new Error('Failed to load image for optimization: ' + err));
    };

    img.src = srcUrl;
  });
}

/**
 * Format bytes to readable string (e.g. 52.4 MB -> 214 KB)
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
