const MAX_AVATAR_BYTES = 50 * 1024;
const INITIAL_SIZE = 512;
const MIN_SIZE = 96;

type FaceDetectionResult = {
  boundingBox: DOMRectReadOnly;
};

type FaceDetectorConstructor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
  detect: (source: CanvasImageSource) => Promise<FaceDetectionResult[]>;
};

type CropSource = {
  x: number;
  y: number;
  size: number;
};

declare global {
  interface Window {
    FaceDetector?: FaceDetectorConstructor;
  }
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not process image"));
      },
      "image/jpeg",
      quality
    );
  });

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file"));
    };
    image.src = url;
  });

const getCenterCropSource = (image: HTMLImageElement): CropSource => {
  const size = Math.min(image.naturalWidth, image.naturalHeight);
  return {
    x: Math.floor((image.naturalWidth - size) / 2),
    y: Math.floor((image.naturalHeight - size) / 2),
    size,
  };
};

const getFaceAwareCropSource = async (image: HTMLImageElement): Promise<CropSource> => {
  const centerCrop = getCenterCropSource(image);

  if (!window.FaceDetector) {
    return centerCrop;
  }

  try {
    const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
    const faces = await detector.detect(image);
    const face = faces
      .filter((item) => item.boundingBox.width > 0 && item.boundingBox.height > 0)
      .sort((a, b) => (b.boundingBox.width * b.boundingBox.height) - (a.boundingBox.width * a.boundingBox.height))[0];

    if (!face) {
      return centerCrop;
    }

    const sourceSize = centerCrop.size;
    const faceCenterX = face.boundingBox.x + face.boundingBox.width / 2;
    const faceCenterY = face.boundingBox.y + face.boundingBox.height / 2;

    return {
      x: Math.floor(clamp(faceCenterX - sourceSize / 2, 0, image.naturalWidth - sourceSize)),
      y: Math.floor(clamp(faceCenterY - sourceSize / 2, 0, image.naturalHeight - sourceSize)),
      size: sourceSize,
    };
  } catch {
    return centerCrop;
  }
};

const renderSquare = (image: HTMLImageElement, outputSize: number, source: CropSource): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image processing is not supported in this browser");
  }

  context.drawImage(image, source.x, source.y, source.size, source.size, 0, 0, outputSize, outputSize);
  return canvas;
};

export async function prepareAvatarImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file");
  }

  const image = await loadImage(file);
  const cropSource = await getFaceAwareCropSource(image);
  let size = Math.min(INITIAL_SIZE, image.naturalWidth, image.naturalHeight);
  let quality = 0.85;
  let bestBlob: Blob | null = null;

  while (size >= MIN_SIZE) {
    const canvas = renderSquare(image, size, cropSource);

    while (quality >= 0.45) {
      const blob = await canvasToBlob(canvas, quality);
      bestBlob = blob;

      if (blob.size <= MAX_AVATAR_BYTES) {
        return new File([blob], "avatar.jpg", { type: "image/jpeg" });
      }

      quality -= 0.1;
    }

    size = Math.floor(size * 0.82);
    quality = 0.82;
  }

  if (bestBlob && bestBlob.size <= MAX_AVATAR_BYTES) {
    return new File([bestBlob], "avatar.jpg", { type: "image/jpeg" });
  }

  throw new Error("Could not compress image below 50KB. Please choose a simpler image.");
}
