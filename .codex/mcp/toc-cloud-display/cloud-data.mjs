import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const MIME_TYPES = new Map([
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
]);

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function readCloudImage(imagePath, options = {}) {
  if (typeof imagePath !== "string" || !imagePath.trim()) {
    throw new Error("Нужен абсолютный путь к PNG или SVG Тучи.");
  }

  const allowedRoot = path.resolve(
    options.allowedRoot ?? process.env.TOC_CLOUD_ALLOWED_ROOT ?? "C:\\Users\\tocpeople\\IWE"
  );
  const resolvedPath = path.resolve(imagePath);
  if (!path.isAbsolute(imagePath) || !isInside(allowedRoot, resolvedPath)) {
    throw new Error(`Файл должен находиться внутри ${allowedRoot}.`);
  }

  const extension = path.extname(resolvedPath).toLowerCase();
  const mimeType = MIME_TYPES.get(extension);
  if (!mimeType) {
    throw new Error("Поддерживаются только PNG и SVG.");
  }

  const fileStat = await stat(resolvedPath);
  if (!fileStat.isFile() || fileStat.size === 0) {
    throw new Error("Файл Тучи отсутствует или пуст.");
  }
  if (fileStat.size > MAX_IMAGE_BYTES) {
    throw new Error("Файл Тучи превышает допустимый размер 12 МБ.");
  }

  const bytes = await readFile(resolvedPath);
  return {
    fileName: path.basename(resolvedPath),
    mimeType,
    byteSize: bytes.length,
    dataUrl: `data:${mimeType};base64,${bytes.toString("base64")}`,
  };
}

export async function publishCloudImage(image, outputPath) {
  if (image?.mimeType !== "image/png" || typeof image.dataUrl !== "string") {
    throw new Error("Для окна браузера нужна Туча в формате PNG.");
  }
  if (typeof outputPath !== "string" || !path.isAbsolute(outputPath)) {
    throw new Error("Нужен абсолютный путь публикации Тучи.");
  }

  const commaIndex = image.dataUrl.indexOf(",");
  if (commaIndex < 0) {
    throw new Error("PNG Тучи не содержит данных изображения.");
  }

  const resolvedOutput = path.resolve(outputPath);
  const temporaryOutput = `${resolvedOutput}.${process.pid}.${Date.now()}.tmp`;
  const bytes = Buffer.from(image.dataUrl.slice(commaIndex + 1), "base64");

  await mkdir(path.dirname(resolvedOutput), { recursive: true });
  try {
    await writeFile(temporaryOutput, bytes);
    await rm(resolvedOutput, { force: true });
    await rename(temporaryOutput, resolvedOutput);
  } finally {
    await rm(temporaryOutput, { force: true });
  }

  return {
    outputPath: resolvedOutput,
    byteSize: bytes.length,
  };
}
