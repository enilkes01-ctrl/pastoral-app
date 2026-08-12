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

// Reparte el cupo de cada iglesia accesible; la de mayor cupo (y, en caso de
// empate, menor id) absorbe el faltante de las que ya se quedaron sin miembros.
async function pickForChurches(churches: { id: number; name: string }[]) {
  const ordered = [...churches].sort((a, b) => {
    const qa = QUOTAS[a.name] ?? 0;
    const qb = QUOTAS[b.name] ?? 0;
    if (qa !== qb) return qa - qb; // cupo más alto queda al final (absorbe)
    return b.id - a.id; // empate: id más bajo queda al final (absorbe)
  });

  let shortfall = 0;
  const picked: { id: number }[] = [];

  for (let i = 0; i < ordered.length; i++) {
    const church = ordered[i];
    const isAbsorber = i === ordered.length - 1;
    const baseQuota = QUOTAS[church.name] ?? 0;
    const quota = isAbsorber ? baseQuota + shortfall : baseQuota;
    if (quota === 0) continue;

    const pool = await prisma.member.findMany({
      where: { churchId: church.id, messageSuggested: false },
      select: { id: true },
    });
    const take = shuffle(pool).slice(0, quota);
    picked.push(...take);
    if (!isAbsorber) shortfall += quota - take.length;
  }

  return picked;
}

export async function getOrGenerateSuggestionsForUser(
  user: { id: number; role: string; churchIds: number[] },
  dateKey: string = todayKeyRD()
) {
  const existing = await prisma.messageSuggestion.findMany({
    where: { dateKey, userId: user.id },
    include: { member: { include: { church: true } } },
  });
  if (existing.length > 0) {
    return existing.map((s) => s.member);
  }

  const allChurches = await prisma.church.findMany();
  const bigChurch = allChurches.find((c) => c.name === BIG_CHURCH);

  // Si ya no quedan miembros sin sugerir en la iglesia grande, arranca un ciclo nuevo (para todos)
  if (bigChurch) {
    const remainingBig = await prisma.member.count({
      where: { churchId: bigChurch.id, messageSuggested: false },
    });
    if (remainingBig === 0) {
      await prisma.member.updateMany({ data: { messageSuggested: false } });
    }
  }

  const accessibleChurches =
    user.role === 'admin' ? allChurches : allChurches.filter((c) => user.churchIds.includes(c.id));

  const picked = await pickForChurches(accessibleChurches);
  if (picked.length === 0) return [];

  const ids = picked.map((p) => p.id);

  await prisma.member.updateMany({
    where: { id: { in: ids } },
    data: { messageSuggested: true },
  });

  await prisma.messageSuggestion.createMany({
    data: ids.map((id) => ({ dateKey, userId: user.id, memberId: id })),
  });

  const members = await prisma.member.findMany({
    where: { id: { in: ids } },
    include: { church: true },
  });
  return members;
}
