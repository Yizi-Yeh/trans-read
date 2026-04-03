import { NextResponse } from "next/server";
import {
  deleteLesson,
  getDashboardData,
  getLessonDetail,
  getStats,
  listDueReviewCards,
  listLessons,
  updateLessonCategory,
  updateLesson,
  updateLessonTitle
} from "@/lib/study-db";
import { parseStudyText } from "@/lib/study-parser";
import type { LessonCategory } from "@/types/study";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const lessonId = Number(id);

    if (!Number.isInteger(lessonId)) {
      return NextResponse.json({ error: "文章編號格式錯誤。" }, { status: 400 });
    }

    const lesson = await getLessonDetail(lessonId);

    if (!lesson) {
      return NextResponse.json({ error: "找不到這篇文章。" }, { status: 404 });
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取文章失敗。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const lessonId = Number(id);
    const body = (await request.json()) as {
      sourceText?: string;
      title?: string;
      category?: LessonCategory;
    };

    if (!Number.isInteger(lessonId)) {
      return NextResponse.json({ error: "文章編號格式錯誤。" }, { status: 400 });
    }

    if (body.category && body.category !== "文章" && body.category !== "歌詞") {
      return NextResponse.json({ error: "請選擇正確的分類。" }, { status: 400 });
    }

    if (body.category && !body.title?.trim() && !body.sourceText) {
      const result = await updateLessonCategory(lessonId, body.category);
      const [lesson, cards, stats] = await Promise.all([
        getLessonDetail(lessonId),
        listDueReviewCards(),
        getStats()
      ]);

      return NextResponse.json({
        data: result,
        lesson,
        cards,
        stats
      });
    }

    if (body.title?.trim() && !body.sourceText) {
      const result = await updateLessonTitle(lessonId, body.title.trim(), body.category);
      const [lesson, cards, stats] = await Promise.all([
        getLessonDetail(lessonId),
        listDueReviewCards(),
        getStats()
      ]);

      return NextResponse.json({
        data: result,
        lesson,
        cards,
        stats
      });
    }

    if (!body.sourceText?.trim()) {
      return NextResponse.json({ error: "請提供更新後的文章內容。" }, { status: 400 });
    }

    const parsedLesson = parseStudyText(body.sourceText);
    const result = await updateLesson(lessonId, parsedLesson, body.category);
    const [lesson, cards, stats] = await Promise.all([
      getLessonDetail(lessonId),
      listDueReviewCards(),
      getStats()
    ]);

    return NextResponse.json({
      data: result,
      lesson,
      cards,
      stats
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新文章失敗。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const lessonId = Number(id);

    if (!Number.isInteger(lessonId)) {
      return NextResponse.json({ error: "文章編號格式錯誤。" }, { status: 400 });
    }

    await deleteLesson(lessonId);

    return NextResponse.json(await getDashboardData());
  } catch (error) {
    const message = error instanceof Error ? error.message : "刪除文章失敗。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
