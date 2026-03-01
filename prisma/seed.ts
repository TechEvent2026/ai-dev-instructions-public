import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "Admin", password: hash },
  });

  // Seed categories
  const categories = ["電子部品", "機械部品", "配線部品"];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Seed sample parts
  const electronic = await prisma.category.findUnique({ where: { name: "電子部品" } });
  const mechanical = await prisma.category.findUnique({ where: { name: "機械部品" } });
  const wiring = await prisma.category.findUnique({ where: { name: "配線部品" } });

  const parts = [
    { partNumber: "E-001", name: "抵抗器 10kΩ", description: "1/4W カーボン抵抗", categoryId: electronic?.id, quantity: 500, price: 5 },
    { partNumber: "E-002", name: "コンデンサ 100μF", description: "電解コンデンサ 16V", categoryId: electronic?.id, quantity: 200, price: 15 },
    { partNumber: "M-001", name: "M3ボルト 10mm", description: "ステンレス製", categoryId: mechanical?.id, quantity: 1000, price: 3 },
    { partNumber: "M-002", name: "M3ナット", description: "ステンレス製", categoryId: mechanical?.id, quantity: 1000, price: 2 },
    { partNumber: "W-001", name: "AWG22 赤", description: "耐熱ワイヤー 1m", categoryId: wiring?.id, quantity: 100, price: 50 },
  ];

  for (const part of parts) {
    await prisma.part.upsert({
      where: { partNumber: part.partNumber },
      update: {},
      create: part,
    });
  }

  console.log("Seed data created successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
