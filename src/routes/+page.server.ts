import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { ModeSchema } from '$lib/schemas/analysis';
import { buildDocumentInput } from '$lib/server/document';
import { db } from '$lib/server/db';
import { documents, segments } from '$lib/server/db/schema';

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const raw = (data.get('sentence') as string | null) ?? '';
    const modeParse = ModeSchema.safeParse(data.get('mode'));
    const mode = modeParse.success ? modeParse.data : 'full';

    const built = await buildDocumentInput(raw);
    if (!built.ok) return fail(422, { error: built.hint });

    const session = await locals.auth();
    let doc: { id: string };
    try {
      [doc] = await db
        .insert(documents)
        .values({
          userId: session?.user?.id ?? null,
          docHash: built.doc.docHash,
          rawInput: raw,
          normalizedInput: built.doc.normalized,
          defaultMode: mode
        })
        .returning({ id: documents.id });

      await db.insert(segments).values(
        built.doc.segments.map((s) => ({
          documentId: doc.id,
          segHash: s.segHash,
          segmentText: s.segmentText,
          unitType: s.unitType,
          ordinal: s.ordinal
        }))
      );
    } catch {
      return fail(500, { error: "We couldn't save your analysis. Please try again." });
    }

    redirect(303, `/d/${doc.id}?mode=${mode}`);
  }
};
