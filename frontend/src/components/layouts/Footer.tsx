import { siteConfig } from "@/data";

const year = new Date().getFullYear();

export const Footer = () => {
  const { footerSection, name } = siteConfig;

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-8 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          {/* Brand Block */}
          <div>
            {/* <div className="mb-5">
              <img src="/logo.svg" alt={`${name} logo`} className="h-9 w-auto" />
            </div>
            */}
            <a href="/" className="text-2xl font-semibold text-gray-100">
              {name}
            </a>
          </div>

          {/* Link Columns */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {footerSection.columns.map((column) => (
              // Mapping the columns
              <ul key={column.title} className="space-y-3">
                <li className="mb-5 text-base font-semibold text-gray-100">{column.title}</li>

                {column.links.map((link) => (
                  // Mapping the column links
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm transition-colors hover:text-gray-100 focus-visible:text-gray-100"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ))}
          </nav>
        </div>

        <div className="mt-14 h-px w-full bg-gray-400/30" />

        {/* Bottom Bar */}
        <div className="mt-6 flex flex-col gap-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {name}. {footerSection.copyright}
          </p>

          <ul className="flex items-center gap-6">
            {footerSection.legal.map((item) => (
              <li key={item.label}>
                <a href={item.href} className="transition-colors hover:text-gray-100">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
};
