export function isImage(mime: string) {
  return mime.startsWith("image/");
}
export function isVideo(mime: string) {
  return mime.startsWith("video/");
}
export function isAudio(mime: string) {
  return mime.startsWith("audio/");
}

export function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export function readMediaDuration(file: File, kind: "video" | "audio"): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement(kind);
    const url = URL.createObjectURL(file);
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      resolve(el.duration || 0);
      URL.revokeObjectURL(url);
    };
    el.onerror = () => {
      resolve(0);
      URL.revokeObjectURL(url);
    };
    el.src = url;
  });
}
