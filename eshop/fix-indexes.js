const { PrismaClient } = require("./generated/prisma");

const prisma = new PrismaClient();

async function dropIfExists(name) {
    try {
        await prisma.$runCommandRaw({ dropIndexes: "images", index: name });
        console.log(`Dropped ${name}`);
    } catch (err) {
        console.log(`Skipped dropping ${name}: ${err.message}`);
    }
}

async function main() {
    await dropIfExists("images_userId_key");
    await dropIfExists("images_shopId_key");

    await prisma.$runCommandRaw({
        createIndexes: "images",
        indexes: [
            {
                key: { userId: 1 },
                name: "images_userId_key",
                unique: true,
                partialFilterExpression: { userId: { $type: "objectId" } },
            },
            {
                key: { shopId: 1 },
                name: "images_shopId_key",
                unique: true,
                partialFilterExpression: { shopId: { $type: "objectId" } },
            },
        ],
    });
    console.log("Created partial unique indexes images_userId_key and images_shopId_key");
}

main()
    .catch((err) => {
        console.error("Failed:", err.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
