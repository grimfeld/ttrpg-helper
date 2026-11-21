/** The 16:9 canvas every Scene is composed on, and how an image fits it. */

export const CANVAS_ASPECT = 16 / 9;

export type Fit = "cover" | "contain";

/** A rectangle as fractions of the canvas: 0..1 is the canvas, beyond it is cropped. */
export interface CanvasRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Where an image of this size sits on the canvas. Cover fills the canvas and crops the
 * overflow; Contain shows the whole image, letterboxed. Both are centred.
 */
export function fitRect(
  image: { readonly width: number; readonly height: number },
  fit: Fit
): CanvasRect {
  if (image.width <= 0 || image.height <= 0) {
    return { left: 0, top: 0, width: 1, height: 1 };
  }
  const imageAspect = image.width / image.height;
  const wider = imageAspect > CANVAS_ASPECT;
  // Cover scales to the tighter side, Contain to the looser one.
  const matchHeight = fit === "cover" ? wider : !wider;
  const width = matchHeight ? imageAspect / CANVAS_ASPECT : 1;
  const height = matchHeight ? 1 : CANVAS_ASPECT / imageAspect;
  return { left: (1 - width) / 2, top: (1 - height) / 2, width, height };
}

/**
 * Where an Overlay sits on the canvas: its centre and its height as fractions of the canvas,
 * and its width from the image's aspect ratio.
 */
export function overlayRect(
  overlay: {
    readonly position: { readonly x: number; readonly y: number };
    readonly height: number;
  },
  image: { readonly width: number; readonly height: number }
): CanvasRect {
  const imageAspect =
    image.width > 0 && image.height > 0 ? image.width / image.height : 1;
  const height = overlay.height;
  const width = (height * imageAspect) / CANVAS_ASPECT;
  return {
    left: overlay.position.x - width / 2,
    top: overlay.position.y - height / 2,
    width,
    height,
  };
}
