import {z} from "zod"

const ThemeColorsSchema = z.object({
    primary: z.string(),
    background: z.string(),
    text: z.string()
})

const ThemeFontsSchema = z.object({
    heading: z.string(),
    body: z.string()
})

const SectionSchema = z.object({
    id: z.string(),
    type: z.enum(["hero", "product-grid", "text-block", "footer"]),
    props: z.record(z.string(), z.unknown()),
});

const PageSchema = z.object({
    id:z.string(),
    slug:z.string(),
    title:z.string(),
    sections:z.array(SectionSchema),
})

const StoreConfigContentV1Schema = z.object({
    meta:z.record(z.string(), z.unknown()).optional(),
    theme: z.object({
        colors: ThemeColorsSchema,
        fonts: ThemeFontsSchema
    }),
    pages: z.array(PageSchema)
})


export const SCHEMA_VALIDATORS: Record<string, z.ZodTypeAny> = {
    "1.0.0": StoreConfigContentV1Schema,
    // When v2 is designed tomorrow, we'll only add: "2.0.0": storeConfigContentV2Schema
};
