import { prisma } from './prisma';

const BIG_CHURCH = 'Alma Rosa Central';
const QUOTAS: Record<string, number> = {
  'Alma Rosa Central': 4,
  'Luz de Alma Rosa': 3,
  'Luz de Cristo': 3,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// "Hoy" en hora de República Dominicana (UTC-4, sin horario de verano)
export function todayKeyRD(): string {
  const now = new Date();
  const rd = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  return rd.toISOString().slice(0, 10);
}

export async function getOrGenerateSuggestions(dateKey: string = todayKeyRD()) {
  const existing = await prisma.messageSuggestion.findMany({
    where: { dateKey },
    include: { member: { include: { church: true } } },
  });
  if (existing.length > 0) {
    return existing.map((s) => s.member);
  }

  const churches = await prisma.church.findMany();
  const bigChurch = churches.find((c) => c.name === BIG_CHURCH);
  if (!bigChurch) return [];

  // Si ya no quedan miembros sin sugerir en la iglesia grande, arranca un ciclo nuevo
  const remainingBig = await prisma.member.count({
    where: { churchId: bigChurch.id, messageSuggested: false },
  });
  if (remainingBig === 0) {
    await prisma.member.updateMany({ data: { messageSuggested: false } });
  }

  let shortfall = 0;
  const picked: { id: number }[] = [];

  for (const church of churches) {
    if (church.id === bigChurch.id) continue; // la grande absorbe el faltante al final
    const quota = QUOTAS[church.name] ?? 0;
    if (quota === 0) continue;
    const pool = await prisma.member.findMany({
      where: { churchId: church.id, messageSuggested: false },
      select: { id: true },
    });
    const take = shuffle(pool).slice(0, quota);
    picked.push(...take);
    shortfall += quota - take.length;
  }

  const bigQuota = (QUOTAS[BIG_CHURCH] ?? 0) + shortfall;
  const bigPool = await prisma.member.findMany({
    where: { churchId: bigChurch.id, messageSuggested: false },
    select: { id: true },
  });
  picked.push(...shuffle(bigPool).slice(0, bigQuota));

  if (picked.length === 0) return [];

  const ids = picked.map((p) => p.id);

  await prisma.member.updateMany({
    where: { id: { in: ids } },
    data: { messageSuggested: true },
  });

  await prisma.messageSuggestion.createMany({
    data: ids.map((id) => ({ dateKey, memberId: id })),
  });

  const members = await prisma.member.findMany({
    where: { id: { in: ids } },
    include: { church: true },
  });
  return members;
}
