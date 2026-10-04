export type ThemeColors = {
    primary: string;
    background: string;
    text: string;
};

export type ThemeFonts = {
    heading: string;
    body: string;
};

export interface Theme {
    colors: ThemeColors;
    fonts: ThemeFonts;
}

export type Section = {
    id: string;
    type: "hero" | "product-grid" | "text-block" | "footer" | string;
    props: Record<string, any>;
};

export interface Page {
    id: string;
    slug: string;
    title: string;
    sections: Section[];
}

export interface StoreConfigContent {
    meta: {
        name: string;
        [key: string]: any;
    };
    theme: Theme;
    pages: Page[];
}

export interface StoreSchemaResponse {
    schemaVersion: string;
    storeId: string;
    version: number;
    meta: {
        name: string;
        [key: string]: any;
    };
    theme: Theme;
    pages: Page[];
}

export const DEFAULT_STORE_CONFIG_CONTENT: StoreConfigContent = {
    meta: {
        name: "My Store",
    },
    theme: {
        colors: {
            primary: "#7c3aed",
            background: "#ffffff",
            text: "#111827",
        },
        fonts: {
            heading: "Poppins",
            body: "Inter",
        },
    },
    pages: [
        {
            id: "page_home",
            slug: "/",
            title: "Home",
            sections: [
                {
                    id: "sec_hero",
                    type: "hero",
                    props: {
                        heading: "Welcome to Our Store",
                        subheading: "Discover our featured products and special offers.",
                        imageUrl: "/images/hero.jpg",
                        ctaText: "Shop Now",
                        ctaHref: "/products",
                    },
                },
                {
                    id: "sec_products",
                    type: "product-grid",
                    props: {
                        title: "Featured Products",
                        columns: 3,
                        categoryId: "all",
                    },
                },
                {
                    id: "sec_about",
                    type: "text-block",
                    props: {
                        heading: "About Us",
                        body: "Crafted with passion, delivered to your door.",
                    },
                },
                {
                    id: "sec_footer",
                    type: "footer",
                    props: {
                        copyrightText: "© 2026 Sellvia Store. All rights reserved.",
                    },
                },
            ],
        },
    ],
};
