/**
 * Compress an image file to a maximum size
 * @param file - The image file to compress
 * @param maxSizeMB - Maximum file size in MB (default: 4MB)
 * @returns Promise<Blob> - Compressed image blob
 */
export async function compressImage(
  file: File,
  maxSizeMB: number = 4
): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onerror = () => {
      resolve(new Blob([file], { type: "image/jpeg" }));
    };
    
    reader.onabort = () => {
      resolve(new Blob([file], { type: "image/jpeg" }));
    };
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onerror = () => {
        resolve(new Blob([file], { type: "image/jpeg" }));
      };
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Calculate compression ratio
        let quality = 0.9;
        let attempts = 0;
        const maxAttempts = 5;

        const compressWithQuality = () => {
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx === null) {
            resolve(new Blob([file], { type: "image/jpeg" }));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              try {
                if (blob) {
                  const sizeMB = blob.size / 1024 / 1024;
                  if (sizeMB > maxSizeMB && quality > 0.1 && attempts < maxAttempts) {
                    quality -= 0.15;
                    attempts++;
                    compressWithQuality();
                  } else {
                    resolve(blob);
                  }
                } else {
                  resolve(new Blob([file], { type: "image/jpeg" }));
                }
              } catch {
                resolve(new Blob([file], { type: "image/jpeg" }));
              }
            },
            "image/jpeg",
            quality
          );
        };

        compressWithQuality();
      };
    };
  });
}

/**
 * Convert File to compressed Blob with size display
 * @param file - The file to compress
 * @param maxSizeMB - Maximum file size in MB
 * @returns Object with originalSize and compressedSize info
 */
export async function compressImageWithInfo(
  file: File,
  maxSizeMB: number = 4
): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> {
  const originalSize = file.size;
  const blob = await compressImage(file, maxSizeMB);
  return {
    blob,
    originalSize,
    compressedSize: blob.size,
  };
}
