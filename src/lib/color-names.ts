/**
 * Colour name → hex swatch mapping shared by the AI Product Assistant.
 * The product schema stores colours as { name, hex }; the assistant maps
 * everyday colour words deterministically (no AI involved for hex values).
 * Unknown names fall back to a neutral swatch the owner can adjust later.
 */

const COLOR_HEX: Record<string, string> = {
  black: "#111111", white: "#F5F5F0", ivory: "#FFFFF0", cream: "#F3EAD3",
  red: "#C0392B", burgundy: "#7A2235", maroon: "#6E1F2E", wine: "#5E1224",
  pink: "#E58FA2", rose: "#E8A0A8", magenta: "#C03582", purple: "#6C3FA0",
  lavender: "#B497D6", navy: "#1F2A44", blue: "#2E5FA3", sky: "#7FB2E5",
  teal: "#1F7A70", turquoise: "#30B8A6", green: "#2E7D46", olive: "#6B7A2E",
  emerald: "#1E8A5A", sage: "#9CAF88", yellow: "#E6B830", gold: "#C9A227",
  mustard: "#C8A028", orange: "#D97B29", rust: "#A44A2A", terracotta: "#B45A3C",
  brown: "#6B4A33", tan: "#C9A876", beige: "#D9C7A7", khaki: "#8B7D5A",
  grey: "#8A8A8A", gray: "#8A8A8A", charcoal: "#3A3A3A", silver: "#BFC1C2",
  leopard: "#A67B45", multicolour: "#7A6EA0", multicolor: "#7A6EA0",
};

const FALLBACK_HEX = "#666666";

export function colorWithHex(name: string): { name: string; hex: string } {
  const clean = name.trim().slice(0, 40);
  return { name: clean, hex: COLOR_HEX[clean.toLowerCase()] ?? FALLBACK_HEX };
}
