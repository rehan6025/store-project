export interface NavItem {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: NavItem[];
}

export interface FooterSection {
  columns: FooterColumn[];
  copyright: string;
  legal: NavItem[];
}

export interface SiteConfig {
  name: string;
  description: string;
  navigation: NavItem[];
  footerSection: FooterSection;
}

export const siteConfig: SiteConfig = {
  name: "Sellvia",
  description: "A store-front builder",

  navigation: [
    { label: "Features", href: "/features" },
    { label: "Solutions", href: "/solutions" },
    { label: "Pricing", href: "/pricing" },
    { label: "Sign In", href: "/login" },
    { label: "Get Started", href: "/signup" },
  ],

  footerSection: {
    columns: [
      {
        title: "Company",
        links: [
          { label: "About Us", href: "/about" },
          { label: "Careers", href: "/careers" },
          { label: "Newsroom", href: "/newsroom" },
          { label: "Partners", href: "/partners" },
        ],
      },
      {
        title: "Product",
        links: [
          { label: "Features", href: "/features" },
          { label: "Solutions", href: "/solutions" },
          { label: "Pricing", href: "/pricing" },
          { label: "Integrations", href: "/integrations" },
        ],
      },
      {
        title: "Resources",
        links: [
          { label: "Blog", href: "/blog" },
          { label: "Guides", href: "/guides" },
          { label: "Free Tools", href: "/tools" },
          { label: "Changelog", href: "/changelog" },
        ],
      },
      {
        title: "Support",
        links: [
          { label: "Help Center", href: "/help" },
          { label: "Community", href: "/community" },
          { label: "Contact Us", href: "/contact" },
          { label: "Service Status", href: "/status" },
        ],
      },
    ],

    copyright: "All rights reserved.",
    legal: [
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
};
