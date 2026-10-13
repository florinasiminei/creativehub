import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getDraftRoleFromRequest } from "@/lib/draftsAuth";

export async function DELETE(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const role = await getDraftRoleFromRequest(req);
    if (role !== "admin" && role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("calendar_blocks")
      .delete()
      .eq("id", params.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/calendar/blocks/[id]:", err);
    return NextResponse.json(
      { error: "Cererea nu a putut fi procesata. Incearca din nou." },
      { status: 500 }
    );
  }
}
