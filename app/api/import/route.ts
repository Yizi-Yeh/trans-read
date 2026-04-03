import { NextResponse } from "next/server";
import { getDashboardData, importLesson } from "@/lib/study-db";
import { parseStudyText } from "@/lib/study-parser";
import type { LessonCategory } from "@/types/study";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sourceText?: string; category?: LessonCategory };

    if (!body.sourceText?.trim()) {
      return NextResponse.json({ error: "請先貼上要匯入的內容。" }, { status: 400 });
    }

    if (body.category !== "文章" && body.category !== "歌詞") {
      return NextResponse.json({ error: "請選擇正確的分類。" }, { status: 400 });
    }

    const parsedLesson = parseStudyText(body.sourceText);
    const result = await importLesson(parsedLesson, body.category);

    return NextResponse.json({
      data: result,
      ...(await getDashboardData())
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "匯入失敗。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
