import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
    //two store owners
    const ownerA = await prisma.user.create({
        data: {
            email: "user1@example.com",
            role: "owner",
        },
    });
    const ownerB = await prisma.user.create({
        data: {
            email: "user2@example.com",
            role: "owner",
        },
    });

    //store of owner a
    await prisma.store.create({
        data: {
            ownerUserId: ownerA.id,
            name: "Venus Bakers",
            slug: "venus-bakers",
            plan: "basic",
        },
    });

    await prisma.store.create({
        data: {
            ownerUserId: ownerB.id,
            name: "Janta Bakers",
            slug: "janta-bakers",
            plan: "basic",
        },
    });
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
