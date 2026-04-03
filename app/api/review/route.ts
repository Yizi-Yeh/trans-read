import { NextResponse } from "next/server";
import { getDashboardData, getStats, listDueReviewCards, submitReview } from "@/lib/study-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") === "wrong" ? "wrong" : "all";

    return NextResponse.json(await getDashboardData(mode));
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取複習資料失敗。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: number;
      kind?: "sentence" | "vocabulary" | "grammar";
      remembered?: boolean;
      mode?: "all" | "wrong";
    };

    if (!body.id || !body.kind || typeof body.remembered !== "boolean") {
      return NextResponse.json({ error: "複習資料不完整。" }, { status: 400 });
    }

    await submitReview({
      id: body.id,
      kind: body.kind,
      remembered: body.remembered
    });

    const [cards, stats] = await Promise.all([
      listDueReviewCards(20, body.mode === "wrong" ? "wrong" : "all"),
      getStats()
    ]);

    return NextResponse.json({ cards, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新複習結果失敗。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
