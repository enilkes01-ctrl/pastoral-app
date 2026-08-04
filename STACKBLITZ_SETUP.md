# Guía: Subir Proyecto a StackBlitz

## Opción 1: Crear desde cero en StackBlitz (Recomendado)

### Backend (Express + Node.js)
1. Ve a https://stackblitz.com/
2. Haz clic en **Create** → **Node.js**
3. En el panel izquierdo, configura:
   - Reemplaza `package.json` con el contenido de `backend/package.json`
   - Reemplaza `index.js` con el contenido de `src/index.ts`
   - Crea la carpeta `prisma/` y agrega `schema.prisma`
4. StackBlitz instalará dependencias automáticamente
5. El servidor correrá en `https://[tu-proyecto]-3001.stackblitz.io`

### Frontend (React + Vite)
1. Ve a https://stackblitz.com/
2. Haz clic en **Create** → **Vite + React + TypeScript**
3. Reemplaza los archivos con el contenido de `frontend/`
4. El servidor correrá en `https://[tu-proyecto].stackblitz.io`

## Opción 2: Conectar repositorio GitHub (Alternativa)

1. Haz commit de este proyecto en GitHub
2. Ve a https://stackblitz.com/github
3. Pega la URL de tu repo
4. StackBlitz clonará y lanzará automáticamente

## Próximos pasos después en StackBlitz

### Backend
1. Crea una base de datos PostgreSQL en **Render.com**:
   - Ve a https://render.com/
   - Crea cuenta gratis
   - New → PostgreSQL
   - Copia la `DATABASE_URL`

2. En StackBlitz:
   - Crea `.env` en la raíz del backend
   - Pega: `DATABASE_URL="tu-url-de-render"`
   - Ejecuta migraciones de Prisma (cuando esté disponible)

### Frontend
1. En `src/api.ts`, cambia `API_URL` a tu backend de StackBlitz:
   ```typescript
   const API_URL = import.meta.env.VITE_API_URL || 'https://[tu-backend]-3001.stackblitz.io'
   ```

2. En el archivo `.env`, agrega:
   ```
   VITE_API_URL=https://[tu-backend]-3001.stackblitz.io
   ```

## Estructura que verás

```
Backend (Node.js):
- src/index.ts         → Servidor Express principal
- prisma/schema.prisma → Esquema de BD
- .env                 → Variables de entorno

Frontend (React):
- src/main.tsx         → Punto de entrada
- src/App.tsx          → Rutas principales
- src/pages/           → Login, Dashboard, Members
- src/components/      → ProtectedRoute
```

## URLs después del Deploy

- **Frontend**: https://[nombre].stackblitz.io
- **Backend API**: https://[nombre]-3001.stackblitz.io/api
- **Base de Datos**: PostgreSQL en Render (con backups automáticos)

## Siguientes características en StackBlitz

Una vez estés en StackBlitz, implementaremos:
1. **Rutas API** para Auth, Members, Visits, Contacts
2. **Conexión a Prisma** con PostgreSQL
3. **Autenticación JWT**
4. **Funcionalidad CRUD** para miembros
5. **Agenda y historial de contactos**
6. **Multi-usuario y permisos**

¡Listo para comenzar! 🚀
