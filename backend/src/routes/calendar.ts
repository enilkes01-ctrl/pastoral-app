import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// Escapa texto para el formato iCalendar (RFC 5545): backslash, punto y coma, coma y saltos de línea
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildEvent(uid: string, start: Date, summary: string, description?: string | null): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}@pastoral-app`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

// Sin requireAuth: los calendarios externos no pueden mandar un Bearer token —
// el token opaco en la URL es la autenticación de este endpoint.
router.get('/feed.ics', asyncHandler(async (req, res) => {
  const token = String(req.query.token || '');
  if (!token) return res.status(404).send('No encontrado');

  const user = await prisma.user.findUnique({
    where: { calendarToken: token },
    include: { accessChurches: true },
  });
  if (!user || !user.active) return res.status(404).send('No encontrado');

  const churchIds = [user.churchId, ...user.accessChurches.map((c) => c.id)];
  const churchFilter = user.role === 'admin' ? {} : { churchId: { in: churchIds } };

  const [visits, preachings] = await Promise.all([
    prisma.visitSchedule.findMany({
      where: { status: 'pendiente', member: churchFilter },
      include: { member: { select: { name: true } } },
      orderBy: { scheduledDate: 'asc' },
    }),
    prisma.preachingSchedule.findMany({
      where: { date: { gte: new Date() }, ...churchFilter },
      orderBy: { date: 'asc' },
    }),
  ]);

  const typeLabel: Record<string, string> = { visita: 'Visita', llamada: 'Llamada', mensaje: 'Mensaje' };

  const events = [
    ...visits.map((v) =>
      buildEvent(`visit-${v.id}`, v.scheduledDate, `${typeLabel[v.type] || v.type}: ${v.member?.name}`, v.notes)
    ),
    ...preachings.map((p) => buildEvent(`preaching-${p.id}`, p.date, `Predicación: ${p.title}`, p.location)),
  ];

  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pastoral App//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Pastoral App - Agenda',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  res.set('Content-Type', 'text/calendar; charset=utf-8');
  res.send(body);
}));

export default router;
