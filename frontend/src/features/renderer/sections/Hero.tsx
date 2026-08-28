import type { HeroProps } from "../types";

export function Hero({
  heading,
  subheading,
  imageUrl,
  ctaText,
  ctaHref,
}: HeroProps) {
  return (
    <section
      className="relative flex flex-col items-center justify-center text-center px-6 py-24 bg-cover bg-center"
      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
    >
      {imageUrl && (
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      )}
      <div className="relative z-10 max-w-2xl text-white">
        <h1 className="text-4xl md:text-5xl font-[var(--font-heading)] font-bold mb-4">
          {heading}
        </h1>
        {subheading && (
          <p className="text-lg md:text-xl mb-6 opacity-90">{subheading}</p>
        )}
        {ctaText && ctaHref && (
          <a
            href={ctaHref}
            className="inline-block rounded-full px-6 py-3 font-medium bg-[var(--color-primary)] text-white hover:opacity-90 transition"
          >
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
