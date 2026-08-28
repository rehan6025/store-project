import type { ProductGridProps } from "../types";

export function ProductGrid({
  title,
  columns = 3,
  categoryId,
}: ProductGridProps) {
  const placeholderCount = columns * 2;
  const gridColsClass =
    { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" }[
      columns
    ] ?? "sm:grid-cols-3";

  return (
    <section className="px-6 py-16">
      {title && (
        <h2 className="text-2xl md:text-3xl font-[var(--font-heading)] font-semibold text-center mb-10 text-[var(--color-text)]">
          {title}
        </h2>
      )}
      <div
        className={`grid grid-cols-1 ${gridColsClass} gap-6 max-w-6xl mx-auto`}
      >
        {Array.from({ length: placeholderCount }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 overflow-hidden shadow-sm"
          >
            <div className="aspect-square bg-gray-100" />
            <div className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-gray-400 mt-4">
        category: {categoryId} (real products load from the API later)
      </p>
    </section>
  );
}
