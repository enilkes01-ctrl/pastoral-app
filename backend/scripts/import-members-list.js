// Importa miembros a partir de una lista simple de nombres (ej. extraída de un PDF),
// a diferencia de import-members.js que lee el formato de reporte Excel/INFOMAC.
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const namesFilePath = process.argv[2];
  const churchName = process.argv[3];

  const church = await prisma.church.findFirst({ where: { name: churchName } });
  if (!church) {
    console.error(`No se encontró la iglesia "${churchName}"`);
    process.exit(1);
  }

  const names = JSON.parse(fs.readFileSync(namesFilePath, 'utf8'))
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  console.log(`Importando ${names.length} miembros a "${church.name}"...`);

  let created = 0;
  let skipped = 0;

  for (const name of names) {
    const existing = await prisma.member.findFirst({
      where: { name, churchId: church.id },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.member.create({
      data: { name, status: 'miembro-activo', churchId: church.id },
    });
    created++;
  }

  console.log(`✅ Creados: ${created}, Omitidos (ya existían): ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
