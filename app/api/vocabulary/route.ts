import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const vocabulary = await prisma.vocabulary.findMany({
      where: {
        bookmarked: true
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            category: true
          }
        }
      },
      orderBy: {
        id: "desc"
      }
    });

    return NextResponse.json({
      vocabulary: vocabulary.map((item) => ({
        id: item.id,
        lessonId: item.lessonId,
        lessonTitle: item.lesson.title,
        lessonCategory: item.lesson.category,
        word: item.word,
        reading: item.reading,
        meaningZh: item.meaningZh,
        exampleSentence: item.exampleSentence,
        exampleTranslation: item.exampleTranslation,
        bookmarked: item.bookmarked
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取標記單字失敗。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
