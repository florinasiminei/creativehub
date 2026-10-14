import { getDraftRoleFromRequest } from '@/lib/draftsAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getBufferInstagramChannel } from '@/lib/server/bufferInstagram';
import { instagramPromotionConfiguration, processInstagramPromotions, PromotionError } from '@/lib/server/instagramPromotions';
import { promotionFailure, promotionJson, readPromotionBody } from '@/lib/server/instagramPromotionHttp';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

async function requireStaff(request: Request) {
  const role = await getDraftRoleFromRequest(request);
  if (role !== 'admin' && role !== 'staff') throw new PromotionError('Unauthorized', 401);
}

export async function GET(request: Request) {
  try {
    await requireStaff(request);
    const { data, error } = await getSupabaseAdmin().from('social_promotions')
      .select('*, listings(title, is_published)').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return promotionJson({ promotions: data || [], configuration: instagramPromotionConfiguration() });
  } catch (error) { return promotionFailure(error); }
}

export async function POST(request: Request) {
  try {
    await requireStaff(request);
    const body = await readPromotionBody(request);
    if (body.action === 'check-connection') {
      const channel = await getBufferInstagramChannel();
      return promotionJson({ name: channel.name, connected: true });
    }
    if (body.action !== 'process') throw new PromotionError('Acțiune invalidă.');
    return promotionJson(await processInstagramPromotions());
  } catch (error) { return promotionFailure(error); }
}
