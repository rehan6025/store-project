import type { ReactNode, CSSProperties } from "react";
import type { Theme } from "./types";

interface ThemeProviderProps {
  theme: Theme;
  children: ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  const style = {
    "--color-primary": theme.colors.primary,
    "--color-background": theme.colors.background,
    "--color-text": theme.colors.text,
    "--font-heading": theme.fonts.heading,
    "--font-body": theme.fonts.body,
  } as CSSProperties;

  return (
    <div
      style={{
        ...style,
        backgroundColor: "var(--color-background)",
        color: "var(--color-text)",
      }}
      className="font-[var(--font-body)] min-h-screen"
    >
      {children}
    </div>
  );
}
