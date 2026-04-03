import { NextResponse } from "next/server";
import { deleteAllLessons, getDashboardData } from "@/lib/study-db";

export const runtime = "nodejs";

export async function DELETE() {
  try {
    await deleteAllLessons();

    return NextResponse.json(await getDashboardData());
  } catch (error) {
    const message = error instanceof Error ? error.message : "全部刪除失敗。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
