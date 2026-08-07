const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function randomPassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function main() {
  const [, , email, firstName, lastName, role, primaryChurchName, ...extraChurchNames] = process.argv;

  if (!email || !primaryChurchName) {
    console.error('Uso: node create-user.js <email> <nombre> <apellido> <rol> <iglesia-principal> [iglesia-extra...]');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`Ya existe un usuario con el email ${email}`);
    process.exit(1);
  }

  const primaryChurch = await prisma.church.findFirst({ where: { name: primaryChurchName } });
  if (!primaryChurch) {
    console.error(`No se encontró la iglesia "${primaryChurchName}"`);
    process.exit(1);
  }

  const extraChurches = [];
  for (const name of extraChurchNames) {
    const church = await prisma.church.findFirst({ where: { name } });
    if (!church) {
      console.error(`No se encontró la iglesia "${name}"`);
      process.exit(1);
    }
    extraChurches.push(church);
  }

  const password = randomPassword();
  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      firstName,
      lastName,
      role: role || 'visitador',
      churchId: primaryChurch.id,
      accessChurches: extraChurches.length
        ? { connect: extraChurches.map((c) => ({ id: c.id })) }
        : undefined,
    },
    include: { accessChurches: true, church: true },
  });

  console.log('✅ Usuario creado exitosamente:');
  console.log(`   Nombre: ${user.firstName} ${user.lastName}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Contraseña temporal: ${password}`);
  console.log(`   Rol: ${user.role}`);
  console.log(`   Iglesias: ${[user.church.name, ...user.accessChurches.map((c) => c.name)].join(', ')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
