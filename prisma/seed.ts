import { createSeedClient, seedAtlasData } from "../lib/seed-importer";

const prisma = createSeedClient();

seedAtlasData(prisma)
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
