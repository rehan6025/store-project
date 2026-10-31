import { siteConfig } from "@/data";
import { Button } from "@/components/ui";

export const Hero = () => {
  const { about, hero } = siteConfig;
  // const [] = hero.images;

  return (
    <section className="bg-gray-100">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            {hero.title} <span className="italic">{hero.titleHighlight}</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-gray-400">{about}</p>

          <a href={hero.cta.href} className="mt-8 inline-block">
            <Button label={hero.cta.label} />
          </a>
        </div>

        {/* Image grid */}
        <div className="grid grid-cols-5 grid-rows-2 gap-4">
          <div className="col-span-3 h-48 overflow-hidden rounded-3xl bg-gray-400 sm:h-56">
            <img src="" alt="" className="h-full w-full object-cover" />
          </div>

          <div className="col-span-2 flex h-48 flex-col items-center justify-center rounded-[3rem] bg-gray-400/30 p-4 text-center sm:h-56">
            <img src="" alt="" className="h-full w-full object-cover" />
          </div>

          <div className="col-span-2 flex h-48 flex-col items-center justify-center rounded-[3rem] bg-gray-900 p-4 text-center sm:h-56">
            <img src="" alt="" className="h-full w-full object-cover" />
          </div>

          <div className="col-span-3 h-48 overflow-hidden rounded-3xl bg-gray-400 sm:h-56">
            <img src="" alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
};
