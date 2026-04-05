import { NextResponse } from "next/server";
import { getStats, updateVocabularyBookmark, updateVocabularyMastered } from "@/lib/study-db";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const vocabularyId = Number(id);
    const body = (await request.json()) as { bookmarked?: boolean; mastered?: boolean };

    if (!Number.isInteger(vocabularyId)) {
      return NextResponse.json({ error: "單字編號格式錯誤。" }, { status: 400 });
    }

    if (typeof body.bookmarked !== "boolean" && typeof body.mastered !== "boolean") {
      return NextResponse.json({ error: "請提供正確的單字更新狀態。" }, { status: 400 });
    }

    const result =
      typeof body.mastered === "boolean"
        ? await updateVocabularyMastered(vocabularyId, body.mastered)
        : await updateVocabularyBookmark(vocabularyId, body.bookmarked as boolean);
    const stats = await getStats();

    return NextResponse.json({
      data: result,
      stats
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新單字狀態失敗。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
