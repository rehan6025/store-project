import type { FooterProps } from "../types";

export function Footer({ copyrightText }: FooterProps) {
  return (
    <footer className="px-6 py-8 border-t border-gray-200 text-center text-sm text-gray-500">
      {copyrightText}
    </footer>
  );
}
