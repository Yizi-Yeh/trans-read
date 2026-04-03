import { NextResponse } from "next/server";
import { generateN1AnalysisWithGemini } from "@/lib/gemini";
import type { LessonCategory } from "@/types/study";

export const runtime = "nodejs";

function isLessonCategory(value: string): value is LessonCategory {
  return value === "文章" || value === "歌詞";
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let rawText = "";
    let category: LessonCategory = "文章";
    let image: { mimeType: string; dataBase64: string } | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const rawTextValue = formData.get("rawText");
      const categoryValue = formData.get("category");
      const imageValue = formData.get("image");

      rawText = typeof rawTextValue === "string" ? rawTextValue.trim() : "";

      if (typeof categoryValue === "string" && isLessonCategory(categoryValue)) {
        category = categoryValue;
      }

      if (imageValue instanceof File) {
        if (!imageValue.type.startsWith("image/")) {
          return NextResponse.json({ error: "上傳檔案必須是圖片格式。" }, { status: 400 });
        }

        const bytes = await imageValue.arrayBuffer();
        image = {
          mimeType: imageValue.type || "image/jpeg",
          dataBase64: Buffer.from(bytes).toString("base64")
        };
      }
    } else {
      const body = (await request.json()) as {
        rawText?: string;
        category?: string;
      };

      rawText = body.rawText?.trim() ?? "";

      if (body.category && isLessonCategory(body.category)) {
        category = body.category;
      }
    }

    if (!rawText && !image) {
      return NextResponse.json({ error: "請提供日文文字或上傳圖片。" }, { status: 400 });
    }

    const result = await generateN1AnalysisWithGemini({
      rawText,
      category,
      image
    });

    return NextResponse.json({ text: result.text, model: result.model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini 產生失敗。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
