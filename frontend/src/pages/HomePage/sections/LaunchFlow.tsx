import { useState } from "react";
import { PaletteIcon } from "@solar-icons/react/linear/palette";
import { WidgetIcon } from "@solar-icons/react/linear/widget";
import { CardIcon } from "@solar-icons/react/linear/card";
import { RocketIcon } from "@solar-icons/react/linear/rocket";
import type { Icon } from "@solar-icons/react/lib/types";

interface StepItem {
  id: number;
  badge: string;
  title: string;
  description: string;
  icon: Icon;
}

const STEPS: readonly StepItem[] = [
  {
    id: 1,
    badge: "01",
    title: "Pick Your Blueprint",
    description:
      "Select battle-tested storefront templates pre-engineered for mobile speed and instant impulse checkouts.",
    icon: PaletteIcon,
  },
  {
    id: 2,
    badge: "02",
    title: "Snap Blocks Together",
    description:
      "Drag and drop modular commerce blocks—product grids, urgency timers, and trust badges—onto your live canvas.",
    icon: WidgetIcon,
  },
  {
    id: 3,
    badge: "03",
    title: "Connect Instant Payouts",
    description:
      "Link Payment Gateway in two clicks with zero custom API keys or webhook headaches.",
    icon: CardIcon,
  },
  {
    id: 4,
    badge: "04",
    title: "Deploy to the Edge",
    description:
      "Hit publish to deploy across global edge servers capable of absorbing 10,000 visitors per second out of the box.",
    icon: RocketIcon,
  },
] as const;

interface StepCardProps {
  step: StepItem;
  isActive: boolean;
  isLast: boolean;
  onActivate: (id: number) => void;
}

function StepCard({ step, isActive, isLast, onActivate }: StepCardProps) {
  const Icon = step.icon;

  return (
    <li className="relative w-72 shrink-0 snap-start lg:w-auto">
      <button
        type="button"
        aria-pressed={isActive}
        onClick={() => onActivate(step.id)}
        onMouseEnter={() => onActivate(step.id)}
        onFocus={() => onActivate(step.id)}
        className={[
          "flex h-full w-full flex-col items-start rounded-2xl border-2 bg-gray-100 p-6 text-left",
          "transition-all duration-200 motion-reduce:transition-none",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100",
          isActive ? "-translate-y-1 border-gray-900 shadow-lg" : "border-gray-400 shadow-none",
        ].join(" ")}
      >
        <div className="mb-6 flex w-full items-center justify-between">
          <span
            className={[
              "flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-colors duration-200 motion-reduce:transition-none",
              isActive
                ? "border-gray-900 bg-gray-900 text-gray-100"
                : "border-gray-400 bg-gray-100 text-gray-900",
            ].join(" ")}
            aria-hidden="true"
          >
            <Icon className="h-6 w-6" strokeWidth={1.75} />
          </span>

          <span
            className={[
              "rounded-full border px-3 py-1 text-sm font-semibold tabular-nums transition-colors duration-200 motion-reduce:transition-none",
              isActive
                ? "border-gray-900 bg-gray-900 text-gray-100"
                : "border-gray-400 bg-gray-100 text-gray-900",
            ].join(" ")}
          >
            {step.badge}
          </span>
        </div>

        <h3 className="mb-2 text-lg font-semibold tracking-tight text-gray-900">{step.title}</h3>
        <p className="text-sm leading-relaxed text-gray-900">{step.description}</p>
      </button>

      {/* Horizontal dashed connector between side-by-side cards */}
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute top-12 -right-10 w-10 border-t-2 border-dashed border-gray-400"
        />
      )}
    </li>
  );
}

export const LaunchFlow = () => {
  const [activeStep, setActiveStep] = useState<number>(1);

  return (
    <section
      aria-labelledby="launch-flow-heading"
      className="bg-gray-100 px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto mb-14 max-w-2xl text-center lg:mb-20">
          <span className="inline-block rounded-full border border-gray-400 px-4 py-1.5 text-xs font-semibold tracking-widest text-gray-900 uppercase">
            EFFORTLESS DEPLOYMENT
          </span>
          <h2
            id="launch-flow-heading"
            className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl"
          >
            From Blank Canvas to Live Store in Under 5 Minutes
          </h2>
          <p className="mt-4 text-base text-gray-400 sm:text-lg">
            No code, no server configurations, no plugin bloat.
          </p>
        </header>

        <ol className="flex snap-x snap-mandatory gap-10 overflow-x-auto px-2 pt-3 pb-6 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {STEPS.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              isActive={activeStep === step.id}
              isLast={index === STEPS.length - 1}
              onActivate={setActiveStep}
            />
          ))}
        </ol>
      </div>
    </section>
  );
};
