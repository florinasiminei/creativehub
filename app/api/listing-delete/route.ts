import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';
import { deleteStoredImageUrls } from '@/lib/server/r2';
import { queueInstagramPromotionSync } from '@/lib/server/instagramPromotionConfig';
import { getInstagramSourceMutationFailure, withInstagramSourceMutation } from '@/lib/server/instagramPromotionMutation';

export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const role = await getDraftRoleFromRequest(request);
    const requiredToken = process.env.INVITE_TOKEN;
    const inviteToken = request.headers.get('x-invite-token');
    const hasInvite = requiredToken && inviteToken && inviteToken === requiredToken;
    const hasRole = role === 'admin' || role === 'staff';
    if (!hasRole && !hasInvite) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = rateLimit(request, { windowMs: 60_000, max: 30, keyPrefix: 'listing-delete' });
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const imageUrls = await withInstagramSourceMutation(supabaseAdmin, String(id), async () => {
      const { data: imgs, error: imagesError } = await supabaseAdmin.from('listing_images').select('id, image_url').eq('listing_id', id);
      if (imagesError) throw imagesError;
      const { error: imagesDeleteError } = await supabaseAdmin.from('listing_images').delete().eq('listing_id', id);
      if (imagesDeleteError) throw imagesDeleteError;
      const { error: facilitiesDeleteError } = await supabaseAdmin.from('listing_facilities').delete().eq('listing_id', id);
      if (facilitiesDeleteError) throw facilitiesDeleteError;
      const { error } = await supabaseAdmin.from('listings').delete().eq('id', id);
      if (error) throw error;
      return (imgs || []).map((img) => img.image_url);
    }, { actor: 'staff' });
    try {
      await deleteStoredImageUrls(imageUrls, { supabaseAdmin, includeListingCardVariant: true });
    } catch {
      console.error('[listing-delete] Storage cleanup needs attention', { listingId: String(id) });
    }
    queueInstagramPromotionSync(String(id));
    revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const promotionFailure = getInstagramSourceMutationFailure(err);
    if (promotionFailure) return NextResponse.json({ error: promotionFailure.message }, { status: promotionFailure.status });
    console.error(err);
    return NextResponse.json({ error: "Cererea nu a putut fi procesata. Incearca din nou." }, { status: 500 });
  }
}
