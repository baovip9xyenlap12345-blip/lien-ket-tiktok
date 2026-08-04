import { getSessionUser } from '@/lib/auth';
import Forbidden from '@/components/Forbidden';
import TtsClient from './ui';

export default async function TtsPage() {
  const user = await getSessionUser();
  if (!user) return <Forbidden />;
  return <TtsClient />;
}
