import type { ComponentType } from "react";
import type { Section } from "./types";
import { Hero } from "./sections/Hero";
import { ProductGrid } from "./sections/ProductGrid";
import { TextBlock } from "./sections/TextBlock";
import { Footer } from "./sections/Footer";

export const sectionRegistry: {
  [K in Section["type"]]: ComponentType<Extract<Section, { type: K }>["props"]>;
} = {
  hero: Hero,
  "product-grid": ProductGrid,
  "text-block": TextBlock,
  footer: Footer,
};
