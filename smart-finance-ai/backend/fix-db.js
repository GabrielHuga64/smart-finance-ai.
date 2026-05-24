const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // We cannot use prisma.user.create because User might not be in the generated client yet
  // We use raw query instead
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "User" ("id", "googleId", "email", "name", "createdAt") 
      VALUES ('default-system-user', 'system-google-id', 'system@smartfinance.ai', 'System Admin', NOW())
      ON CONFLICT ("id") DO NOTHING;
    `);
    console.log("Default user created!");
  } catch (error) {
    console.error("Error creating default user (Table might not exist yet):", error.message);
  }
}

main().finally(() => prisma.$disconnect());
