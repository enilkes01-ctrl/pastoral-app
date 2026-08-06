import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const churchNames = process.env.SEED_CHURCH_NAMES?.split(',') || [
    'Iglesia 1',
    'Iglesia 2',
    'Iglesia 3',
  ];

  const churches = [];
  for (const name of churchNames) {
    const trimmed = name.trim();
    let church = await prisma.church.findFirst({ where: { name: trimmed } });
    if (!church) {
      church = await prisma.church.create({ data: { name: trimmed } });
    }
    churches.push(church);
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@pastoralapp.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'cambiar123';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashed,
        firstName: 'Enilkes',
        lastName: 'Rodríguez',
        role: 'admin',
        churchId: churches[0].id,
      },
    });
    console.log(`✅ Usuario admin creado: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log('ℹ️  Usuario admin ya existe, no se creó de nuevo.');
  }

  console.log(`✅ Iglesias creadas: ${churches.map((c) => c.name).join(', ')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
