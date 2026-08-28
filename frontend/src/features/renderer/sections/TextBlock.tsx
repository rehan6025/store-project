import type { TextBlockProps } from "../types";

export function TextBlock({ heading, body }: TextBlockProps) {
  return (
    <section className="px-6 py-16 max-w-3xl mx-auto text-center">
      {heading && (
        <h2 className="text-2xl md:text-3xl font-[var(--font-heading)] font-semibold mb-4 text-[var(--color-text)]">
          {heading}
        </h2>
      )}
      <p className="text-base leading-relaxed opacity-80">{body}</p>
    </section>
  );
}
