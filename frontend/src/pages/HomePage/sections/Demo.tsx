import { MinusIcon } from "@solar-icons/react/linear/minus";
import { MaximizeIcon } from "@solar-icons/react/linear/maximize";
import { CloseIcon } from "@solar-icons/react/linear/close";

export const Demo = () => {
  return (
    <section id="demo" className="bg-gray-100 px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-gray-300 bg-white shadow-xl">
        {/* Header of screen */}
        <div className="flex h-11 items-center justify-between border-b border-gray-200 bg-gray-50 pr-3 pl-4">
          <span className="rounded-md bg-gray-100 px-3 py-1 font-mono text-xs text-gray-600">
            sellvia.com/your-first-store
          </span>

          <div className="flex items-center gap-1.5">
            {[MinusIcon, MaximizeIcon, CloseIcon].map((Icon, i) => (
              <button
                key={i}
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-600 transition hover:bg-gray-300"
              >
                <Icon size={12} />
              </button>
            ))}
          </div>
        </div>

        {/* Screen */}
        <div className="aspect-video bg-gray-400">
          <img src="" alt="" className="h-full w-full object-contain" />
        </div>
      </div>
    </section>
  );
};
