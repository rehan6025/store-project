import { CursorIcon } from "@solar-icons/react/linear/cursor";
import { GlobeIcon } from "@solar-icons/react/linear/globe";
import { CardIcon } from "@solar-icons/react/linear/card";
import { GraphUpIcon } from "@solar-icons/react/linear/graph-up";
import type { Icon } from "@solar-icons/react/lib/types";

type CardLayout = "stacked" | "split";

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: Icon;
  /** stacked: preview above text. split: text beside preview (md and up). */
  layout: CardLayout;
  /** Static Tailwind column-span class so the bento rows stay uneven. */
  span: string;
  /** Dashed border marks the "live" card, a nod to its real-time data. */
  dashed?: boolean;
}

const FEATURES: readonly FeatureItem[] = [
  {
    id: "canvas",
    title: "Modular Drag-and-Drop Canvas",
    description:
      "Assemble headers, product galleries, and banners with snap-to-grid precision. True WYSIWYG editing with zero code.",
    icon: CursorIcon,
    layout: "stacked",
    span: "md:col-span-7",
  },
  {
    id: "edge",
    title: "Uncrashable Edge Infrastructure",
    description:
      "Pre-compiled storefronts distributed across global edge caches to absorb viral drops and flash sales with 0% downtime.",
    icon: GlobeIcon,
    layout: "stacked",
    span: "md:col-span-5",
  },
  {
    id: "checkout",
    title: "Native 1-Click Checkout",
    description:
      "Built-in express checkout modules supporting Stripe, Apple Pay, and Google Pay for sub-second transaction completion.",
    icon: CardIcon,
    layout: "stacked",
    span: "md:col-span-5",
  },
  {
    id: "telemetry",
    title: "Zero-Latency Store Telemetry",
    description:
      "Monitor live concurrent sessions, checkout conversion rates, and global latency without adding bloatware tracking scripts.",
    icon: GraphUpIcon,
    layout: "split",
    span: "md:col-span-7",
    dashed: true,
  },
] as const;

interface PreviewPlaceholderProps {
  title: string;
  icon: Icon;
  className?: string;
}

/** Image slot: a plain div, never an <img>. */
function PreviewPlaceholder({ title, icon: Icon, className = "" }: PreviewPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={`UI preview placeholder for ${title}`}
      className={`relative flex flex-col items-center justify-center gap-2 rounded-lg bg-gray-400 text-gray-100 ${className}`}
    >
      <span aria-hidden="true" className="absolute top-3 left-3 flex gap-1.5">
        <span className="h-2 w-2 rounded-full bg-gray-100" />
        <span className="h-2 w-2 rounded-full bg-gray-100" />
        <span className="h-2 w-2 rounded-full bg-gray-100" />
      </span>
      <Icon className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
      <span className="text-sm font-medium tracking-wide"></span>
    </div>
  );
}

function FeatureText({ feature }: { feature: FeatureItem }) {
  const Icon = feature.icon;
  return (
    <div className="flex flex-col items-start">
      <span
        aria-hidden="true"
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-gray-100"
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <h3 className="text-xl font-semibold tracking-tight text-gray-900">{feature.title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-900">{feature.description}</p>
    </div>
  );
}

function FeatureCard({ feature }: { feature: FeatureItem }) {
  const isSplit = feature.layout === "split";

  return (
    <li
      className={[
        "flex rounded-2xl border bg-gray-100 p-6 transition-colors duration-200 motion-reduce:transition-none",
        "border-gray-400 focus-within:border-gray-900 hover:border-gray-900",
        feature.dashed ? "border-dashed" : "border-solid",
        isSplit ? "flex-col gap-6 md:flex-row md:items-stretch" : "flex-col gap-6",
        feature.span,
      ].join(" ")}
    >
      {isSplit ? (
        <>
          <div className="flex md:w-1/2 md:items-center">
            <FeatureText feature={feature} />
          </div>
          <PreviewPlaceholder
            title={feature.title}
            icon={feature.icon}
            className="h-48 w-full md:h-auto md:min-h-56 md:w-1/2"
          />
        </>
      ) : (
        <>
          <PreviewPlaceholder
            title={feature.title}
            icon={feature.icon}
            className="h-48 w-full md:h-56"
          />
          <FeatureText feature={feature} />
        </>
      )}
    </li>
  );
}

export function Features() {
  return (
    <section
      aria-labelledby="features-heading"
      className="bg-gray-100 px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mx-auto mb-14 max-w-2xl text-center lg:mb-16">
          <span className="inline-block rounded-full border border-gray-400 px-4 py-1.5 text-xs font-semibold tracking-wide text-gray-900">
            Platform Features
          </span>
          <h2
            id="features-heading"
            className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl"
          >
            Built to Launch Fast and Stay Fast
          </h2>
          <p className="mt-4 text-base text-gray-400 sm:text-lg">
            Four core capabilities for building, scaling, and measuring your store.
          </p>
        </header>

        <ul className="grid grid-cols-1 gap-8 md:grid-cols-12">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </ul>

        <p className="mt-12 text-center text-sm text-gray-400">And a lot more on the way.</p>
      </div>
    </section>
  );
}
