import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const user = await prisma.user.findFirst({
    select: { id: true, email: true }
  });

  console.log("✅ Connected", user ? `(${user.email})` : "(no rows yet)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
