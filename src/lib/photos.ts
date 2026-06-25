import { uploadImage } from './sync';

// Recipe photos are downscaled in the browser before upload — a phone photo is
// several MB, but a recipe card needs nothing close to that. Cuts bandwidth,
// R2 storage, and load time.
const MAX_DIM = 1280;
const QUALITY = 0.82;

/** Downscale an image file in the browser, then upload it. Returns the URL. */
export async function uploadRecipePhoto(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;
  let blob: Blob = file;
  try {
    blob = await downscale(file);
  } catch {
    /* fall back to the original; the server still caps the size */
  }
  return uploadImage(blob);
}

function downscale(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('no canvas context'));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image load failed'));
    };
    img.src = url;
  });
}
