import { destroySession, getSessionUser, guarded } from '@/lib/auth';
import { audit } from '@/lib/audit';
export const POST = guarded(async () => {
  const u = await getSessionUser();
  if (u) await audit({ actorId: u.id, actorName: u.name, action: 'logout', entity: 'auth' });
  await destroySession();
  return Response.json({ ok: true });
});
