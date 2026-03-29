import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Super Admin
  const superAdminPassword = await bcrypt.hash('admin123', 12)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@crm.com' },
    update: { role: Role.SUPER_ADMIN },
    create: {
      email: 'admin@crm.com',
      password: superAdminPassword,
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
    },
  })

  // Client Admin (Travel Agency Boss)
  const clientAdminPassword = await bcrypt.hash('agency123', 12)
  const clientAdmin = await prisma.user.upsert({
    where: { email: 'agency@crm.com' },
    update: { role: Role.CLIENT_ADMIN },
    create: {
      email: 'agency@crm.com',
      password: clientAdminPassword,
      name: 'Travel Agency Admin',
      role: Role.CLIENT_ADMIN,
    },
  })

  // Worker (regular agent under the client admin)
  const workerPassword = await bcrypt.hash('worker123', 12)
  await prisma.user.upsert({
    where: { email: 'worker@crm.com' },
    update: { clientAdminId: clientAdmin.id },
    create: {
      email: 'worker@crm.com',
      password: workerPassword,
      name: 'Worker 1',
      role: Role.WORKER,
      clientAdminId: clientAdmin.id,
    },
  })

  // Trusted Worker (senior agent under the client admin)
  const trustedPassword = await bcrypt.hash('trusted123', 12)
  await prisma.user.upsert({
    where: { email: 'trusted@crm.com' },
    update: { clientAdminId: clientAdmin.id, role: Role.WORKER_TRUST },
    create: {
      email: 'trusted@crm.com',
      password: trustedPassword,
      name: 'Senior Agent',
      role: Role.WORKER_TRUST,
      clientAdminId: clientAdmin.id,
    },
  })

  // Travel agency tags
  const tags = [
    { name: 'VIP', color: '#F59E0B' },
    { name: 'Inquiry', color: '#3B82F6' },
    { name: 'Booking', color: '#10B981' },
    { name: 'Support', color: '#6366F1' },
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

  // Default WhatsApp instance linked to the client admin
  await prisma.whatsAppInstance.upsert({
    where: { name: 'default' },
    update: { clientAdminId: clientAdmin.id },
    create: {
      name: 'default',
      displayName: 'Main WhatsApp',
      status: 'disconnected',
      clientAdminId: clientAdmin.id,
    },
  })

  // Fix orphan conversations/instances missing clientAdminId
  await prisma.whatsAppInstance.updateMany({
    where: { clientAdminId: null },
    data: { clientAdminId: clientAdmin.id },
  })
  await prisma.conversation.updateMany({
    where: { clientAdminId: null },
    data: { clientAdminId: clientAdmin.id },
  })

  console.log('✅ Seeded users:')
  console.log(`   Super Admin: admin@crm.com / admin123`)
  console.log(`   Client Admin: agency@crm.com / agency123`)
  console.log(`   Worker: worker@crm.com / worker123`)
  console.log(`   Trusted Worker: trusted@crm.com / trusted123`)
  console.log('✅ Seeded: tags and instance')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
