import type { Section } from "./types";
import { sectionRegistry } from "./sectionRegistry";

interface SectionRendererProps {
  section: Section;
}

export function SectionRenderer({ section }: SectionRendererProps) {
  const Component = sectionRegistry[section.type] as
    | React.ComponentType<any>
    | undefined;

  if (!Component) {
    if (import.meta.env.DEV) {
      console.warn(
        `[renderer] Unknown section type: "${section.type}"`,
        section,
      );
    }
    return (
      <div>
        Unsupported section type: <code>{section.type}</code>
      </div>
    );
  }

  return <Component {...section.props} />;
}
