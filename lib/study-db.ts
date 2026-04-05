import type { Grammar, Lesson, Prisma, Sentence, Vocabulary } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ParsedLesson } from "@/lib/study-parser";
import { ImportedLesson, LessonCategory, LessonDetail, ReviewCard } from "@/types/study";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
const ebbinghausSchedule = [
  20 * MINUTE_MS,
  DAY_MS,
  DAY_MS * 2.5,
  DAY_MS * 7,
  DAY_MS * 14,
  DAY_MS * 30,
  DAY_MS * 90
];
const AGAIN_MS = 20 * MINUTE_MS;
const CACHE_TTL_MS = 3 * 1000;

type LessonWithCounts = Pick<Lesson, "id" | "title" | "category" | "createdAt"> & {
  _count: {
    sentences: number;
    vocabularies: number;
    grammarItems: number;
  };
};

type ReviewVocabularyCandidate = Pick<
  Vocabulary,
  | "id"
  | "lessonId"
  | "sectionTitle"
  | "word"
  | "reading"
  | "bookmarked"
  | "meaningZh"
  | "exampleSentence"
  | "nextReviewAt"
  | "reviewCount"
  | "correctCount"
  | "wrongCount"
  | "reviewStage"
> & {
  lesson: {
    title: string;
  };
};

type DashboardStats = {
  lessonTotal: number;
  sentenceTotal: number;
  vocabularyTotal: number;
  dueTotal: number;
  wrongTotal: number;
  bookmarkedTotal: number;
};

type DashboardData = {
  lessons: ImportedLesson[];
  cards: ReviewCard[];
  stats: DashboardStats;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

let lessonsCache: CacheEntry<ImportedLesson[]> | null = null;
let statsCache: CacheEntry<DashboardStats> | null = null;
const APP_STATS_ID = 1;

function getCachedValue<T>(entry: CacheEntry<T> | null) {
  if (!entry || entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry.value;
}

function setCachedValue<T>(value: T): CacheEntry<T> {
  return {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS
  };
}

function invalidateDashboardCache() {
  lessonsCache = null;
  statsCache = null;
}

function getTaipeiDayRange(now = new Date()) {
  const shiftedNow = new Date(now.getTime() + TAIPEI_OFFSET_MS);
  const shiftedStartMs = Date.UTC(
    shiftedNow.getUTCFullYear(),
    shiftedNow.getUTCMonth(),
    shiftedNow.getUTCDate(),
    0,
    0,
    0,
    0
  );
  const start = new Date(shiftedStartMs - TAIPEI_OFFSET_MS);
  const end = new Date(start.getTime() + DAY_MS);

  return { start, end };
}

type DbClient = Prisma.TransactionClient | typeof prisma;

async function countDueVocabulary(tx: DbClient, now = new Date()) {
  return tx.vocabulary.count({
    where: {
      mastered: false,
      meaningZh: {
        not: ""
      },
      nextReviewAt: {
        lte: now
      }
    }
  });
}

async function rebuildAppStats(tx: DbClient) {
  const [lessonTotal, sentenceTotal, vocabularyTotal, wrongTotal, bookmarkedTotal] = await Promise.all([
    tx.lesson.count(),
    tx.sentence.count(),
    tx.vocabulary.count(),
    tx.vocabulary.count({
      where: {
        mastered: false,
        wrongCount: {
          gt: 0
        }
      }
    }),
    tx.vocabulary.count({
      where: {
        bookmarked: true
      }
    })
  ]);

  return tx.appStat.upsert({
    where: { id: APP_STATS_ID },
    update: {
      lessonTotal,
      sentenceTotal,
      vocabularyTotal,
      wrongTotal,
      bookmarkedTotal
    },
    create: {
      id: APP_STATS_ID,
      lessonTotal,
      sentenceTotal,
      vocabularyTotal,
      wrongTotal,
      bookmarkedTotal
    }
  });
}

async function ensureAppStats(tx: DbClient) {
  const existing = await tx.appStat.findUnique({
    where: { id: APP_STATS_ID }
  });

  return existing ?? rebuildAppStats(tx);
}

async function updateAppStats(
  tx: DbClient,
  delta: Partial<Record<"lessonTotal" | "sentenceTotal" | "vocabularyTotal" | "wrongTotal" | "bookmarkedTotal", number>>
) {
  await ensureAppStats(tx);

  const data = Object.fromEntries(
    Object.entries(delta)
      .filter(([, value]) => typeof value === "number" && value !== 0)
      .map(([key, value]) => [key, { increment: value as number }])
  );

  if (!Object.keys(data).length) {
    return tx.appStat.findUniqueOrThrow({
      where: { id: APP_STATS_ID }
    });
  }

  return tx.appStat.update({
    where: { id: APP_STATS_ID },
    data
  });
}

function shuffle<T>(items: T[]) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[nextIndex]] = [result[nextIndex], result[index]];
  }

  return result;
}

function normalizeLesson(lesson: LessonWithCounts): ImportedLesson {
  return {
    id: lesson.id,
    title: lesson.title,
    category: lesson.category as LessonCategory,
    createdAt: lesson.createdAt.toISOString(),
    sentenceCount: lesson._count.sentences,
    vocabularyCount: lesson._count.vocabularies,
    grammarCount: lesson._count.grammarItems,
    vocabularyPreview: [],
    grammarPreview: []
  };
}

function vocabularyCardChoices(
  current: Pick<Vocabulary, "id" | "meaningZh">,
  pool: Array<Pick<Vocabulary, "id" | "meaningZh">>,
) {
  const distractors = shuffle(
    pool
      .filter((item) => item.id !== current.id)
      .map((item) => item.meaningZh)
      .filter((value, index, array) => value && array.indexOf(value) === index)
  ).slice(0, 3);

  return shuffle([current.meaningZh, ...distractors]);
}

function sentenceCardChoices(current: Sentence, pool: Sentence[]) {
  const distractors = shuffle(
    pool
      .filter((item) => item.id !== current.id)
      .map((item) => item.translationZh)
      .filter((value, index, array) => value && array.indexOf(value) === index)
  ).slice(0, 3);

  return shuffle([current.translationZh, ...distractors]);
}

function buildVocabularyHint(item: Pick<Vocabulary, "reading" | "exampleSentence">) {
  const parts = [];

  if (item.reading) {
    parts.push(`讀音：${item.reading}`);
  }

  if (item.exampleSentence) {
    parts.push(`例句：${item.exampleSentence}`);
  }

  return parts.join("｜") || "選出正確的中文意思";
}

function buildSentenceHint(item: Sentence) {
  if (item.sectionTitle && item.sectionTitle !== "未分類") {
    return `段落：${item.sectionTitle}`;
  }

  return "選出正確的中文翻譯";
}

function grammarCardChoices(current: Grammar, pool: Grammar[]) {
  const distractors = shuffle(
    pool
      .filter((item) => item.id !== current.id)
      .map((item) => item.meaningZh)
      .filter((value, index, array) => value && array.indexOf(value) === index)
  ).slice(0, 3);

  return shuffle([current.meaningZh, ...distractors]);
}

function buildGrammarHint(item: Grammar) {
  const parts = [];

  if (item.explanation) {
    parts.push(`說明：${item.explanation}`);
  }

  if (item.exampleSentence) {
    parts.push(`例句：${item.exampleSentence}`);
  }

  if (item.exampleTranslation) {
    parts.push(`例句中文：${item.exampleTranslation}`);
  }

  return parts.join("｜") || "選出正確的中文意思";
}

function reviewPriorityWeight(item: ReviewVocabularyCandidate, nowMs: number) {
  const msUntilDue = item.nextReviewAt.getTime() - nowMs;
  let weight = 1;

  if (msUntilDue <= 0) {
    weight = 8;
  } else if (msUntilDue <= 20 * MINUTE_MS) {
    weight = 6;
  } else if (msUntilDue <= DAY_MS) {
    weight = 4;
  } else if (msUntilDue <= DAY_MS * 3) {
    weight = 2.5;
  } else if (msUntilDue <= DAY_MS * 7) {
    weight = 1.5;
  }

  if (item.bookmarked) {
    weight *= 1.2;
  }

  if (item.wrongCount > 0) {
    weight *= 1.4;
  }

  return weight;
}

function pickVocabularyCandidatesByPriority(items: ReviewVocabularyCandidate[], limit: number, now = new Date()) {
  if (items.length <= limit) {
    return shuffle(items);
  }

  const pool = [...items];
  const picked: ReviewVocabularyCandidate[] = [];
  const nowMs = now.getTime();

  while (picked.length < limit && pool.length > 0) {
    const weights = pool.map((item) => reviewPriorityWeight(item, nowMs));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    if (totalWeight <= 0) {
      picked.push(...shuffle(pool).slice(0, limit - picked.length));
      break;
    }

    const roll = Math.random() * totalWeight;
    let cumulative = 0;
    let selectedIndex = 0;

    for (let index = 0; index < pool.length; index += 1) {
      cumulative += weights[index];
      if (roll <= cumulative) {
        selectedIndex = index;
        break;
      }
    }

    picked.push(pool[selectedIndex]);
    pool.splice(selectedIndex, 1);
  }

  return picked;
}

export async function importLesson(parsedLesson: ParsedLesson, category: LessonCategory) {
  const now = new Date();
  const lesson = await prisma.$transaction(async (tx) => {
    const createdLesson = await tx.lesson.create({
      data: {
        title: parsedLesson.title,
        category,
        sourceText: parsedLesson.sourceText,
        createdAt: now,
        sentences: {
          create: parsedLesson.sentences.map((sentence) => ({
            sectionTitle: sentence.sectionTitle,
            original: sentence.original,
            translationZh: sentence.translationZh,
            nextReviewAt: now,
            reviewStage: -1
          }))
        },
        vocabularies: {
          create: parsedLesson.vocabulary.map((vocabulary) => ({
            sectionTitle: vocabulary.sectionTitle,
            word: vocabulary.word,
            reading: vocabulary.reading,
            meaningZh: vocabulary.meaningZh,
            exampleSentence: vocabulary.exampleSentence,
            exampleTranslation: vocabulary.exampleTranslation,
            nextReviewAt: now,
            reviewStage: -1
          }))
        },
        grammarItems: {
          create: parsedLesson.grammar.map((grammar) => ({
            sectionTitle: grammar.sectionTitle,
            pattern: grammar.pattern,
            meaningZh: grammar.meaningZh,
            explanation: grammar.explanation,
            exampleSentence: grammar.exampleSentence,
            exampleTranslation: grammar.exampleTranslation,
            nextReviewAt: now,
            reviewStage: -1
          }))
        }
      }
    });

    await updateAppStats(tx, {
      lessonTotal: 1,
      sentenceTotal: parsedLesson.sentences.length,
      vocabularyTotal: parsedLesson.vocabulary.length
    });

    return createdLesson;
  });

  invalidateDashboardCache();

  return {
    lessonId: lesson.id,
    title: parsedLesson.title,
    category,
    sentenceCount: parsedLesson.sentences.length,
    vocabularyCount: parsedLesson.vocabulary.length,
    grammarCount: parsedLesson.grammar.length
  };
}

export async function listLessons(): Promise<ImportedLesson[]> {
  const cachedLessons = getCachedValue(lessonsCache);
  if (cachedLessons) {
    return cachedLessons;
  }

  const lessons = await prisma.lesson.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      category: true,
      createdAt: true,
      vocabularies: {
        select: {
          word: true
        },
        take: 6
      },
      grammarItems: {
        select: {
          pattern: true
        },
        take: 6
      },
      _count: {
        select: {
          sentences: true,
          vocabularies: true,
          grammarItems: true
        }
      }
    }
  });

  const normalizedLessons = lessons.map((lesson) => ({
    ...(normalizeLesson(lesson as LessonWithCounts)),
    vocabularyPreview: lesson.vocabularies.map((item) => item.word),
    grammarPreview: lesson.grammarItems.map((item) => item.pattern)
  }));

  lessonsCache = setCachedValue(normalizedLessons);

  return normalizedLessons;
}

export async function getLessonDetail(lessonId: number): Promise<LessonDetail | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      sentences: {
        orderBy: { id: "asc" }
      },
      vocabularies: {
        orderBy: { id: "asc" }
      },
      grammarItems: {
        orderBy: { id: "asc" }
      }
    }
  });

  if (!lesson) {
    return null;
  }

  return {
    id: lesson.id,
    title: lesson.title,
    category: lesson.category as LessonCategory,
    sourceText: lesson.sourceText,
    createdAt: lesson.createdAt.toISOString(),
    sentences: lesson.sentences.map((sentence) => ({
      id: sentence.id,
      lessonId: sentence.lessonId,
      sectionTitle: sentence.sectionTitle,
      original: sentence.original,
      translationZh: sentence.translationZh,
      nextReviewAt: sentence.nextReviewAt.toISOString(),
      reviewCount: sentence.reviewCount,
      correctCount: sentence.correctCount,
      wrongCount: sentence.wrongCount
    })),
    vocabulary: lesson.vocabularies.map((vocabulary) => ({
      id: vocabulary.id,
      lessonId: vocabulary.lessonId,
      sectionTitle: vocabulary.sectionTitle,
      word: vocabulary.word,
      reading: vocabulary.reading,
      bookmarked: (vocabulary as Vocabulary & { bookmarked?: boolean }).bookmarked ?? false,
      mastered: (vocabulary as Vocabulary & { mastered?: boolean }).mastered ?? false,
      meaningZh: vocabulary.meaningZh,
      exampleSentence: vocabulary.exampleSentence,
      exampleTranslation: vocabulary.exampleTranslation,
      nextReviewAt: vocabulary.nextReviewAt.toISOString(),
      reviewCount: vocabulary.reviewCount,
      correctCount: vocabulary.correctCount,
      wrongCount: vocabulary.wrongCount
    })),
    grammar: lesson.grammarItems.map((grammar) => ({
      id: grammar.id,
      lessonId: grammar.lessonId,
      sectionTitle: grammar.sectionTitle,
      pattern: grammar.pattern,
      meaningZh: grammar.meaningZh,
      explanation: grammar.explanation,
      exampleSentence: grammar.exampleSentence,
      exampleTranslation: grammar.exampleTranslation,
      nextReviewAt: grammar.nextReviewAt.toISOString(),
      reviewCount: grammar.reviewCount,
      correctCount: grammar.correctCount,
      wrongCount: grammar.wrongCount
    }))
  };
}

export async function updateLesson(lessonId: number, parsedLesson: ParsedLesson, category?: LessonCategory) {
  const existing = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      category: true,
      _count: {
        select: {
          sentences: true,
          vocabularies: true
        }
      }
    }
  });

  if (!existing) {
    throw new Error("找不到要更新的文章。");
  }

  await prisma.$transaction(async (tx) => {
    const [bookmarkedCount, wrongCount] = await Promise.all([
      tx.vocabulary.count({
        where: {
          lessonId,
          bookmarked: true
        }
      }),
      tx.vocabulary.count({
        where: {
          lessonId,
          mastered: false,
          wrongCount: {
            gt: 0
          }
        }
      })
    ]);

    await tx.grammar.deleteMany({
      where: { lessonId }
    });
    await tx.sentence.deleteMany({
      where: { lessonId }
    });
    await tx.vocabulary.deleteMany({
      where: { lessonId }
    });

    await tx.lesson.update({
      where: { id: lessonId },
      data: {
        title: parsedLesson.title,
        ...(category ? { category } : {}),
        sourceText: parsedLesson.sourceText,
        sentences: {
          create: parsedLesson.sentences.map((sentence) => ({
            sectionTitle: sentence.sectionTitle,
            original: sentence.original,
            translationZh: sentence.translationZh,
            nextReviewAt: new Date(),
            reviewStage: -1
          }))
        },
        vocabularies: {
          create: parsedLesson.vocabulary.map((vocabulary) => ({
            sectionTitle: vocabulary.sectionTitle,
            word: vocabulary.word,
            reading: vocabulary.reading,
            meaningZh: vocabulary.meaningZh,
            exampleSentence: vocabulary.exampleSentence,
            exampleTranslation: vocabulary.exampleTranslation,
            nextReviewAt: new Date(),
            reviewStage: -1
          }))
        },
        grammarItems: {
          create: parsedLesson.grammar.map((grammar) => ({
            sectionTitle: grammar.sectionTitle,
            pattern: grammar.pattern,
            meaningZh: grammar.meaningZh,
            explanation: grammar.explanation,
            exampleSentence: grammar.exampleSentence,
            exampleTranslation: grammar.exampleTranslation,
            nextReviewAt: new Date(),
            reviewStage: -1
          }))
        }
      }
    });

    await updateAppStats(tx, {
      sentenceTotal: parsedLesson.sentences.length - existing._count.sentences,
      vocabularyTotal: parsedLesson.vocabulary.length - existing._count.vocabularies,
      wrongTotal: -wrongCount,
      bookmarkedTotal: -bookmarkedCount
    });
  });

  invalidateDashboardCache();

  return {
    lessonId,
    title: parsedLesson.title,
    category: category ?? (existing.category as LessonCategory),
    sentenceCount: parsedLesson.sentences.length,
    vocabularyCount: parsedLesson.vocabulary.length,
    grammarCount: parsedLesson.grammar.length
  };
}

export async function deleteLesson(lessonId: number) {
  await prisma.$transaction(async (tx) => {
    const lesson = await tx.lesson.findUnique({
      where: { id: lessonId },
      select: {
        _count: {
          select: {
            sentences: true,
            vocabularies: true
          }
        }
      }
    });

    if (!lesson) {
      throw new Error("找不到要刪除的文章。");
    }

    const [bookmarkedCount, wrongCount] = await Promise.all([
      tx.vocabulary.count({
        where: {
          lessonId,
          bookmarked: true
        }
      }),
      tx.vocabulary.count({
        where: {
          lessonId,
          mastered: false,
          wrongCount: {
            gt: 0
          }
        }
      })
    ]);

    await tx.lesson.delete({
      where: { id: lessonId }
    });

    await updateAppStats(tx, {
      lessonTotal: -1,
      sentenceTotal: -lesson._count.sentences,
      vocabularyTotal: -lesson._count.vocabularies,
      wrongTotal: -wrongCount,
      bookmarkedTotal: -bookmarkedCount
    });
  });

  invalidateDashboardCache();
}

export async function deleteAllLessons() {
  await prisma.$transaction(async (tx) => {
    await tx.lesson.deleteMany({});
    await tx.appStat.upsert({
      where: { id: APP_STATS_ID },
      update: {
        lessonTotal: 0,
        sentenceTotal: 0,
        vocabularyTotal: 0,
        wrongTotal: 0,
        bookmarkedTotal: 0
      },
      create: {
        id: APP_STATS_ID,
        lessonTotal: 0,
        sentenceTotal: 0,
        vocabularyTotal: 0,
        wrongTotal: 0,
        bookmarkedTotal: 0
      }
    });
  });

  invalidateDashboardCache();
}

export async function updateLessonTitle(lessonId: number, title: string, category?: LessonCategory) {
  const lesson = await prisma.lesson.update({
    where: { id: lessonId },
    data: { title, ...(category ? { category } : {}) }
  });

  invalidateDashboardCache();

  return {
    lessonId: lesson.id,
    title: lesson.title,
    category: lesson.category as LessonCategory
  };
}

export async function updateLessonCategory(lessonId: number, category: LessonCategory) {
  const lesson = await prisma.lesson.update({
    where: { id: lessonId },
    data: { category }
  });

  invalidateDashboardCache();

  return {
    lessonId: lesson.id,
    title: lesson.title,
    category: lesson.category as LessonCategory
  };
}

export async function updateVocabularyBookmark(vocabularyId: number, bookmarked: boolean) {
  const vocabulary = await prisma.$transaction(async (tx) => {
    const current = await tx.vocabulary.findUnique({
      where: { id: vocabularyId },
      select: {
        lessonId: true,
        bookmarked: true
      }
    });

    if (!current) {
      throw new Error("找不到要更新的單字。");
    }

    const updated = await tx.vocabulary.update({
      where: { id: vocabularyId },
      data: { bookmarked } as Prisma.VocabularyUpdateInput
    });

    await updateAppStats(tx, {
      bookmarkedTotal: current.bookmarked === bookmarked ? 0 : bookmarked ? 1 : -1
    });

    return updated;
  });

  invalidateDashboardCache();

  return {
    vocabularyId: vocabulary.id,
    bookmarked: (vocabulary as Vocabulary & { bookmarked?: boolean }).bookmarked ?? bookmarked,
    lessonId: vocabulary.lessonId
  };
}

export async function updateVocabularyMastered(vocabularyId: number, mastered: boolean) {
  const vocabulary = await prisma.$transaction(async (tx) => {
    const current = await tx.vocabulary.findUnique({
      where: { id: vocabularyId },
      select: {
        lessonId: true,
        mastered: true,
        wrongCount: true
      }
    });

    if (!current) {
      throw new Error("找不到要更新的單字。");
    }

    const updated = await tx.vocabulary.update({
      where: { id: vocabularyId },
      data: { mastered } as Prisma.VocabularyUpdateInput
    });

    const wasWrong = !current.mastered && current.wrongCount > 0;
    const isWrong = !mastered && current.wrongCount > 0;

    await updateAppStats(tx, {
      wrongTotal: Number(isWrong) - Number(wasWrong)
    });

    return updated;
  });

  invalidateDashboardCache();

  return {
    vocabularyId: vocabulary.id,
    mastered: (vocabulary as Vocabulary & { mastered?: boolean }).mastered ?? mastered,
    lessonId: vocabulary.lessonId
  };
}

export async function listDueReviewCards(
  limit = 20,
  mode: "all" | "wrong" | "today" = "all"
): Promise<ReviewCard[]> {
  const now = new Date();
  const { start: taipeiDayStart, end: taipeiDayEnd } = getTaipeiDayRange(now);
  const vocabularyWhere: Prisma.VocabularyWhereInput = {
    mastered: false,
    meaningZh: {
      not: ""
    },
    ...(mode === "wrong"
      ? {
          wrongCount: {
            gt: 0
          }
        }
      : {}),
    ...(mode === "today"
      ? {
          lesson: {
            is: {
              createdAt: {
                gte: taipeiDayStart,
                lt: taipeiDayEnd
              }
            }
          }
        }
      : {})
  };

  const vocabularies = await prisma.vocabulary.findMany({
    where: vocabularyWhere,
    select: {
      id: true,
      lessonId: true,
      sectionTitle: true,
      word: true,
      reading: true,
      bookmarked: true,
      meaningZh: true,
      exampleSentence: true,
      nextReviewAt: true,
      reviewCount: true,
      correctCount: true,
      wrongCount: true,
      reviewStage: true,
      lesson: {
        select: {
          title: true
        }
      }
    },
    orderBy: [
      { nextReviewAt: "asc" },
      { id: "asc" }
    ],
    take: Math.max(limit * 12, 120)
  });

  const selectedVocabularies = pickVocabularyCandidatesByPriority(vocabularies, limit, now);

  const vocabularyCards: ReviewCard[] = selectedVocabularies.map((item) => ({
    id: item.id,
    kind: "vocabulary",
    lessonId: item.lessonId,
    lessonTitle: item.lesson.title,
    sectionTitle: item.sectionTitle,
    prompt: item.word,
    answer: item.meaningZh,
    hint: buildVocabularyHint(item),
    choices: vocabularyCardChoices(item, vocabularies),
    nextReviewAt: item.nextReviewAt.toISOString(),
    reviewCount: item.reviewCount,
    correctCount: item.correctCount,
    wrongCount: item.wrongCount,
    reviewStage: item.reviewStage
  }));

  return shuffle(vocabularyCards);
}

export async function getStats() {
  const cachedStats = getCachedValue(statsCache);
  if (cachedStats) {
    return cachedStats;
  }

  const now = new Date();
  const [summary, reviewableVocabularyTotal] = await Promise.all([
    ensureAppStats(prisma),
    countDueVocabulary(prisma, now)
  ]);

  const stats = {
    lessonTotal: summary.lessonTotal,
    sentenceTotal: summary.sentenceTotal,
    vocabularyTotal: summary.vocabularyTotal,
    dueTotal: reviewableVocabularyTotal,
    wrongTotal: summary.wrongTotal,
    bookmarkedTotal: summary.bookmarkedTotal
  };

  statsCache = setCachedValue(stats);

  return stats;
}

export async function getDashboardData(mode: "all" | "wrong" | "today" = "all"): Promise<DashboardData> {
  const [lessons, cards, stats] = await Promise.all([
    listLessons(),
    listDueReviewCards(20, mode),
    getStats()
  ]);

  return {
    lessons,
    cards,
    stats
  };
}

export async function submitReview(input: {
  kind: "sentence" | "vocabulary" | "grammar";
  id: number;
  remembered: boolean;
}) {
  const nextReviewAt = await prisma.$transaction(async (tx) => {
    const current =
      input.kind === "sentence"
        ? await tx.sentence.findUnique({ where: { id: input.id } })
        : input.kind === "vocabulary"
          ? await tx.vocabulary.findUnique({ where: { id: input.id } })
          : await tx.grammar.findUnique({ where: { id: input.id } });

    if (!current) {
      throw new Error("找不到要更新的複習卡片。");
    }

    const normalizedStage = current.reviewCount === 0 && current.reviewStage === 0 ? -1 : current.reviewStage;
    const nextStage = input.remembered
      ? Math.min(normalizedStage + 1, ebbinghausSchedule.length - 1)
      : -1;
    const computedNextReviewAt = input.remembered
      ? new Date(Date.now() + ebbinghausSchedule[nextStage])
      : new Date(Date.now() + AGAIN_MS);

    const data: Prisma.SentenceUpdateInput & Prisma.VocabularyUpdateInput & Prisma.GrammarUpdateInput = {
      nextReviewAt: computedNextReviewAt,
      reviewStage: nextStage,
      reviewCount: { increment: 1 },
      correctCount: { increment: input.remembered ? 1 : 0 },
      wrongCount: { increment: input.remembered ? 0 : 1 }
    };

    if (input.kind === "sentence") {
      await tx.sentence.update({
        where: { id: input.id },
        data
      });
    } else if (input.kind === "vocabulary") {
      await tx.vocabulary.update({
        where: { id: input.id },
        data
      });

      const currentVocabulary = current as Vocabulary;

      if (!input.remembered && currentVocabulary.wrongCount === 0 && !currentVocabulary.mastered) {
        await updateAppStats(tx, {
          wrongTotal: 1
        });
      }
    } else {
      await tx.grammar.update({
        where: { id: input.id },
        data
      });
    }

    return computedNextReviewAt;
  });

  invalidateDashboardCache();

  return { nextReviewAt: nextReviewAt.toISOString() };
}
