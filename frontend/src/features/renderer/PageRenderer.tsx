import { useEffect } from "react";
import type { StoreSchema } from "./types";
import { ThemeProvider } from "./ThemeProvider";
import { SectionRenderer } from "./SectionRenderer";

interface PageRendererProps {
  schema: StoreSchema;
  slug: string;
}

export function PageRenderer({ schema, slug }: PageRendererProps) {
  const page = schema.pages.find((p) => p.slug === slug);

  useEffect(() => {
    if (page) document.title = page.title;
  }, [page]);

  if (!page) {
    return (
      <div>
        <h1>Page not found</h1>
        <p>No page exists at "{slug}" for this store.</p>
      </div>
    );
  }

  return (
    <ThemeProvider theme={schema.theme}>
      {page.sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </ThemeProvider>
  );
}
