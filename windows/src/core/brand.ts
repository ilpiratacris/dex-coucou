/** Product name chosen by the user on 15 October 2026. */
export const PRODUCT_LABEL = "Goo";
/** Apply to catalog text before interpolation, never to user-provided names. */
export const brandText = (text: string): string => text
  .replace(/\bCoucou\b/g, PRODUCT_LABEL)
  .replace(/\bMochi\b/g, "Morbido");
