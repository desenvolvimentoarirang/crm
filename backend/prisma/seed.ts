import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@crm.com' },
    update: {},
    create: {
      email: 'admin@crm.com',
      password: adminPassword,
      name: 'Administrator',
      role: Role.ADMIN,
    },
  })

  // Worker user
  const workerPassword = await bcrypt.hash('worker123', 12)
  await prisma.user.upsert({
    where: { email: 'worker@crm.com' },
    update: {},
    create: {
      email: 'worker@crm.com',
      password: workerPassword,
      name: 'Worker 1',
      role: Role.WORKER,
    },
  })

  // Default tags
  const tags = [
    { name: 'VIP', color: '#F59E0B' },
    { name: 'Support', color: '#3B82F6' },
    { name: 'Sales', color: '#10B981' },
    { name: 'Complaint', color: '#EF4444' },
    { name: 'Follow-up', color: '#8B5CF6' },
  ]

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    })
  }

  // Default WhatsApp instance
  await prisma.whatsAppInstance.upsert({
    where: { name: 'default' },
    update: {},
    create: {
      name: 'default',
      displayName: 'Main WhatsApp',
      status: 'disconnected',
    },
  })

  console.log(`✅ Seeded: admin=${admin.email}`)
  console.log('✅ Seeded: default tags and instance')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
