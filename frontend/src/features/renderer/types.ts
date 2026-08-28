export type ThemeColors = {
  primary: string;
  background: string;
  text: string;
};

export type ThemeFonts = {
  heading: string;
  body: string;
};

export interface Theme {
  colors: ThemeColors;
  fonts: ThemeFonts;
}

export interface HeroProps {
  heading: string;
  subheading?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaHref?: string;
}

export interface ProductGridProps {
  title?: string;
  columns?: number;
  categoryId: string;
}

export interface TextBlockProps {
  heading?: string;
  body: string;
}

export interface FooterProps {
  copyrightText?: string;
}

export type Section =
  | { id: string; type: "hero"; props: HeroProps }
  | { id: string; type: "product-grid"; props: ProductGridProps }
  | { id: string; type: "text-block"; props: TextBlockProps }
  | { id: string; type: "footer"; props: FooterProps };

export interface Page {
  id: string;
  slug: string;
  title: string;
  sections: Section[];
}

export interface StoreSchema {
  schemaVersion: string;
  storeId: string;
  version: number;
  meta: { name: string; [key: string]: unknown };
  theme: Theme;
  pages: Page[];
}
