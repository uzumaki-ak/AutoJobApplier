const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: node scripts/reset-profiles.js <userId>");
  process.exit(1);
}

async function main() {
  // Detach applications from profiles so delete doesn't fail
  await prisma.application.updateMany({
    where: { userId },
    data: { profileId: null },
  });

  const result = await prisma.profile.deleteMany({ where: { userId } });
  console.log(`Deleted ${result.count} profiles for user: ${userId}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
