# Gym Joan

Aplicación privada para planificar, ejecutar y medir un programa de mejora física. Incluye Better Auth con email, contraseña y Passkeys; roles de administrador, entrenador y atleta; constructor versionado; registro serie a serie con borrador offline; progreso, nutrición, cardio, fotografías privadas y correo transaccional.

## Desarrollo local

```bash
pnpm install
cp .env.example .env.local
export SUPABASE_DB_URL='postgresql://postgres.PROJECT_REF:CONTRASEÑA@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'
export DATABASE_URL="$SUPABASE_DB_URL"
pnpm supabase:push
pnpm dev
```

Sin variables de Supabase la interfaz entra en modo demostración. Las mutaciones no escriben datos reales.

## Supabase

La aplicación trabaja exclusivamente contra Supabase remoto mediante Session Pooler; no necesita Docker ni una base local. Nunca guardes `DATABASE_URL` o `SUPABASE_DB_URL` en Git ni las expongas al navegador. Las migraciones activan RLS en todas las tablas públicas. `supabase/seed.sql` carga la biblioteca de ejercicios y crea el plan de Joan si ya existe un entrenador o administrador. Para aplicar migraciones y seed:

```bash
pnpm supabase:push
pnpm supabase:seed
```

Si las cuentas se crean después del seed, ejecuta:

```sql
select public.seed_joan_program('UUID_DEL_ENTRENADOR');
```

El primer administrador se prepara con:

```bash
pnpm bootstrap:admin
```

El script crea una contraseña aleatoria que nunca muestra ni registra y deja un enlace de activación de un solo uso en `email_outbox`.

## Better Auth y Passkeys

- `BETTER_AUTH_SECRET` debe tener al menos 32 caracteres y ser distinto por entorno.
- `BETTER_AUTH_URL` y `NEXT_PUBLIC_SITE_URL` deben apuntar al mismo origen.
- Producción usa `https://gym.joanbosch.dev` como RP ID WebAuthn.
- Local usa `localhost`; las previews de Vercel mantienen Passkeys independientes.
- El registro público está desactivado. Un administrador crea la cuenta y Better Auth envía la activación mediante la cola de Resend.
- El usuario puede registrar, consultar y eliminar Passkeys desde `/seguridad`.
- La contraseña tiene entre 12 y 256 caracteres, y todas las sesiones se revocan al restablecerla.

Cuando cambien los plugins de Better Auth, regenera su migración y revisa el diff antes de aplicarla:

```bash
pnpm auth:generate
pnpm supabase:push
```

## Vercel

1. Importa el repositorio y usa `pnpm build`.
2. Configura variables distintas en Development/Preview y Production.
3. Usa un proyecto Supabase de desarrollo para previews y otro para producción.
4. Añade `gym.joanbosch.dev` al proyecto y fija `NEXT_PUBLIC_SITE_URL=https://gym.joanbosch.dev` en Production.
5. Configura `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` y `DATABASE_URL` por entorno. Supabase Auth ya no gestiona las sesiones de la aplicación.

## Resend

1. Verifica `mail.joanbosch.dev` y copia exactamente sus registros DKIM, SPF/Return-Path y MX en el DNS autoritativo. No publiques dos registros SPF.
2. Configura el webhook `https://gym.joanbosch.dev/api/webhooks/resend` para eventos `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.failed` y `email.suppressed`.
3. Guarda la firma como `RESEND_WEBHOOK_SECRET` y usa el mismo `EMAIL_PROCESSOR_SECRET` en Vercel y la Edge Function.
4. Despliega `supabase/functions/process-email-outbox` con `APP_URL=https://gym.joanbosch.dev`.
5. Crea los secretos de Vault indicados en la migración de Cron y habilita el job comentado.
6. Usa `Gym Joan <notificaciones@mail.joanbosch.dev>` como remitente. Mantén `EMAIL_DELIVERY_MODE=log` en local/previews y `resend` solo en producción.

Previsualiza las plantillas con `pnpm email:dev`. Usa `delivered@resend.dev`, `bounced@resend.dev` y `complained@resend.dev` para pruebas; no inventes direcciones reales.

## Calidad

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
