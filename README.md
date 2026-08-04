# Pastoral App - Seguimiento de Miembros de Iglesias

App web para gestionar miembros de iglesias, agendar visitas, registrar contactos y llevar historial de visitación.

## Estructura del Proyecto

```
pastoral-app/
├── frontend/          # React + Vite + TypeScript
├── backend/           # Express + TypeScript + Prisma
└── README.md
```

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind + Shadcn/ui + TanStack Query + Zustand
- **Backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL
- **Auth**: JWT
- **Hosting**: Netlify (frontend) + Render (backend + DB)

## Instalación y Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run db:push
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Plan de Desarrollo

- **Fase 1 (MVP)**: Auth, miembros, agenda, historial de contactos, multi-usuario
- **Fase 2**: Integraciones (email, calendario, SMS alternativo)
- **Fase 3**: Dashboard, reportes, búsqueda avanzada

Detalles completos: `../.claude/plans/zazzy-baking-toast.md`
