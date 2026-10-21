import { Button } from "@/components/ui";
import { siteConfig } from "@/data";

export const Navbar = () => {
  const { name, navigation } = siteConfig;

  return (
    <header className="border-b border-gray-400/30 bg-gray-100">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-2 lg:px-8"
      >
        {/* Brand */}
        <a href="/" className="text-2xl font-semibold text-gray-900">
          {name}
        </a>

        {/* Links */}
        <ul className="flex flex-wrap items-center gap-6">
          {navigation.map((item) => (
            <li key={item.label}>
              {item.label === "Get Started" ? (
                <a href={item.href}>
                  <Button label={item.label} />
                </a>
              ) : (
                <a
                  href={item.href}
                  className="text-sm font-medium text-gray-900 transition-colors hover:text-gray-400 focus-visible:text-gray-100"
                >
                  {item.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
};
