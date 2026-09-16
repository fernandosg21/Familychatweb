import { isImage } from "@/lib/media";

/**
 * Reduz o tamanho de imagens antes do upload (anexos de conversa): mantém o
 * arquivo original se ele já for pequeno ou se a otimização não ajudar.
 * GIFs ficam de fora para não perder a animação (canvas só captura 1 frame).
 */
export async function optimizeImage(
  file: File,
  { maxDimension = 1600, quality = 0.82 }: { maxDimension?: number; quality?: number } = {}
): Promise<File> {
  if (!isImage(file.type) || file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const alreadySmall = scale >= 1 && file.size < 700 * 1024;
    if (alreadySmall) {
      bitmap.close();
      return file;
    }

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^./]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export interface CropRegion {
  /** Deslocamento da imagem em relação ao canto superior do viewport de recorte, em px de tela. */
  x: number;
  y: number;
  /** Escala aplicada à imagem original (1 = tamanho natural). */
  scale: number;
  /** Lado do viewport de recorte (quadrado), em px de tela. */
  viewportSize: number;
}

/**
 * Recorta a região selecionada pelo usuário para um quadrado de saída e
 * comprime como JPEG. Usado para foto de perfil.
 */
export async function cropImageToSquare(
  file: File,
  region: CropRegion,
  outputSize = 512,
  quality = 0.88
): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const outputScale = outputSize / region.viewportSize;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não suportado.");

  ctx.drawImage(
    bitmap,
    0,
    0,
    bitmap.width,
    bitmap.height,
    region.x * outputScale,
    region.y * outputScale,
    bitmap.width * region.scale * outputScale,
    bitmap.height * region.scale * outputScale
  );
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Falha ao gerar a imagem recortada.");

  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}
