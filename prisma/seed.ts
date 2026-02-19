import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10)

  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: '管理者',
      password: hashedPassword,
    },
  })

  console.log('User created:', user)

  const part1 = await prisma.part.upsert({
    where: { code: 'PART-001' },
    update: {},
    create: {
      code: 'PART-001',
      name: 'ボルト M6x20',
      description: '六角ボルト、ステンレス製',
      price: 50,
      stock: 1000,
    },
  })

  const part2 = await prisma.part.upsert({
    where: { code: 'PART-002' },
    update: {},
    create: {
      code: 'PART-002',
      name: 'ナット M6',
      description: '六角ナット、ステンレス製',
      price: 30,
      stock: 1500,
    },
  })

  console.log('Parts created:', { part1, part2 })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
