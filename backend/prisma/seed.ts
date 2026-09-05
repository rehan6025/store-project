import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

console.log("DEBUG STATEMENT 1!!!");
console.log(process.env.DATABASE_URL);
const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
    //---------------------------------
    // USER 1 + STORE 1
    //---------------------------------

    const user1 = await prisma.user.upsert({
        where: {
            email: "owner1@sellvia.dev",
        },
        update: {},
        create: {
            email: "owner1@sellvia.dev",
            passwordHash: "demo_hash_1",
            role: "OWNER",
        },
    });

    const store1 = await prisma.store.create({
        data: {
            ownerUserId: user1.id,
            name: "Fresh Bakery",
            slug: "fresh-bakery",
            plan: "BASIC",
            allowsDelivery: true,
            allowsPickup: true,
        },
    });

    // Categories
    const cakes1 = await prisma.category.create({
        data: {
            storeId: store1.id,
            name: "Cakes",
            slug: "cakes",
        },
    });

    const brownies1 = await prisma.category.create({
        data: {
            storeId: store1.id,
            name: "Brownies",
            slug: "brownies",
        },
    });

    // Products
    const cake1 = await prisma.product.create({
        data: {
            storeId: store1.id,
            name: "Chocolate Truffle Cake",
            slug: "chocolate-truffle-cake",
            description: "Rich chocolate cake with truffle frosting.",
            price: 499,
            currency: "INR",
            imageUrl: "https://example.com/chocolate-cake.jpg",
            status: "ACTIVE",

            productCategories: {
                create: [{ categoryId: cakes1.id }],
            },
        },
    });

    const brownie1 = await prisma.product.create({
        data: {
            storeId: store1.id,
            name: "Fudge Brownie",
            slug: "fudge-brownie",
            description: "Dense chocolate fudge brownie.",
            price: 149,
            currency: "INR",
            imageUrl: "https://example.com/brownie.jpg",
            status: "ACTIVE",

            productCategories: {
                create: [{ categoryId: brownies1.id }],
            },
        },
    });

    // Inventory
    await prisma.inventory.createMany({
        data: [
            {
                storeId: store1.id,
                productId: cake1.id,
                stockCount: 100,
                reservedCount: 0,
                version: 0,
            },
            {
                storeId: store1.id,
                productId: brownie1.id,
                stockCount: 50,
                reservedCount: 0,
                version: 0,
            },
        ],
    });

    // Customer
    const customer1 = await prisma.customer.create({
        data: {
            storeId: store1.id,
            name: "Rehan",
            phone: "9999999991",
            email: "customer@example.com",
            passwordHash: "demo_customer_hash",
            address: "Lakkhibagh, Dehradun, Uttarakhand",
        },
    });

    // Cart
    const cart1 = await prisma.cart.create({
        data: {
            storeId: store1.id,
            customerId: customer1.id,
            status: "ACTIVE",
        },
    });

    await prisma.cartItem.create({
        data: {
            cartId: cart1.id,
            productId: cake1.id,
            quantity: 2,
            unitPrice: 499,
        },
    });

    // Store config
    await prisma.storeConfig.create({
        data: {
            storeId: store1.id,
            version: 1,
            schemaVersion: "1.0.0",
            status: "PUBLISHED",
            contentJson: {
                schemaVersion: "1.0.0",
                storeId: String(store1.id),
                version: 1,
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
                        title: "Fresh Bakery",
                        sections: [
                            {
                                id: "sec_1",
                                type: "hero",
                                props: {
                                    heading: "Fresh cakes, baked daily",
                                    subheading: "Order today",
                                },
                            },
                            {
                                id: "sec_2",
                                type: "product-grid",
                                props: {
                                    title: "Best Sellers",
                                    columns: 3,
                                    categoryId: String(cakes1.id),
                                },
                            },
                        ],
                    },
                ],
            },
        },
    });

    // --------------------------------------------------
    // USER 2 + STORE 2
    // --------------------------------------------------

    const user2 = await prisma.user.upsert({
        where: {
            email: "owner2@sellvia.dev",
        },
        update: {},
        create: {
            email: "owner2@sellvia.dev",
            passwordHash: "demo_hash_2",
            role: "OWNER",
        },
    });

    const store2 = await prisma.store.create({
        data: {
            ownerUserId: user2.id,
            name: "Fresh Clothing",
            slug: "fresh-clothing",
            plan: "BASIC",
            allowsDelivery: false,
            allowsPickup: true,
        },
    });

    const shirts2 = await prisma.category.create({
        data: {
            storeId: store2.id,
            name: "Shirts",
            slug: "shirts",
        },
    });

    const product2 = await prisma.product.create({
        data: {
            storeId: store2.id,
            name: "Cotton T-Shirt",
            slug: "cotton-t-shirt",
            description: "Premium cotton t-shirt.",
            price: 799,
            currency: "INR",
            imageUrl: "https://example.com/tshirt.jpg",
            status: "ACTIVE",

            productCategories: {
                create: [{ categoryId: shirts2.id }],
            },
        },
    });

    await prisma.inventory.create({
        data: {
            storeId: store2.id,
            productId: product2.id,
            stockCount: 30,
            reservedCount: 0,
            version: 0,
        },
    });

    // SAME EMAIL as Store 1 — this should be allowed.
    await prisma.customer.create({
        data: {
            storeId: store2.id,
            name: "Rehan",
            phone: "9999999992",
            email: "customer@example.com",
            passwordHash: "demo_customer_hash",
            address: "Dehradun, Uttarakhand",
        },
    });

    console.log("✅ Seed complete");
    console.log(`Store 1: ${store1.id} - ${store1.name}`);
    console.log(`Store 2: ${store2.id} - ${store2.name}`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
