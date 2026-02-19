import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10)

  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { role: 'admin' },
    create: {
      email: 'admin@example.com',
      name: '管理者',
      password: hashedPassword,
      role: 'admin',
    },
  })

  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: { role: 'manager' },
    create: {
      email: 'manager@example.com',
      name: '承認者',
      password: hashedPassword,
      role: 'manager',
    },
  })

  const generalUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: '一般ユーザー',
      password: hashedPassword,
      role: 'user',
    },
  })

  console.log('Users created:', { admin: user.email, manager: manager.email, user: generalUser.email })

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

  const additionalParts = [
    { code: 'PART-003', name: 'ワッシャー M6', description: '平ワッシャー、ステンレス製', price: 10, stock: 2000 },
    { code: 'PART-004', name: 'スプリングワッシャー M6', description: 'ばね座金、ステンレス製', price: 15, stock: 1800 },
    { code: 'PART-005', name: 'ボルト M8x30', description: '六角ボルト、クロモリ鋼製', price: 80, stock: 800 },
    { code: 'PART-006', name: 'ナット M8', description: '六角ナット、クロモリ鋼製', price: 45, stock: 1200 },
    { code: 'PART-007', name: 'キャップスクリュー M5x15', description: '六角穴付きボルト、ステンレス製', price: 35, stock: 3000 },
    { code: 'PART-008', name: 'タッピングネジ 4x20', description: 'なべ頭タッピングネジ、鉄製', price: 8, stock: 5000 },
    { code: 'PART-009', name: 'Oリング P10', description: 'ニトリルゴム製シールリング', price: 25, stock: 600 },
    { code: 'PART-010', name: 'ベアリング 6201', description: '深溝玉軸受、内径12mm', price: 450, stock: 200 },
    { code: 'PART-011', name: 'ベアリング 6205', description: '深溝玉軸受、内径25mm', price: 680, stock: 150 },
    { code: 'PART-012', name: 'リニアガイド LM10', description: 'リニアブッシュ、内径10mm', price: 1200, stock: 100 },
    { code: 'PART-013', name: 'アルミフレーム 2020', description: 'アルミ押出材20x20mm、1m', price: 950, stock: 300 },
    { code: 'PART-014', name: 'アルミフレーム 3030', description: 'アルミ押出材30x30mm、1m', price: 1400, stock: 250 },
    { code: 'PART-015', name: 'タイミングベルト GT2', description: '2mmピッチタイミングベルト、1m', price: 350, stock: 400 },
    { code: 'PART-016', name: 'タイミングプーリ GT2-20T', description: '2mmピッチ20歯、内径5mm', price: 280, stock: 500 },
    { code: 'PART-017', name: 'カップリング 5-8mm', description: 'フレキシブルカップリング', price: 520, stock: 180 },
    { code: 'PART-018', name: 'ステッピングモーター NEMA17', description: '1.8°ステップ、保持トルク0.4Nm', price: 2800, stock: 80 },
    { code: 'PART-019', name: 'リミットスイッチ', description: 'マイクロスイッチ、レバー付き', price: 120, stock: 700 },
    { code: 'PART-020', name: 'コネクタ JST-XH 4P', description: '4ピンコネクタハウジング', price: 18, stock: 3000 },
    { code: 'PART-021', name: 'ヒートシンク 40x40x11', description: 'アルミ製放熱フィン', price: 150, stock: 400 },
    { code: 'PART-022', name: 'シャフト 8mm', description: 'ステンレス丸棒、直径8mm、500mm', price: 580, stock: 200 },
  ]

  for (const part of additionalParts) {
    await prisma.part.upsert({
      where: { code: part.code },
      update: {},
      create: part,
    })
  }

  console.log('Parts created:', { part1, part2, additionalCount: additionalParts.length })

  // 入出庫サンプルデータ（日付なし — 当日扱い）
  const sampleTransactions = [
    { partCode: 'PART-001', type: 'IN', quantity: 500, note: '初期入庫' },
    { partCode: 'PART-002', type: 'IN', quantity: 300, note: '初期入庫' },
    { partCode: 'PART-001', type: 'OUT', quantity: 50, note: '製造ライン出庫' },
    { partCode: 'PART-003', type: 'IN', quantity: 100, note: '追加発注分入庫' },
    { partCode: 'PART-005', type: 'OUT', quantity: 20, note: 'メンテナンス用出庫' },
  ]

  for (const tx of sampleTransactions) {
    const part = await prisma.part.findUnique({ where: { code: tx.partCode } })
    if (part) {
      await prisma.stockTransaction.create({
        data: {
          partId: part.id,
          userId: user.id,
          type: tx.type,
          quantity: tx.quantity,
          note: tx.note,
        },
      })
    }
  }

  // 過去30日間にわたる入出庫データ（部品別在庫推移グラフ用）
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

  const trendTransactions: Array<{
    partCode: string; type: string; quantity: number; note: string; daysAgo: number
  }> = [
      // PART-001 ボルト M6x20: 定期的な入出庫
      { partCode: 'PART-001', type: 'IN', quantity: 200, note: '定期入庫', daysAgo: 28 },
      { partCode: 'PART-001', type: 'OUT', quantity: 80, note: '製造ライン出庫', daysAgo: 26 },
      { partCode: 'PART-001', type: 'OUT', quantity: 60, note: '組立工程出庫', daysAgo: 24 },
      { partCode: 'PART-001', type: 'IN', quantity: 300, note: '追加発注入庫', daysAgo: 21 },
      { partCode: 'PART-001', type: 'OUT', quantity: 120, note: '大口出庫', daysAgo: 18 },
      { partCode: 'PART-001', type: 'OUT', quantity: 45, note: '製造ライン出庫', daysAgo: 15 },
      { partCode: 'PART-001', type: 'IN', quantity: 150, note: '補充入庫', daysAgo: 12 },
      { partCode: 'PART-001', type: 'OUT', quantity: 90, note: '組立工程出庫', daysAgo: 9 },
      { partCode: 'PART-001', type: 'OUT', quantity: 35, note: 'メンテナンス出庫', daysAgo: 6 },
      { partCode: 'PART-001', type: 'IN', quantity: 250, note: '定期入庫', daysAgo: 3 },
      { partCode: 'PART-001', type: 'OUT', quantity: 70, note: '製造ライン出庫', daysAgo: 1 },

      // PART-002 ナット M6: 出庫が多い
      { partCode: 'PART-002', type: 'OUT', quantity: 100, note: '組立工程出庫', daysAgo: 27 },
      { partCode: 'PART-002', type: 'OUT', quantity: 150, note: '製造ライン出庫', daysAgo: 23 },
      { partCode: 'PART-002', type: 'IN', quantity: 500, note: '大量入庫', daysAgo: 20 },
      { partCode: 'PART-002', type: 'OUT', quantity: 80, note: '組立出庫', daysAgo: 17 },
      { partCode: 'PART-002', type: 'OUT', quantity: 200, note: '大口出庫', daysAgo: 13 },
      { partCode: 'PART-002', type: 'IN', quantity: 300, note: '補充入庫', daysAgo: 10 },
      { partCode: 'PART-002', type: 'OUT', quantity: 120, note: '製造出庫', daysAgo: 7 },
      { partCode: 'PART-002', type: 'OUT', quantity: 60, note: '組立出庫', daysAgo: 4 },
      { partCode: 'PART-002', type: 'IN', quantity: 200, note: '定期入庫', daysAgo: 2 },

      // PART-005 ボルト M8x30: 不定期な動き
      { partCode: 'PART-005', type: 'IN', quantity: 100, note: '初回入庫', daysAgo: 25 },
      { partCode: 'PART-005', type: 'OUT', quantity: 30, note: '試作出庫', daysAgo: 22 },
      { partCode: 'PART-005', type: 'OUT', quantity: 50, note: '製造出庫', daysAgo: 16 },
      { partCode: 'PART-005', type: 'IN', quantity: 200, note: '大量入庫', daysAgo: 11 },
      { partCode: 'PART-005', type: 'OUT', quantity: 40, note: 'メンテナンス出庫', daysAgo: 8 },
      { partCode: 'PART-005', type: 'OUT', quantity: 25, note: '組立出庫', daysAgo: 5 },
      { partCode: 'PART-005', type: 'IN', quantity: 80, note: '補充入庫', daysAgo: 2 },

      // PART-010 ベアリング 6201: 少量で高価
      { partCode: 'PART-010', type: 'IN', quantity: 20, note: '定期入庫', daysAgo: 29 },
      { partCode: 'PART-010', type: 'OUT', quantity: 5, note: '組立出庫', daysAgo: 25 },
      { partCode: 'PART-010', type: 'OUT', quantity: 8, note: '製造ライン出庫', daysAgo: 20 },
      { partCode: 'PART-010', type: 'IN', quantity: 15, note: '追加入庫', daysAgo: 14 },
      { partCode: 'PART-010', type: 'OUT', quantity: 3, note: 'メンテナンス出庫', daysAgo: 10 },
      { partCode: 'PART-010', type: 'OUT', quantity: 6, note: '組立出庫', daysAgo: 5 },
      { partCode: 'PART-010', type: 'IN', quantity: 10, note: '補充入庫', daysAgo: 1 },

      // PART-018 ステッピングモーター: 少数精密部品
      { partCode: 'PART-018', type: 'IN', quantity: 10, note: '入庫', daysAgo: 28 },
      { partCode: 'PART-018', type: 'OUT', quantity: 2, note: '試作出庫', daysAgo: 24 },
      { partCode: 'PART-018', type: 'OUT', quantity: 3, note: '製造出庫', daysAgo: 19 },
      { partCode: 'PART-018', type: 'IN', quantity: 5, note: '追加入庫', daysAgo: 14 },
      { partCode: 'PART-018', type: 'OUT', quantity: 4, note: '組立出庫', daysAgo: 8 },
      { partCode: 'PART-018', type: 'IN', quantity: 8, note: '定期入庫', daysAgo: 3 },

      // PART-009 Oリング: 消耗品パターン
      { partCode: 'PART-009', type: 'OUT', quantity: 50, note: 'メンテナンス出庫', daysAgo: 27 },
      { partCode: 'PART-009', type: 'OUT', quantity: 30, note: '定期交換出庫', daysAgo: 22 },
      { partCode: 'PART-009', type: 'IN', quantity: 200, note: '大量入庫', daysAgo: 18 },
      { partCode: 'PART-009', type: 'OUT', quantity: 40, note: 'メンテナンス出庫', daysAgo: 14 },
      { partCode: 'PART-009', type: 'OUT', quantity: 25, note: '定期交換出庫', daysAgo: 9 },
      { partCode: 'PART-009', type: 'OUT', quantity: 35, note: 'ライン交換出庫', daysAgo: 4 },
      { partCode: 'PART-009', type: 'IN', quantity: 150, note: '補充入庫', daysAgo: 1 },

      // PART-013 アルミフレーム 2020: 大物部品
      { partCode: 'PART-013', type: 'IN', quantity: 50, note: '入庫', daysAgo: 26 },
      { partCode: 'PART-013', type: 'OUT', quantity: 20, note: '組立出庫', daysAgo: 21 },
      { partCode: 'PART-013', type: 'OUT', quantity: 15, note: '製造出庫', daysAgo: 15 },
      { partCode: 'PART-013', type: 'IN', quantity: 30, note: '追加入庫', daysAgo: 10 },
      { partCode: 'PART-013', type: 'OUT', quantity: 10, note: '試作出庫', daysAgo: 6 },
      { partCode: 'PART-013', type: 'OUT', quantity: 8, note: '組立出庫', daysAgo: 2 },
    ]

  const userIds = [user.id, manager.id, generalUser.id]
  let txCount = 0
  for (const tx of trendTransactions) {
    const part = await prisma.part.findUnique({ where: { code: tx.partCode } })
    if (part) {
      await prisma.stockTransaction.create({
        data: {
          partId: part.id,
          userId: userIds[txCount % userIds.length],
          type: tx.type,
          quantity: tx.quantity,
          note: tx.note,
          createdAt: daysAgo(tx.daysAgo),
        },
      })
      txCount++
    }
  }

  console.log('Stock transactions created:', sampleTransactions.length + txCount, `(基本: ${sampleTransactions.length}, 推移用: ${txCount})`)

  // 発注サンプルデータ
  const part1Ref = await prisma.part.findUnique({ where: { code: 'PART-001' } })
  const part5Ref = await prisma.part.findUnique({ where: { code: 'PART-005' } })
  const part10Ref = await prisma.part.findUnique({ where: { code: 'PART-010' } })
  const part18Ref = await prisma.part.findUnique({ where: { code: 'PART-018' } })

  if (part1Ref && part5Ref && part10Ref && part18Ref) {
    // 下書き発注
    await prisma.order.create({
      data: {
        orderNumber: 'ORD-001',
        status: 'DRAFT',
        totalAmount: 5000,
        requestedById: generalUser.id,
        items: {
          create: [
            { partId: part1Ref.id, quantity: 100, unitPrice: 50, subtotal: 5000 },
          ],
        },
      },
    })

    // 承認待ち発注
    await prisma.order.create({
      data: {
        orderNumber: 'ORD-002',
        status: 'PENDING',
        totalAmount: 9400,
        requestedById: generalUser.id,
        items: {
          create: [
            { partId: part5Ref.id, quantity: 50, unitPrice: 80, subtotal: 4000 },
            { partId: part10Ref.id, quantity: 12, unitPrice: 450, subtotal: 5400 },
          ],
        },
      },
    })

    // 承認済み発注
    await prisma.order.create({
      data: {
        orderNumber: 'ORD-003',
        status: 'APPROVED',
        totalAmount: 14000,
        requestedById: generalUser.id,
        approvedById: manager.id,
        approvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        items: {
          create: [
            { partId: part18Ref.id, quantity: 5, unitPrice: 2800, subtotal: 14000 },
          ],
        },
      },
    })

    // 発注済み
    await prisma.order.create({
      data: {
        orderNumber: 'ORD-004',
        status: 'ORDERED',
        totalAmount: 6800,
        requestedById: manager.id,
        approvedById: user.id,
        approvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        orderedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        items: {
          create: [
            { partId: part10Ref.id, quantity: 10, unitPrice: 450, subtotal: 4500 },
            { partId: part1Ref.id, quantity: 46, unitPrice: 50, subtotal: 2300 },
          ],
        },
      },
    })

    // 入荷済み
    await prisma.order.create({
      data: {
        orderNumber: 'ORD-005',
        status: 'RECEIVED',
        totalAmount: 5600,
        requestedById: generalUser.id,
        approvedById: manager.id,
        approvedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        orderedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        items: {
          create: [
            { partId: part18Ref.id, quantity: 2, unitPrice: 2800, subtotal: 5600 },
          ],
        },
      },
    })

    console.log('Sample orders created: 5')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
