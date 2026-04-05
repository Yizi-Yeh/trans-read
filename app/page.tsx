"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  ButtonBase,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  InputAdornment,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import AutoStoriesRoundedIcon from "@mui/icons-material/AutoStoriesRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import MusicNoteOutlinedIcon from "@mui/icons-material/MusicNoteOutlined";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import BookmarkRoundedIcon from "@mui/icons-material/BookmarkRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DoneRoundedIcon from "@mui/icons-material/DoneRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import type {
  ImportedLesson,
  LessonCategory,
  LessonDetail,
  ReviewCard,
} from "@/types/study";

function toTaipeiDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function applyTitleToSourceText(sourceText: string, title: string) {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    return sourceText;
  }

  const trimmedSource = sourceText.trim();
  if (!trimmedSource) {
    return `標題：${normalizedTitle}`;
  }

  if (/^標題：/m.test(trimmedSource)) {
    return trimmedSource.replace(/^標題：.*$/m, `標題：${normalizedTitle}`);
  }

  return `標題：${normalizedTitle}\n\n${trimmedSource}`;
}

function renderCountTabLabel(label: string, count: number) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      justifyContent="center"
      sx={{ whiteSpace: "nowrap", flexWrap: "nowrap" }}
    >
      <Box component="span" sx={{ whiteSpace: "nowrap" }}>
        {label}
      </Box>
      <Chip
        label={count}
        size="small"
        sx={{
          height: 22,
          borderRadius: "999px",
          "& .MuiChip-label": {
            px: 0.9,
            fontSize: 12,
            fontWeight: 700,
          },
        }}
      />
    </Stack>
  );
}

function findSentenceForVocabularyCard(lesson: LessonDetail, card: ReviewCard) {
  if (card.kind !== "vocabulary") {
    return null;
  }

  const vocabularyItem = lesson.vocabulary.find((item) => item.id === card.id);
  const keywords = [
    vocabularyItem?.word,
    card.prompt,
    vocabularyItem?.exampleSentence,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim());

  for (const keyword of keywords) {
    const matchedSentence = lesson.sentences.find((sentence) =>
      sentence.original.includes(keyword),
    );
    if (matchedSentence) {
      return matchedSentence;
    }
  }

  return null;
}

function toLessonSummary(lesson: LessonDetail): ImportedLesson {
  return {
    id: lesson.id,
    title: lesson.title,
    category: lesson.category,
    createdAt: lesson.createdAt,
    sentenceCount: lesson.sentences.length,
    vocabularyCount: lesson.vocabulary.length,
    grammarCount: lesson.grammar.length,
    vocabularyPreview: lesson.vocabulary.slice(0, 6).map((item) => item.word),
    grammarPreview: lesson.grammar.slice(0, 6).map((item) => item.pattern),
  };
}

type DashboardPayload = {
  lessons: ImportedLesson[];
  cards: ReviewCard[];
  stats: {
    lessonTotal: number;
    sentenceTotal: number;
    vocabularyTotal: number;
    dueTotal: number;
    wrongTotal: number;
    bookmarkedTotal: number;
  };
};

type DashboardStats = DashboardPayload["stats"];

type BookmarkedVocabularyItem = {
  id: number;
  lessonId: number;
  lessonTitle: string;
  lessonCategory: string;
  word: string;
  reading: string;
  meaningZh: string;
  exampleSentence: string;
  exampleTranslation: string;
  bookmarked: boolean;
};

const UI_STATE_STORAGE_KEY = "jp-n1-ui-state";
const AI_LOADING_HINTS = [
  "AI 正在閱讀內容...",
  "AI 正在進行 OCR 與語意理解...",
  "AI 正在整理 N1 解析格式...",
];

type StoredUiState = {
  activeTab: "lessons" | "detail" | "review" | "bookmarks" | "wrongs";
  activeDetailTab: "sentences" | "vocabulary" | "grammar";
  lessonFilter: LessonCategory;
  mobileBackTab:
    | "home"
    | "library"
    | "detail"
    | "review"
    | "bookmarks"
    | "wrongs"
    | "import";
  mobileTab:
    | "home"
    | "library"
    | "detail"
    | "review"
    | "bookmarks"
    | "wrongs"
    | "import";
  reviewMode: "all" | "wrong" | "today";
  selectedLessonId: number | null;
  vocabularyViewMode: "lesson" | "bookmarked";
};

type LessonDateFilter = "all" | "today" | "7d" | "30d";

type ReviewTarget = {
  id: number;
  kind: "sentence" | "vocabulary" | "grammar";
  detailTab: "sentences" | "vocabulary" | "grammar";
  lessonId: number;
};

type HighlightTarget = {
  id: number;
  kind: "sentence" | "vocabulary" | "grammar";
};

type VocabularyDisplayItem = {
  id: number;
  word: string;
  reading: string;
  meaningZh: string;
  exampleSentence: string;
  exampleTranslation: string;
  bookmarked: boolean;
  lessonTitle: string;
};

function pickLabeledValue(text: string, labels: string[]) {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}[：:]\\s*([^\\n]+)`));
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }
  return "";
}

function stripLabelPrefix(value: string, labels: string[]) {
  if (!value.trim()) {
    return "";
  }

  const pattern = new RegExp(`^(${labels.join("|")})[：:]\\s*`);
  return value.replace(pattern, "").trim();
}

function sanitizeDisplayValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const blocked = [
    "單字解析",
    "文法解析",
    "例句",
    "常用使用場景",
    "原句",
    "中文翻譯",
    "無"
  ];

  if (blocked.includes(trimmed.replace(/[：:]/g, ""))) {
    return "";
  }

  if (/^(單字解析|文法解析|例句|常用使用場景|原句|中文翻譯)[：:]?$/.test(trimmed)) {
    return "";
  }

  return trimmed;
}

function normalizeVocabularyDisplayItem(item: VocabularyDisplayItem): VocabularyDisplayItem {
  const combined = [item.word, item.reading, item.meaningZh, item.exampleSentence, item.exampleTranslation].join("\n");

  const word = sanitizeDisplayValue(
    (
    stripLabelPrefix(item.word, ["日文", "單字"]) ||
    pickLabeledValue(combined, ["日文", "單字"]) ||
    item.word
    ).trim()
  );
  const reading = sanitizeDisplayValue(
    (
    stripLabelPrefix(item.reading, ["假名", "讀音"]) ||
    pickLabeledValue(combined, ["假名", "讀音"]) ||
    item.reading
    ).trim()
  );
  const meaningZh = sanitizeDisplayValue(
    (
    stripLabelPrefix(item.meaningZh, ["中文意思", "意思", "意義"]) ||
    pickLabeledValue(combined, ["中文意思", "意思", "意義"]) ||
    item.meaningZh
    ).trim()
  );
  const exampleSentence = sanitizeDisplayValue(
    (
    stripLabelPrefix(item.exampleSentence, ["單字例句", "例句"]) ||
    pickLabeledValue(combined, ["單字例句", "例句"]) ||
    item.exampleSentence
    ).trim()
  );
  const exampleTranslation = sanitizeDisplayValue(
    (
    stripLabelPrefix(item.exampleTranslation, ["單字例句中文", "例句中文", "中文翻譯"]) ||
    pickLabeledValue(combined, ["單字例句中文", "例句中文", "中文翻譯"]) ||
    item.exampleTranslation
    ).trim()
  );
  const splitPair = !exampleTranslation && exampleSentence.includes("｜") ? exampleSentence.split("｜") : null;

  return {
    ...item,
    word,
    reading,
    meaningZh: meaningZh === "無" ? "" : meaningZh,
    exampleSentence: exampleSentence === "無" ? "" : (splitPair?.[0]?.trim() || exampleSentence),
    exampleTranslation: exampleTranslation === "無" ? "" : (splitPair?.[1]?.trim() || exampleTranslation)
  };
}

function normalizeSentenceDisplayItem(item: { original: string; translationZh: string }) {
  return {
    original: sanitizeDisplayValue(stripLabelPrefix(item.original, ["原句", "原文"]).trim()),
    translationZh: sanitizeDisplayValue(stripLabelPrefix(item.translationZh, ["中文翻譯", "中文", "翻譯"]).trim())
  };
}

function normalizeGrammarDisplayItem(item: {
  pattern: string;
  meaningZh: string;
  explanation: string;
  exampleSentence: string;
  exampleTranslation: string;
}) {
  const combined = [item.pattern, item.meaningZh, item.explanation, item.exampleSentence, item.exampleTranslation].join("\n");
  const pattern = sanitizeDisplayValue(
    (stripLabelPrefix(item.pattern, ["文法"]) || pickLabeledValue(combined, ["文法"]) || item.pattern).trim()
  );
  const meaningZh = sanitizeDisplayValue(
    (
    stripLabelPrefix(item.meaningZh, ["意思", "意義"]) ||
    pickLabeledValue(combined, ["意思", "意義"]) ||
    item.meaningZh
    ).trim()
  );
  const explanation = sanitizeDisplayValue(
    (
    stripLabelPrefix(item.explanation, ["語氣／用法說明", "語氣/用法說明", "語氣／用法", "語氣/用法", "語氣與用法說明", "語氣與用法", "用法說明", "說明"]) ||
    pickLabeledValue(combined, ["語氣／用法說明", "語氣/用法說明", "語氣／用法", "語氣/用法", "語氣與用法說明", "語氣與用法", "用法說明", "說明"]) ||
    item.explanation
    ).trim()
  );
  const exampleSentence = sanitizeDisplayValue(
    (
    stripLabelPrefix(item.exampleSentence, ["例句", "日文"]) ||
    pickLabeledValue(combined, ["例句", "日文"]) ||
    item.exampleSentence
    ).trim()
  );
  const exampleTranslation = sanitizeDisplayValue(
    (
    stripLabelPrefix(item.exampleTranslation, ["中文", "中文翻譯", "例句中文"]) ||
    pickLabeledValue(combined, ["中文", "中文翻譯", "例句中文"]) ||
    item.exampleTranslation
    ).trim()
  );
  const splitPair = !exampleTranslation && exampleSentence.includes("｜") ? exampleSentence.split("｜") : null;

  return {
    pattern,
    meaningZh: meaningZh === "無" ? "" : meaningZh,
    explanation: explanation === "無" ? "" : explanation,
    exampleSentence: exampleSentence === "無" ? "" : (splitPair?.[0]?.trim() || exampleSentence),
    exampleTranslation: exampleTranslation === "無" ? "" : (splitPair?.[1]?.trim() || exampleTranslation)
  };
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const text = await response.text();

  if (!text.trim()) {
    return {
      response,
      payload: { error: "伺服器沒有回傳資料。" } as { error: string },
    };
  }

  try {
    return {
      response,
      payload: JSON.parse(text) as T | { error: string },
    };
  } catch {
    return {
      response,
      payload: {
        error: response.ok
          ? "伺服器回傳格式錯誤。"
          : `伺服器暫時發生錯誤（${response.status}）。`,
      } as { error: string },
    };
  }
}

export default function HomePage() {
  const [lessonFilter, setLessonFilter] = useState<LessonCategory>("文章");
  const [lessonDateFilter, setLessonDateFilter] = useState<LessonDateFilter>("all");
  const [lessonSearchKeyword, setLessonSearchKeyword] = useState("");
  const [reviewMode, setReviewMode] = useState<"all" | "wrong" | "today">(
    "all",
  );
  const [vocabularyViewMode, setVocabularyViewMode] = useState<
    "lesson" | "bookmarked"
  >("lesson");
  const [sourceText, setSourceText] = useState("");
  const [lessons, setLessons] = useState<ImportedLesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LessonDetail | null>(
    null,
  );
  const [category, setCategory] = useState<LessonCategory>("文章");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingCategory, setEditingCategory] =
    useState<LessonCategory>("文章");
  const [editingLessonText, setEditingLessonText] = useState("");
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [wrongCards, setWrongCards] = useState<ReviewCard[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "lessons" | "detail" | "review" | "bookmarks" | "wrongs"
  >("detail");
  const [activeDetailTab, setActiveDetailTab] = useState<
    "sentences" | "vocabulary" | "grammar"
  >("sentences");
  const [mobileTab, setMobileTab] = useState<
    "home" | "library" | "detail" | "review" | "bookmarks" | "wrongs" | "import"
  >("home");
  const [mobileBackTab, setMobileBackTab] = useState<
    "home" | "library" | "detail" | "review" | "bookmarks" | "wrongs" | "import"
  >("home");
  const [deleteTarget, setDeleteTarget] = useState<
    | { mode: "single"; id: number; title: string }
    | { mode: "all"; count: number }
    | null
  >(null);
  const [answered, setAnswered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiHintIndex, setAiHintIndex] = useState(0);
  const [aiImage, setAiImage] = useState<File | null>(null);
  const [savingLesson, setSavingLesson] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [deletingLesson, setDeletingLesson] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewProgressCount, setReviewProgressCount] = useState(0);
  const [bookmarkedVocabulary, setBookmarkedVocabulary] = useState<
    BookmarkedVocabularyItem[]
  >([]);
  const [wrongPreviewCards, setWrongPreviewCards] = useState<ReviewCard[]>([]);
  const [pendingReviewTarget, setPendingReviewTarget] =
    useState<ReviewTarget | null>(null);
  const [highlightTarget, setHighlightTarget] =
    useState<HighlightTarget | null>(null);
  const [stats, setStats] = useState({
    lessonTotal: 0,
    sentenceTotal: 0,
    vocabularyTotal: 0,
    dueTotal: 0,
    wrongTotal: 0,
    bookmarkedTotal: 0,
  });

  const currentCard = cards[0] ?? null;
  const isCorrect = currentCard ? selectedChoice === currentCard.answer : false;
  const todayDateKey = toTaipeiDateKey(new Date());
  const filteredLessons = lessons.filter((lesson) => {
    if (lesson.category !== lessonFilter) {
      return false;
    }

    if (lessonDateFilter !== "all") {
      if (lessonDateFilter === "today" && toTaipeiDateKey(lesson.createdAt) !== todayDateKey) {
        return false;
      }

      if (lessonDateFilter === "7d" || lessonDateFilter === "30d") {
        const days = lessonDateFilter === "7d" ? 7 : 30;
        const ageMs = Date.now() - new Date(lesson.createdAt).getTime();
        if (ageMs < 0 || ageMs > days * 24 * 60 * 60 * 1000) {
          return false;
        }
      }
    }

    const keyword = lessonSearchKeyword.trim().toLowerCase();
    if (!keyword) {
      return true;
    }

    const searchable = [
      lesson.title,
      lesson.category,
      ...lesson.vocabularyPreview,
      ...lesson.grammarPreview
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(keyword);
  });
  const todayNewVocabularyTotal = lessons
    .filter((lesson) => toTaipeiDateKey(lesson.createdAt) === todayDateKey)
    .reduce((sum, lesson) => sum + lesson.vocabularyCount, 0);
  const pastReviewVocabularyTotal = Math.max(
    stats.dueTotal - todayNewVocabularyTotal,
    0,
  );
  const reviewTotalCount =
    reviewMode === "today"
      ? todayNewVocabularyTotal
      : reviewMode === "wrong"
        ? stats.wrongTotal
        : stats.dueTotal;
  const reviewCurrentCount = Math.min(reviewProgressCount, reviewTotalCount);
  const learningTotal = Math.max(
    pastReviewVocabularyTotal + todayNewVocabularyTotal,
    1,
  );
  const mobileCardSx = {
    border: "1px solid rgba(31,29,26,0.06)",
    borderRadius: "22px",
    boxShadow: "0 6px 18px rgba(34, 38, 43, 0.04)",
    backgroundColor: "#ffffff",
  } as const;
  const articleSentenceSx = {
    fontFamily:
      '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", "PingFang TC", "Noto Sans TC", sans-serif',
    fontSize: { xs: 16, sm: 17, md: 18 },
    fontWeight: 800,
    lineHeight: 1.68,
    letterSpacing: "0.01em",
    color: "#242424",
  } as const;
  const articleTranslationSx = {
    mt: 1,
    fontSize: 16,
    lineHeight: 1.7,
    letterSpacing: "0.01em",
    color: "rgba(107, 114, 128, 0.95)",
  } as const;
  const masteredButtonSx = {
    py: 1.35,
    "&.Mui-disabled": {
      backgroundColor: "#EDE7E1",
      borderColor: "#DDD3CA",
      color: "#5B5045",
    },
    "&.Mui-disabled .MuiButton-startIcon": {
      color: "#7A6F64",
    },
  } as const;
  const reviewActionButtonSx = {
    py: 1.35,
    "&.Mui-disabled": {
      backgroundColor: "#EDE7E1",
      borderColor: "#DDD3CA",
      color: "#5B5045",
    },
    "&.Mui-disabled .MuiButton-startIcon": {
      color: "#7A6F64",
    },
  } as const;
  const importActionButtonSx = {
    width: "100%",
    py: 1.2,
  } as const;
  const importSourceTextFieldSx = {
    flex: 1,
    minHeight: 0,
    "& .MuiInputBase-root": {
      height: "100%",
      alignItems: "stretch",
      overflow: "hidden",
    },
    "& .MuiInputBase-inputMultiline": {
      height: "100% !important",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      resize: "none",
    },
    "& textarea": {
      overflowY: "auto !important",
      WebkitOverflowScrolling: "touch",
    },
  } as const;

  const syncDashboard = (payload: DashboardPayload) => {
    setLessons(payload.lessons);
    setCards(payload.cards);
    setStats(payload.stats);
    setSelectedChoice(null);
    setAnswered(false);
    void loadWrongPreview();
  };

  const syncCardsAndStats = (
    nextCards: ReviewCard[],
    nextStats: DashboardStats,
  ) => {
    setCards(nextCards);
    setStats(nextStats);
    setSelectedChoice(null);
    setAnswered(false);
    void loadWrongPreview();
  };

  const upsertLessonSummary = (lesson: LessonDetail) => {
    const nextLesson = toLessonSummary(lesson);
    setLessons((current) => {
      const existingIndex = current.findIndex((item) => item.id === lesson.id);

      if (existingIndex === -1) {
        return [nextLesson, ...current];
      }

      return current.map((item) => (item.id === lesson.id ? nextLesson : item));
    });
  };

  const patchSelectedLessonVocabulary = (
    vocabularyId: number,
    patch: Partial<Pick<LessonDetail["vocabulary"][number], "bookmarked" | "mastered">>,
  ) => {
    setSelectedLesson((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        vocabulary: current.vocabulary.map((item) =>
          item.id === vocabularyId ? { ...item, ...patch } : item,
        ),
      };
    });
  };

  const openMobileTab = (
    nextTab:
      | "home"
      | "library"
      | "detail"
      | "review"
      | "bookmarks"
      | "wrongs"
      | "import",
    backTo:
      | "home"
      | "library"
      | "detail"
      | "review"
      | "bookmarks"
      | "wrongs"
      | "import" = mobileTab,
  ) => {
    setMobileBackTab(backTo);
    setMobileTab(nextTab);
  };

  const detailTabForReviewKind = (
    kind: ReviewCard["kind"],
  ): "sentences" | "vocabulary" | "grammar" =>
    kind === "sentence"
      ? "sentences"
      : kind === "vocabulary"
        ? "vocabulary"
        : "grammar";

  const loadBookmarkedVocabulary = async () => {
    const { response, payload } = await requestJson<{
      vocabulary: BookmarkedVocabularyItem[];
    }>("/api/vocabulary");

    if (!response.ok || !("vocabulary" in payload)) {
      throw new Error("error" in payload ? payload.error : "讀取標記單字失敗");
    }

    setBookmarkedVocabulary(payload.vocabulary);
    return payload.vocabulary;
  };

  const openBookmarksPage = async (target: "desktop" | "mobile") => {
    setVocabularyViewMode("bookmarked");
    setActiveTab("bookmarks");
    if (target === "mobile") {
      openMobileTab("bookmarks", mobileTab);
    }

    try {
      await loadBookmarkedVocabulary();
    } catch (bookmarkError) {
      setBookmarkedVocabulary([]);
      setError(
        bookmarkError instanceof Error
          ? bookmarkError.message
          : "讀取標記單字失敗",
      );
    }
  };

  const loadWrongPreview = async () => {
    const { response, payload } = await requestJson<DashboardPayload>(
      "/api/review?mode=wrong",
    );

    if (!response.ok || !("cards" in payload)) {
      throw new Error("error" in payload ? payload.error : "讀取答錯內容失敗");
    }

    setWrongPreviewCards(payload.cards.slice(0, 2));
    return payload.cards;
  };

  const loadWrongCards = async () => {
    const { response, payload } = await requestJson<DashboardPayload>(
      "/api/review?mode=wrong",
    );

    if (!response.ok || !("cards" in payload)) {
      throw new Error("error" in payload ? payload.error : "讀取答錯內容失敗");
    }

    setWrongCards(payload.cards);
    setWrongPreviewCards(payload.cards.slice(0, 2));
    return payload.cards;
  };

  const openWrongsPage = async (target: "desktop" | "mobile") => {
    setActiveTab("wrongs");
    if (target === "mobile") {
      openMobileTab("wrongs", mobileTab);
    }

    try {
      await loadWrongCards();
    } catch (wrongError) {
      setWrongCards([]);
      setError(
        wrongError instanceof Error ? wrongError.message : "讀取答錯內容失敗",
      );
    }
  };

  const loadDashboard = async (
    mode: "all" | "wrong" | "today" = reviewMode,
  ) => {
    const { response, payload } = await requestJson<DashboardPayload>(
      `/api/review?mode=${mode}`,
    );

    if (!response.ok || !("cards" in payload)) {
      throw new Error("error" in payload ? payload.error : "讀取資料失敗");
    }

    syncDashboard(payload);
    return payload;
  };

  const loadLesson = async (
    lessonId: number,
    options?: { detailTab?: "sentences" | "vocabulary" | "grammar" },
  ) => {
    setLoadingLesson(true);

    try {
      const { response, payload } = await requestJson<{ lesson: LessonDetail }>(
        `/api/lessons/${lessonId}`,
      );

      if (!response.ok || !("lesson" in payload)) {
        throw new Error("error" in payload ? payload.error : "讀取文章失敗");
      }

      setSelectedLesson(payload.lesson);
      setEditingCategory(payload.lesson.category);
      setEditingTitle(payload.lesson.title);
      setEditingLessonText(payload.lesson.sourceText);
      setIsEditingLesson(false);
      setSelectedLessonId(lessonId);
      setActiveTab("detail");
      openMobileTab("detail", mobileTab);
      setVocabularyViewMode("lesson");
      setActiveDetailTab(options?.detailTab ?? "sentences");
      return payload.lesson;
    } catch (lessonError) {
      setError(
        lessonError instanceof Error ? lessonError.message : "讀取文章失敗",
      );
      return null;
    } finally {
      setLoadingLesson(false);
    }
  };

  const openReviewCardSource = async (card: ReviewCard) => {
    const initialDetailTab =
      card.kind === "vocabulary"
        ? "sentences"
        : detailTabForReviewKind(card.kind);
    const lesson = await loadLesson(card.lessonId, {
      detailTab: initialDetailTab,
    });

    if (!lesson) {
      return;
    }

    const matchedSentence = findSentenceForVocabularyCard(lesson, card);

    if (card.kind === "vocabulary" && !matchedSentence) {
      setActiveDetailTab("vocabulary");
      setPendingReviewTarget({
        id: card.id,
        kind: "vocabulary",
        detailTab: "vocabulary",
        lessonId: card.lessonId,
      });
      return;
    }

    setPendingReviewTarget({
      id: matchedSentence?.id ?? card.id,
      kind: matchedSentence ? "sentence" : card.kind,
      detailTab: matchedSentence
        ? "sentences"
        : detailTabForReviewKind(card.kind),
      lessonId: card.lessonId,
    });
  };

  useEffect(() => {
    if (
      !pendingReviewTarget ||
      !selectedLesson ||
      selectedLessonId !== pendingReviewTarget.lessonId
    ) {
      return;
    }

    if (activeDetailTab !== pendingReviewTarget.detailTab) {
      return;
    }

    const selector = `[data-review-kind="${pendingReviewTarget.kind}"][data-review-id="${pendingReviewTarget.id}"]`;
    const scrollToTarget = () => {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>(selector),
      );
      const element =
        elements.find((candidate) => {
          const style = window.getComputedStyle(candidate);
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            candidate.getClientRects().length > 0
          );
        }) ?? elements[0];

      if (!element) {
        return;
      }

      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightTarget({
        id: pendingReviewTarget.id,
        kind: pendingReviewTarget.kind,
      });
      setPendingReviewTarget(null);
    };

    const timeoutId = window.setTimeout(scrollToTarget, 80);
    return () => window.clearTimeout(timeoutId);
  }, [activeDetailTab, pendingReviewTarget, selectedLesson, selectedLessonId]);

  useEffect(() => {
    if (!highlightTarget) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightTarget((current) =>
        current?.id === highlightTarget.id &&
        current.kind === highlightTarget.kind
          ? null
          : current,
      );
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [highlightTarget]);

  const handleUpdateLesson = async () => {
    if (
      !selectedLessonId ||
      !editingLessonText.trim() ||
      !editingTitle.trim()
    ) {
      setError("請先輸入標題與編輯後的文章內容。");
      return;
    }

    setSavingLesson(true);
    setError(null);
    setSuccess(null);

    try {
      const sourceTextWithTitle = applyTitleToSourceText(
        editingLessonText,
        editingTitle,
      );
      const { response, payload } = await requestJson<{
        cards: ReviewCard[];
        stats: DashboardStats;
        lesson: LessonDetail | null;
        data: {
          title: string;
          category: LessonCategory;
          sentenceCount: number;
          vocabularyCount: number;
          grammarCount: number;
        };
      }>(`/api/lessons/${selectedLessonId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceText: sourceTextWithTitle,
          category: editingCategory,
        }),
      });

      if (!response.ok || !("lesson" in payload) || !("data" in payload)) {
        throw new Error("error" in payload ? payload.error : "編輯文章失敗");
      }

      syncCardsAndStats(payload.cards, payload.stats);
      if (payload.lesson) {
        setSelectedLesson(payload.lesson);
        upsertLessonSummary(payload.lesson);
      }
      setEditingLessonText(payload.lesson?.sourceText ?? sourceTextWithTitle);
      setEditingTitle(payload.lesson?.title ?? editingTitle.trim());
      setIsEditingLesson(false);
      setSuccess(
        `已編輯《${payload.data.title}》，目前共有 ${payload.data.sentenceCount} 句、${payload.data.vocabularyCount} 個單字、${payload.data.grammarCount} 筆文法。`,
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "編輯文章失敗",
      );
    } finally {
      setSavingLesson(false);
    }
  };

  const handleUpdateTitle = async () => {
    if (!selectedLessonId || !editingTitle.trim()) {
      setError("請先輸入標題。");
      return;
    }

    setSavingTitle(true);
    setError(null);
    setSuccess(null);

    try {
      const { response, payload } = await requestJson<{
        cards: ReviewCard[];
        stats: DashboardStats;
        lesson: LessonDetail | null;
        data: { title: string; category: LessonCategory };
      }>(`/api/lessons/${selectedLessonId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editingTitle.trim(),
          category: editingCategory,
        }),
      });

      if (!response.ok || !("lesson" in payload)) {
        throw new Error("error" in payload ? payload.error : "編輯標題失敗");
      }

      syncCardsAndStats(payload.cards, payload.stats);
      if (payload.lesson) {
        setSelectedLesson(payload.lesson);
        upsertLessonSummary(payload.lesson);
      }
      setEditingTitle(payload.lesson?.title ?? "");
      setEditingCategory(
        (payload.lesson?.category ?? "文章") as LessonCategory,
      );
      setSuccess(`已編輯標題為《${payload.data.title}》。`);
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "編輯標題失敗",
      );
    } finally {
      setSavingTitle(false);
    }
  };

  const handleUpdateCategory = async (
    lessonId: number,
    nextCategory: LessonCategory,
  ) => {
    setSavingTitle(true);
    setError(null);
    setSuccess(null);

    try {
      const { response, payload } = await requestJson<{
        cards: ReviewCard[];
        stats: DashboardStats;
        lesson: LessonDetail | null;
        data: { title: string; category: LessonCategory };
      }>(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category: nextCategory }),
      });

      if (!response.ok || !("lesson" in payload)) {
        throw new Error("error" in payload ? payload.error : "更新分類失敗");
      }

      syncCardsAndStats(payload.cards, payload.stats);

      if (payload.lesson) {
        upsertLessonSummary(payload.lesson);
      }

      if (selectedLessonId === lessonId && payload.lesson) {
        setSelectedLesson(payload.lesson);
        setEditingCategory(
          (payload.lesson?.category ?? nextCategory) as LessonCategory,
        );
      }
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "更新分類失敗",
      );
    } finally {
      setSavingTitle(false);
    }
  };

  const handleToggleVocabularyBookmark = async (
    vocabularyId: number,
    bookmarked: boolean,
  ) => {
    setSavingTitle(true);
    setError(null);
    setSuccess(null);

    try {
      const { response, payload } = await requestJson<{
        stats: DashboardStats;
        data: { vocabularyId: number; bookmarked: boolean; lessonId: number };
      }>(`/api/vocabulary/${vocabularyId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookmarked }),
      });

      if (!response.ok || !("data" in payload)) {
        throw new Error("error" in payload ? payload.error : "更新標記失敗");
      }

      if ("stats" in payload) {
        setStats(payload.stats);
      }
      patchSelectedLessonVocabulary(vocabularyId, { bookmarked });
      if (vocabularyViewMode === "bookmarked") {
        if (!bookmarked) {
          setBookmarkedVocabulary((current) =>
            current.filter((item) => item.id !== vocabularyId),
          );
        } else {
          await loadBookmarkedVocabulary();
        }
      }
    } catch (bookmarkError) {
      setError(
        bookmarkError instanceof Error ? bookmarkError.message : "更新標記失敗",
      );
    } finally {
      setSavingTitle(false);
    }
  };

  const handleMasterVocabulary = async (card: ReviewCard) => {
    if (card.kind !== "vocabulary") {
      return;
    }

    setReviewing(true);
    setError(null);
    setSuccess(null);

    try {
      const { response, payload } = await requestJson<{
        stats: DashboardStats;
        data: { vocabularyId: number; mastered: boolean; lessonId: number };
      }>(`/api/vocabulary/${card.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mastered: true }),
      });

      if (!response.ok || !("data" in payload)) {
        throw new Error(
          "error" in payload ? payload.error : "更新學會狀態失敗",
        );
      }

      if ("stats" in payload) {
        setStats(payload.stats);
      }
      patchSelectedLessonVocabulary(card.id, { mastered: true });
      setCards((current) =>
        current.filter((item) => !(item.kind === "vocabulary" && item.id === card.id)),
      );
      setWrongCards((current) =>
        current.filter((item) => !(item.kind === "vocabulary" && item.id === card.id)),
      );
      setWrongPreviewCards((current) =>
        current.filter((item) => !(item.kind === "vocabulary" && item.id === card.id)),
      );
      if (vocabularyViewMode === "bookmarked") {
        await loadBookmarkedVocabulary();
      }
    } catch (masterError) {
      setError(
        masterError instanceof Error ? masterError.message : "更新學會狀態失敗",
      );
    } finally {
      setReviewing(false);
    }
  };

  const handleDeleteLesson = () => {
    if (!selectedLesson) {
      return;
    }

    setDeleteTarget({
      mode: "single",
      id: selectedLesson.id,
      title: selectedLesson.title,
    });
  };

  const handleDeleteAllLessons = async () => {
    setDeletingLesson(true);
    setError(null);
    setSuccess(null);

    try {
      const { response, payload } = await requestJson<DashboardPayload>(
        "/api/lessons",
        {
          method: "DELETE",
        },
      );

      if (!response.ok || !("cards" in payload)) {
        throw new Error("error" in payload ? payload.error : "全部刪除失敗");
      }

      syncDashboard(payload);
      setSelectedLesson(null);
      setSelectedLessonId(null);
      setEditingLessonText("");
      setEditingTitle("");
      setIsEditingLesson(false);
      setSuccess("已刪除全部文章。");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "全部刪除失敗",
      );
    } finally {
      setDeletingLesson(false);
      setDeleteTarget(null);
    }
  };

  const handleDeleteLessonById = async (
    lessonId: number,
    lessonTitle: string,
  ) => {
    setDeletingLesson(true);
    setError(null);
    setSuccess(null);

    try {
      const { response, payload } = await requestJson<DashboardPayload>(
        `/api/lessons/${lessonId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok || !("cards" in payload)) {
        throw new Error("error" in payload ? payload.error : "刪除文章失敗");
      }

      syncDashboard(payload);

      if (selectedLessonId === lessonId) {
        const nextLesson = payload.lessons[0] ?? null;

        if (nextLesson) {
          await loadLesson(nextLesson.id);
        } else {
          setSelectedLesson(null);
          setSelectedLessonId(null);
          setEditingLessonText("");
          setEditingTitle("");
          setIsEditingLesson(false);
        }
      }

      setSuccess("文章已刪除。");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "刪除文章失敗",
      );
    } finally {
      setDeletingLesson(false);
      setDeleteTarget(null);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await loadDashboard("all");
        const storedStateRaw =
          window.sessionStorage.getItem(UI_STATE_STORAGE_KEY);
        const storedState = storedStateRaw
          ? (JSON.parse(storedStateRaw) as Partial<StoredUiState>)
          : null;
        const restoredLessonId =
          typeof storedState?.selectedLessonId === "number" &&
          payload.lessons.some(
            (lesson) => lesson.id === storedState.selectedLessonId,
          )
            ? storedState.selectedLessonId
            : null;

        if (
          storedState?.lessonFilter === "文章" ||
          storedState?.lessonFilter === "歌詞"
        ) {
          setLessonFilter(storedState.lessonFilter);
        }

        if (
          storedState?.reviewMode === "all" ||
          storedState?.reviewMode === "wrong" ||
          storedState?.reviewMode === "today"
        ) {
          setReviewMode(storedState.reviewMode);
        }

        if (
          storedState?.activeDetailTab === "sentences" ||
          storedState?.activeDetailTab === "vocabulary" ||
          storedState?.activeDetailTab === "grammar"
        ) {
          setActiveDetailTab(storedState.activeDetailTab);
        }

        if (
          storedState?.vocabularyViewMode === "lesson" ||
          storedState?.vocabularyViewMode === "bookmarked"
        ) {
          setVocabularyViewMode(storedState.vocabularyViewMode);
        }

        if (
          storedState?.mobileBackTab === "home" ||
          storedState?.mobileBackTab === "library" ||
          storedState?.mobileBackTab === "detail" ||
          storedState?.mobileBackTab === "review" ||
          storedState?.mobileBackTab === "bookmarks" ||
          storedState?.mobileBackTab === "wrongs" ||
          storedState?.mobileBackTab === "import"
        ) {
          setMobileBackTab(storedState.mobileBackTab);
        }

        if (
          storedState?.mobileTab === "home" ||
          storedState?.mobileTab === "library" ||
          storedState?.mobileTab === "detail" ||
          storedState?.mobileTab === "review" ||
          storedState?.mobileTab === "bookmarks" ||
          storedState?.mobileTab === "wrongs" ||
          storedState?.mobileTab === "import"
        ) {
          setMobileTab(storedState.mobileTab);
        }

        if (
          storedState?.activeTab === "lessons" ||
          storedState?.activeTab === "detail" ||
          storedState?.activeTab === "review" ||
          storedState?.activeTab === "bookmarks" ||
          storedState?.activeTab === "wrongs"
        ) {
          setActiveTab(storedState.activeTab);
        }

        if (restoredLessonId) {
          await loadLesson(restoredLessonId);
        } else if (
          storedState?.mobileTab === "bookmarks" ||
          storedState?.activeTab === "bookmarks"
        ) {
          await openBookmarksPage("desktop");
        } else if (
          storedState?.mobileTab === "wrongs" ||
          storedState?.activeTab === "wrongs"
        ) {
          await openWrongsPage("desktop");
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "讀取資料失敗",
        );
      } finally {
        setHydrating(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (hydrating || typeof window === "undefined") {
      return;
    }

    const nextState: StoredUiState = {
      activeTab,
      activeDetailTab,
      lessonFilter,
      mobileBackTab,
      mobileTab,
      reviewMode,
      selectedLessonId,
      vocabularyViewMode,
    };

    window.sessionStorage.setItem(
      UI_STATE_STORAGE_KEY,
      JSON.stringify(nextState),
    );
  }, [
    activeTab,
    activeDetailTab,
    hydrating,
    lessonFilter,
    mobileBackTab,
    mobileTab,
    reviewMode,
    selectedLessonId,
    vocabularyViewMode,
  ]);

  useEffect(() => {
    if (!generatingAi) {
      setAiHintIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setAiHintIndex((index) => (index + 1) % AI_LOADING_HINTS.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, [generatingAi]);

  const handleGenerateAiAnalysis = async () => {
    if (!sourceText.trim() && !aiImage) {
      setError("請輸入日文內容，或上傳一張圖片再產生解析。");
      return;
    }

    setGeneratingAi(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("rawText", sourceText.trim());
      if (aiImage) {
        formData.append("image", aiImage);
      }

      const { response, payload } = await requestJson<{
        text: string;
        model?: string;
      }>("/api/ai/gemini", {
        method: "POST",
        body: formData,
      });

      if (!response.ok || !("text" in payload)) {
        throw new Error("error" in payload ? payload.error : "AI 產生解析失敗");
      }

      setSourceText(payload.text);
      setSuccess(
        `已完成 AI 解析${payload.model ? `（${payload.model}）` : ""}，可直接檢查後送出。`,
      );
    } catch (aiError) {
      setError(aiError instanceof Error ? aiError.message : "AI 產生解析失敗");
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleImport = async () => {
    if (!sourceText.trim()) {
      setError("先貼上整理好的文章內容。");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { response, payload } = await requestJson<
        DashboardPayload & {
          data: {
            lessonId: number;
            title: string;
            category: LessonCategory;
            sentenceCount: number;
            vocabularyCount: number;
            grammarCount: number;
          };
        }
      >("/api/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sourceText, category }),
      });

      if (!response.ok || !("data" in payload)) {
        throw new Error("error" in payload ? payload.error : "匯入失敗");
      }

      syncDashboard(payload);
      setSourceText("");
      setCategory("文章");
      setSuccess(
        `已匯入《${payload.data.title}》${payload.data.category ? `（${payload.data.category}）` : ""}，新增 ${payload.data.sentenceCount} 句、${payload.data.vocabularyCount} 個單字、${payload.data.grammarCount} 筆文法。`,
      );
      await loadLesson(payload.data.lessonId);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "匯入失敗");
    } finally {
      setSaving(false);
    }
  };

  const handleChoice = (choice: string) => {
    if (answered) {
      return;
    }

    setSelectedChoice(choice);
    setAnswered(true);
  };

  const handleReview = async () => {
    if (!currentCard || !answered) {
      return;
    }

    setReviewing(true);
    setError(null);

    try {
      const { response, payload } = await requestJson<{
        cards: ReviewCard[];
        stats: DashboardStats;
      }>("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: currentCard.id,
          kind: currentCard.kind,
          remembered: isCorrect,
          mode: reviewMode,
        }),
      });

      if (!response.ok || !("cards" in payload) || !("stats" in payload)) {
        throw new Error(
          "error" in payload ? payload.error : "更新複習結果失敗",
        );
      }

      syncCardsAndStats(payload.cards, payload.stats);
      setReviewProgressCount((current) => current + 1);
    } catch (reviewError) {
      setError(
        reviewError instanceof Error ? reviewError.message : "更新複習結果失敗",
      );
    } finally {
      setReviewing(false);
    }
  };

  const speakJapanese = (text: string) => {
    const content = text.trim();
    if (!content || typeof window === "undefined") {
      return;
    }

    const synth = window.speechSynthesis;
    if (!synth) {
      setError("目前裝置不支援語音播放。");
      return;
    }

    const pickJapaneseVoice = (voices: SpeechSynthesisVoice[]) => {
      const japaneseVoices = voices.filter((voice) =>
        voice.lang.toLowerCase().startsWith("ja"),
      );

      if (japaneseVoices.length === 0) {
        return null;
      }

      const femaleNamePatterns = [
        /female/i,
        /woman/i,
        /kyoko/i,
        /sayaka/i,
        /haruka/i,
        /nanami/i,
      ];

      const femaleVoice = japaneseVoices.find((voice) =>
        femaleNamePatterns.some((pattern) => pattern.test(voice.name)),
      );

      return femaleVoice ?? japaneseVoices[0];
    };

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = "ja-JP";
    utterance.rate = 1;
    const preferredVoice = pickJapaneseVoice(synth.getVoices());
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    synth.speak(utterance);
  };

  const renderDetailContent = (lesson: LessonDetail) => {
    if (activeDetailTab === "sentences") {
      return (
        <Stack spacing={2.5}>
          {lesson.sentences.map((sentence) => {
            const display = normalizeSentenceDisplayItem(sentence);
            return (
              <Box
              key={sentence.id}
              data-review-kind="sentence"
              data-review-id={sentence.id}
              data-highlighted={
                highlightTarget?.kind === "sentence" &&
                highlightTarget.id === sentence.id
                  ? "true"
                  : "false"
              }
              sx={{
                pb: 2,
                px: 1.25,
                mx: -1.25,
                borderRadius: "14px",
                borderBottom: "1px solid rgba(34, 38, 43, 0.06)",
                scrollMarginTop: { xs: 84, lg: 32 },
                backgroundColor:
                  highlightTarget?.kind === "sentence" &&
                  highlightTarget.id === sentence.id
                    ? "rgba(201, 181, 156, 0.14)"
                    : "transparent",
                transition: "background-color 260ms ease",
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="flex-start"
                justifyContent="flex-start"
              >
                <Typography sx={{ ...articleSentenceSx, pr: 0.25 }}>
                  {display.original}
                </Typography>
                <IconButton
                  size="small"
                  aria-label={`播放句子發音 ${display.original}`}
                  onClick={() => speakJapanese(display.original)}
                  sx={{ mt: -0.1, color: "#8E775E" }}
                >
                  <VolumeUpRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Typography sx={articleTranslationSx}>
                {display.translationZh}
              </Typography>
            </Box>
            );
          })}
        </Stack>
      );
    }

    if (activeDetailTab === "vocabulary") {
      const items =
        vocabularyViewMode === "bookmarked"
          ? bookmarkedVocabulary.map((item) => ({
              id: item.id,
              word: item.word,
              reading: item.reading,
              meaningZh: item.meaningZh,
              exampleSentence: item.exampleSentence,
              exampleTranslation: item.exampleTranslation,
              bookmarked: item.bookmarked,
              lessonTitle: item.lessonTitle,
            }))
              .map(normalizeVocabularyDisplayItem)
              .filter((item) => Boolean(item.word.trim()))
          : lesson.vocabulary.map((item) => ({
              id: item.id,
              word: item.word,
              reading: item.reading,
              meaningZh: item.meaningZh,
              exampleSentence: item.exampleSentence,
              exampleTranslation: item.exampleTranslation,
              bookmarked: item.bookmarked,
              lessonTitle: lesson.title,
            }))
              .map(normalizeVocabularyDisplayItem)
              .filter((item) => Boolean(item.word.trim()));

      if (items.length === 0) {
        return (
          <Typography color="text.secondary">
            {vocabularyViewMode === "bookmarked"
              ? "目前還沒有標記任何單字。"
              : "這篇文章目前沒有解析到單字項目。"}
          </Typography>
        );
      }

      return (
        <Stack spacing={2.5}>
          {items.map((item) => (
            <Box
              key={item.id}
              data-review-kind="vocabulary"
              data-review-id={item.id}
              data-highlighted={
                highlightTarget?.kind === "vocabulary" &&
                highlightTarget.id === item.id
                  ? "true"
                  : "false"
              }
              sx={{
                pb: 2,
                px: 1.25,
                mx: -1.25,
                borderRadius: "14px",
                borderBottom: "1px solid rgba(34, 38, 43, 0.06)",
                scrollMarginTop: { xs: 84, lg: 32 },
                backgroundColor:
                  highlightTarget?.kind === "vocabulary" &&
                  highlightTarget.id === item.id
                    ? "rgba(201, 181, 156, 0.14)"
                    : "transparent",
                transition: "background-color 260ms ease",
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="flex-start"
                justifyContent="space-between"
              >
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  sx={{ minWidth: 0, pr: 1 }}
                >
                  <Typography
                    sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.7 }}
                  >
                    {item.word}
                    {item.reading ? `（${item.reading}）` : ""}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label={`播放單字發音 ${item.word}`}
                    onClick={() => speakJapanese(item.word)}
                    sx={{ color: "#8E775E" }}
                  >
                    <VolumeUpRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <IconButton
                  size="small"
                  aria-label={
                    item.bookmarked
                      ? `取消標記 ${item.word}`
                      : `標記 ${item.word}`
                  }
                  onClick={() =>
                    void handleToggleVocabularyBookmark(
                      item.id,
                      !item.bookmarked,
                    )
                  }
                  disabled={savingTitle}
                  sx={{
                    color: item.bookmarked ? "primary.main" : "text.secondary",
                    mt: -0.25,
                  }}
                >
                  {item.bookmarked ? (
                    <BookmarkRoundedIcon fontSize="small" />
                  ) : (
                    <BookmarkBorderRoundedIcon fontSize="small" />
                  )}
                </IconButton>
              </Stack>
              <Typography sx={{ mt: 0.75, lineHeight: 1.8 }}>
                {item.meaningZh}
              </Typography>
              {vocabularyViewMode === "bookmarked" ? (
                <Typography
                  color="text.secondary"
                  sx={{ mt: 0.75, lineHeight: 1.75 }}
                >
                  來源：{item.lessonTitle}
                </Typography>
              ) : null}
              {item.exampleSentence ? (
                <Typography
                  color="text.secondary"
                  sx={{ mt: 1.25, lineHeight: 1.9 }}
                >
                  例句：{item.exampleSentence}
                  {item.exampleTranslation
                    ? `｜${item.exampleTranslation}`
                    : ""}
                </Typography>
              ) : null}
            </Box>
          ))}
        </Stack>
      );
    }

    return lesson.grammar.length === 0 ? (
      <Typography color="text.secondary">
        這篇文章目前沒有解析到文法項目。
      </Typography>
    ) : (
      <Stack spacing={2.5}>
        {lesson.grammar.map((item) => {
          const display = normalizeGrammarDisplayItem(item);
          return (
            <Box
            key={item.id}
            data-review-kind="grammar"
            data-review-id={item.id}
            data-highlighted={
              highlightTarget?.kind === "grammar" &&
              highlightTarget.id === item.id
                ? "true"
                : "false"
            }
            sx={{
              pb: 2,
              px: 1.25,
              mx: -1.25,
              borderRadius: "14px",
              borderBottom: "1px solid rgba(34, 38, 43, 0.06)",
              scrollMarginTop: { xs: 84, lg: 32 },
              backgroundColor:
                highlightTarget?.kind === "grammar" &&
                highlightTarget.id === item.id
                  ? "rgba(201, 181, 156, 0.14)"
                  : "transparent",
              transition: "background-color 260ms ease",
            }}
          >
            <Typography sx={{ fontSize: 18, fontWeight: 700, lineHeight: 1.7 }}>
              {display.pattern}
            </Typography>
            <Typography sx={{ mt: 0.75, lineHeight: 1.8 }}>
              {display.meaningZh}
            </Typography>
            {display.explanation ? (
              <Typography
                color="text.secondary"
                sx={{ mt: 1, lineHeight: 1.85 }}
              >
                說明：{display.explanation}
              </Typography>
            ) : null}
            {display.exampleSentence ? (
              <Typography
                color="text.secondary"
                sx={{ mt: 1, lineHeight: 1.9 }}
              >
                例句：{display.exampleSentence}
                {display.exampleTranslation ? `｜${display.exampleTranslation}` : ""}
              </Typography>
            ) : null}
          </Box>
          );
        })}
      </Stack>
    );
  };

  const renderLessonList = (compact = false) => {
    if (hydrating) {
      return <CircularProgress size={24} />;
    }

    if (filteredLessons.length === 0) {
      return <Typography color="text.secondary">還沒有資料。</Typography>;
    }

    const groupedLessons = new Map<string, ImportedLesson[]>();
    filteredLessons.forEach((lesson) => {
      const dateKey = toTaipeiDateKey(lesson.createdAt);
      const group = groupedLessons.get(dateKey) ?? [];
      group.push(lesson);
      groupedLessons.set(dateKey, group);
    });

    return (
      <Stack spacing={compact ? 1.5 : 2}>
        {Array.from(groupedLessons.entries()).map(([dateKey, lessonsInDate]) => (
          <Card
            key={dateKey}
            elevation={0}
            sx={{
              border: "1px solid rgba(31,29,26,0.08)",
              borderRadius: compact ? "16px" : "18px",
            }}
          >
            <CardContent sx={{ p: compact ? 1.75 : 2 }}>
              <Stack spacing={compact ? 1 : 1.25}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography sx={{ fontWeight: 800, fontSize: compact ? 15 : 16 }}>
                    {dateKey === todayDateKey ? "本日新增" : dateKey}
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700 }}>
                    {lessonsInDate.length} 篇
                  </Typography>
                </Stack>
                <List disablePadding>
                  {lessonsInDate.map((lesson, index) => (
                    <Box key={lesson.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ListItemButton
                          selected={lesson.id === selectedLessonId}
                          onClick={() => void loadLesson(lesson.id)}
                          sx={{
                            borderRadius: 3,
                            flex: 1,
                            minWidth: 0,
                            px: compact ? 1.25 : 1.5,
                            py: compact ? 1 : 1.25,
                            alignItems: "flex-start",
                            backgroundColor: "#ffffff",
                            border:
                              lesson.id === selectedLessonId
                                ? "1px solid rgba(201, 181, 156, 0.28)"
                                : "1px solid transparent",
                            boxShadow:
                              lesson.id === selectedLessonId
                                ? "0 4px 12px rgba(201, 181, 156, 0.12)"
                                : "none",
                          }}
                        >
                          <ListItemText
                            primary={lesson.title}
                            primaryTypographyProps={{
                              noWrap: true,
                              fontWeight: lesson.id === selectedLessonId ? 700 : 600,
                            }}
                          />
                        </ListItemButton>
                        <IconButton
                          aria-label={`刪除 ${lesson.title}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget({
                              mode: "single",
                              id: lesson.id,
                              title: lesson.title,
                            });
                          }}
                          disabled={deletingLesson}
                          sx={{
                            mt: compact ? 0.25 : 0,
                            color: "#C9B59C",
                          }}
                        >
                          <DeleteOutlineRoundedIcon />
                        </IconButton>
                      </Stack>
                      {index < lessonsInDate.length - 1 ? (
                        <Divider sx={{ my: compact ? 1 : 1.25 }} />
                      ) : null}
                    </Box>
                  ))}
                </List>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  };

  const renderBookmarkedVocabularyContent = () => {
    if (bookmarkedVocabulary.length === 0) {
      return (
        <Typography color="text.secondary">目前還沒有標記任何單字。</Typography>
      );
    }

    return (
      <Stack spacing={2.5}>
        {bookmarkedVocabulary
          .map((item) =>
            normalizeVocabularyDisplayItem({
              id: item.id,
              word: item.word,
              reading: item.reading,
              meaningZh: item.meaningZh,
              exampleSentence: item.exampleSentence,
              exampleTranslation: item.exampleTranslation,
              bookmarked: item.bookmarked,
              lessonTitle: item.lessonTitle,
            }),
          )
          .filter((item) => Boolean(item.word.trim()))
          .map((item) => (
          <Box
            key={item.id}
            sx={{
              pb: 2,
              borderBottom: "1px solid rgba(34, 38, 43, 0.06)",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="flex-start"
              justifyContent="space-between"
            >
              <Typography
                sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.7, pr: 1 }}
              >
                {item.word}
                {item.reading ? `（${item.reading}）` : ""}
              </Typography>
              <IconButton
                size="small"
                aria-label={`取消標記 ${item.word}`}
                onClick={() =>
                  void handleToggleVocabularyBookmark(item.id, false)
                }
                disabled={savingTitle}
                sx={{ color: "primary.main", mt: -0.25 }}
              >
                <BookmarkRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Typography sx={{ mt: 0.75, lineHeight: 1.8 }}>
              {item.meaningZh}
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ mt: 0.75, lineHeight: 1.75 }}
            >
              來源：{item.lessonTitle}
            </Typography>
            {item.exampleSentence ? (
              <Typography
                color="text.secondary"
                sx={{ mt: 1.25, lineHeight: 1.9 }}
              >
                例句：{item.exampleSentence}
                {item.exampleTranslation ? `｜${item.exampleTranslation}` : ""}
              </Typography>
            ) : null}
          </Box>
        ))}
      </Stack>
    );
  };

  const renderWrongCardsContent = () => {
    if (wrongCards.length === 0) {
      return <Typography color="text.secondary">目前沒有答錯內容。</Typography>;
    }

    return (
      <Stack spacing={2.5}>
        {wrongCards.map((item) => (
          <Box
            key={`${item.kind}-${item.id}`}
            sx={{
              pb: 2,
              borderBottom: "1px solid rgba(34, 38, 43, 0.06)",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              alignItems="center"
            >
              <Chip
                size="small"
                label={item.lessonTitle}
                variant="outlined"
                clickable
                onClick={() => void openReviewCardSource(item)}
              />
            </Stack>
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{ mt: 1 }}
            >
              <Typography
                sx={{ fontSize: 18, fontWeight: 700, lineHeight: 1.7, flex: 1 }}
              >
                {item.prompt}
              </Typography>
              {item.kind === "vocabulary" ? (
                <IconButton
                  size="small"
                  aria-label={`從答錯內容移除 ${item.prompt}`}
                  onClick={() => void handleMasterVocabulary(item)}
                  disabled={reviewing}
                  sx={{ mt: -0.25, color: "#C9B59C" }}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              ) : null}
            </Stack>
            <Typography
              color="text.secondary"
              sx={{ mt: 0.75, lineHeight: 1.8 }}
            >
              正解：{item.answer}
            </Typography>
            {item.hint ? (
              <Typography
                color="text.secondary"
                sx={{ mt: 0.75, lineHeight: 1.75 }}
              >
                {item.hint}
              </Typography>
            ) : null}
          </Box>
        ))}
      </Stack>
    );
  };

  const renderReviewPanel = (compact = false) => {
    if (hydrating) {
      return <CircularProgress size={24} />;
    }

    if (!currentCard) {
      return (
        <Alert severity="info">
          先匯入有中文意思的單字，這裡就會開始隨機出題。
        </Alert>
      );
    }

    return (
      <Stack spacing={compact ? 2 : 2.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.25}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ minWidth: 0, flex: 1 }}>
            <Chip
              label={currentCard.lessonTitle}
              variant="outlined"
              clickable
              onClick={() => void openReviewCardSource(currentCard)}
            />
          </Stack>
          <Typography
            color="text.secondary"
            sx={{ fontSize: 16, fontWeight: 700, whiteSpace: "nowrap", lineHeight: 1.2 }}
          >
            {reviewCurrentCount}/{reviewTotalCount}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography
            variant={compact ? "h6" : "h5"}
            sx={{ fontWeight: 700, lineHeight: 1.5 }}
          >
            {currentCard.prompt}
          </Typography>
          {currentCard.kind === "vocabulary" ? (
            <IconButton
              size="small"
              aria-label={`播放單字發音 ${currentCard.prompt}`}
              onClick={() => speakJapanese(currentCard.prompt)}
              sx={{ color: "#8E775E" }}
            >
              <VolumeUpRoundedIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>
        {currentCard.hint ? (
          <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.9 }}>
            {currentCard.hint}
          </Typography>
        ) : null}

        <Stack spacing={1.5}>
          {currentCard.choices.map((choice) => {
            const chosen = selectedChoice === choice;
            const color =
              answered && choice === currentCard.answer
                ? "success"
                : answered && chosen && choice !== currentCard.answer
                  ? "error"
                  : "inherit";

            return (
              <Button
                key={choice}
                variant="outlined"
                color={color === "inherit" ? "primary" : color}
                onClick={() => handleChoice(choice)}
                disabled={answered}
                sx={{
                  justifyContent: "flex-start",
                  textAlign: "left",
                  alignItems: "flex-start",
                  px: 1.75,
                  py: 1.35,
                  color:
                    answered && choice === currentCard.answer
                      ? "success.main"
                      : answered && chosen && choice !== currentCard.answer
                        ? "error.main"
                        : "#8E775E",
                  backgroundColor:
                    answered && choice === currentCard.answer
                      ? "rgba(201, 181, 156, 0.12)"
                      : answered && chosen && choice !== currentCard.answer
                        ? "rgba(211, 47, 47, 0.08)"
                        : chosen
                          ? "rgba(201, 181, 156, 0.08)"
                          : "#ffffff",
                  borderColor:
                    answered && choice === currentCard.answer
                      ? "success.main"
                      : answered && chosen && choice !== currentCard.answer
                        ? "error.main"
                        : chosen
                          ? "#8E775E"
                          : "rgba(142, 119, 94, 0.45)",
                  "&:hover": {
                    borderColor: "#8E775E",
                    backgroundColor:
                      answered && choice === currentCard.answer
                        ? "rgba(201, 181, 156, 0.12)"
                        : answered && chosen && choice !== currentCard.answer
                          ? "rgba(211, 47, 47, 0.08)"
                          : "rgba(201, 181, 156, 0.08)",
                  },
                }}
              >
                {choice}
              </Button>
            );
          })}
        </Stack>

        {answered ? (
          <Alert severity={isCorrect ? "success" : "warning"}>
            {isCorrect ? "答對了。" : `答錯了，正解是：${currentCard.answer}`}
          </Alert>
        ) : null}

        <Button
          variant="contained"
          onClick={() => void handleReview()}
          disabled={!answered || reviewing}
          startIcon={
            reviewing ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <AutoStoriesRoundedIcon />
            )
          }
          sx={reviewActionButtonSx}
        >
          {reviewing ? "更新中" : "下一題"}
        </Button>

        {currentCard.kind === "vocabulary" ? (
          <Stack>
            <Button
              variant="contained"
              onClick={() => void handleMasterVocabulary(currentCard)}
              disabled={reviewing}
              startIcon={<DoneRoundedIcon />}
              sx={reviewActionButtonSx}
            >
              我學會了
            </Button>
          </Stack>
        ) : null}
      </Stack>
    );
  };

  const handleCloseErrorSnackbar = (_event?: unknown, reason?: string) => {
    if (reason === "clickaway") {
      return;
    }
    setError(null);
  };

  const handleCloseSuccessSnackbar = (_event?: unknown, reason?: string) => {
    if (reason === "clickaway") {
      return;
    }
    setSuccess(null);
  };

  return (
    <Container
      maxWidth="xl"
      sx={{
        pt: { xs: 0, lg: 6 },
        pb: { xs: 2, lg: 6 },
        px: { xs: 2, sm: 3 },
        minHeight: { xs: "100dvh", lg: "auto" },
      }}
    >
      <Stack spacing={4}>
        <Card
          elevation={0}
          sx={{
            border: "1px solid rgba(31,29,26,0.08)",
            display: { xs: "none", lg: "block" },
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as LessonCategory)
                }
                fullWidth
              >
                <MenuItem value="文章">文章</MenuItem>
                <MenuItem value="歌詞">歌詞</MenuItem>
              </Select>

              <TextField
                multiline
                rows={12}
                label="貼上文章內容"
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                sx={importSourceTextFieldSx}
              />

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <Button
                  variant="outlined"
                  component="label"
                  disabled={generatingAi || saving}
                  sx={importActionButtonSx}
                >
                  {aiImage ? "更換圖片" : "選擇圖片"}
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setAiImage(event.target.files?.[0] ?? null)
                    }
                  />
                </Button>
                {aiImage ? (
                  <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                    已選擇：{aiImage.name}
                  </Typography>
                ) : null}
              </Stack>

              <Button
                variant="outlined"
                size="large"
                onClick={() => void handleGenerateAiAnalysis()}
                disabled={generatingAi || saving}
                sx={importActionButtonSx}
              >
                {generatingAi ? AI_LOADING_HINTS[aiHintIndex] : "AI 產生解析"}
              </Button>

              <Button
                variant="contained"
                size="large"
                onClick={handleImport}
                disabled={saving || generatingAi}
                sx={importActionButtonSx}
              >
                {saving ? "送出中" : "送出"}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Box
          sx={{
            display: { xs: "block", lg: "none" },
            pb: "calc(88px + env(safe-area-inset-bottom))",
            mt: -1,
          }}
        >
          <Stack spacing={2}>
            {mobileTab === "home" ? (
              <Stack spacing={2}>
                <Card elevation={0} sx={mobileCardSx}>
                  <CardContent sx={{ p: 2.25 }}>
                    <Stack spacing={2}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: 18,
                              fontWeight: 800,
                              lineHeight: 1.25,
                            }}
                          >
                            學習
                          </Typography>
                          <Typography
                            color="text.secondary"
                            sx={{ mt: 0.5, fontSize: 14 }}
                          >
                            今天的進度檢查
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontSize: 18,
                            fontWeight: 800,
                            color: "primary.main",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {pastReviewVocabularyTotal + todayNewVocabularyTotal}/
                          {stats.vocabularyTotal || 0}
                        </Typography>
                      </Stack>

                      <Box
                        sx={{
                          height: 6,
                          borderRadius: 999,
                          backgroundColor: "rgba(201, 181, 156, 0.10)",
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            width: `${Math.min(
                              100,
                              ((pastReviewVocabularyTotal +
                                todayNewVocabularyTotal) /
                                learningTotal) *
                                100,
                            )}%`,
                            height: "100%",
                            backgroundColor: "primary.main",
                          }}
                        />
                      </Box>

                      <Typography
                        color="text.secondary"
                        sx={{ textAlign: "right", fontSize: 13, mt: -0.75 }}
                      >
                        {`${Math.min(
                          100,
                          Math.round(
                            ((pastReviewVocabularyTotal +
                              todayNewVocabularyTotal) /
                              learningTotal) *
                              100,
                          ),
                        )}%`}
                      </Typography>

                      <Stack direction="row" spacing={1.25}>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() => {
                            setReviewMode("all");
                            setReviewProgressCount(0);
                            void loadDashboard("all");
                            openMobileTab("review", "home");
                          }}
                          sx={{ py: 1, borderRadius: "16px", minHeight: 44 }}
                        >
                          過往複習 {pastReviewVocabularyTotal} 詞
                        </Button>
                        <Button
                          variant="outlined"
                          fullWidth
                          onClick={() => {
                            setReviewMode("today");
                            setReviewProgressCount(0);
                            void loadDashboard("today");
                            openMobileTab("review", "home");
                          }}
                          sx={{ py: 1, borderRadius: "16px", minHeight: 44 }}
                        >
                          本日新增 {todayNewVocabularyTotal} 詞
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                <Stack direction="row" spacing={1.5}>
                  <Card
                    elevation={0}
                    sx={{
                      flex: 1,
                      ...mobileCardSx,
                      borderRadius: "20px",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setLessonFilter("文章");
                      openMobileTab("library", "home");
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: "12px",
                            display: "grid",
                            placeItems: "center",
                            color: "primary.main",
                          }}
                        >
                          <DescriptionOutlinedIcon fontSize="small" />
                        </Box>
                        <Typography sx={{ fontWeight: 700 }}>文章</Typography>
                      </Stack>
                      <Typography
                        color="text.secondary"
                        sx={{ mt: 1, fontSize: 15 }}
                      >
                        {
                          lessons.filter((lesson) => lesson.category === "文章")
                            .length
                        }{" "}
                        篇
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card
                    elevation={0}
                    sx={{
                      flex: 1,
                      ...mobileCardSx,
                      borderRadius: "20px",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setLessonFilter("歌詞");
                      openMobileTab("library", "home");
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: "12px",
                            display: "grid",
                            placeItems: "center",
                            color: "primary.main",
                          }}
                        >
                          <MusicNoteOutlinedIcon fontSize="small" />
                        </Box>
                        <Typography sx={{ fontWeight: 700 }}>歌詞</Typography>
                      </Stack>
                      <Typography
                        color="text.secondary"
                        sx={{ mt: 1, fontSize: 15 }}
                      >
                        {
                          lessons.filter((lesson) => lesson.category === "歌詞")
                            .length
                        }{" "}
                        篇
                      </Typography>
                    </CardContent>
                  </Card>
                </Stack>

                <Stack direction="row" spacing={1.5}>
                  <Card
                    elevation={0}
                    sx={{
                      flex: 1,
                      ...mobileCardSx,
                      borderRadius: "20px",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      void openBookmarksPage("mobile");
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: "12px",
                            display: "grid",
                            placeItems: "center",
                            color: "primary.main",
                          }}
                        >
                          <BookmarkBorderRoundedIcon fontSize="small" />
                        </Box>
                        <Typography sx={{ fontWeight: 700 }}>標記單字</Typography>
                      </Stack>
                      <Typography
                        color="text.secondary"
                        sx={{ mt: 1, fontSize: 15 }}
                      >
                        {stats.bookmarkedTotal} 個
                      </Typography>
                    </CardContent>
                  </Card>

                  <Card
                    elevation={0}
                    sx={{
                      flex: 1,
                      ...mobileCardSx,
                      borderRadius: "20px",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      void openWrongsPage("mobile");
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: "12px",
                            backgroundColor: "rgba(201, 181, 156, 0.12)",
                            display: "grid",
                            placeItems: "center",
                            color: "#C9B59C",
                          }}
                        >
                          <ReplayRoundedIcon fontSize="small" />
                        </Box>
                        <Typography sx={{ fontWeight: 700 }}>
                          答錯內容
                        </Typography>
                      </Stack>
                      <Typography
                        color="text.secondary"
                        sx={{ mt: 1, fontSize: 15 }}
                      >
                        {wrongPreviewCards.length} 筆
                      </Typography>
                    </CardContent>
                  </Card>
                </Stack>

                <Card elevation={0} sx={mobileCardSx}>
                  <CardContent sx={{ p: 2.25 }}>
                    <Stack spacing={1.5}>
                      <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
                        最近教材
                      </Typography>
                      {renderLessonList(true)}
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            ) : null}

            {mobileTab === "import" ? (
              <Card
                elevation={0}
                sx={{
                  ...mobileCardSx,
                  minHeight: "calc(100dvh - 132px - env(safe-area-inset-bottom))",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardContent
                  sx={{
                    p: 2.5,
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0 }}>
                    <Select
                      value={category}
                      onChange={(event) =>
                        setCategory(event.target.value as LessonCategory)
                      }
                      fullWidth
                    >
                      <MenuItem value="文章">文章</MenuItem>
                      <MenuItem value="歌詞">歌詞</MenuItem>
                    </Select>

                    <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
                      <TextField
                        multiline
                        label="貼上文章內容"
                        value={sourceText}
                        onChange={(event) => setSourceText(event.target.value)}
                        sx={{ ...importSourceTextFieldSx, flex: 1 }}
                      />
                    </Box>

                    <Button
                      variant="outlined"
                      component="label"
                      disabled={generatingAi || saving}
                      sx={importActionButtonSx}
                    >
                      {aiImage ? "更換圖片" : "選擇圖片"}
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          setAiImage(event.target.files?.[0] ?? null)
                        }
                      />
                    </Button>
                    {aiImage ? (
                      <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                        已選擇：{aiImage.name}
                      </Typography>
                    ) : null}

                    <Button
                      variant="outlined"
                      size="large"
                      onClick={() => void handleGenerateAiAnalysis()}
                      disabled={generatingAi || saving}
                      sx={importActionButtonSx}
                    >
                      {generatingAi
                        ? AI_LOADING_HINTS[aiHintIndex]
                        : "AI 產生解析"}
                    </Button>

                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleImport}
                      disabled={saving || generatingAi}
                      sx={importActionButtonSx}
                    >
                      {saving ? "送出中" : "送出"}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ) : null}

            {mobileTab === "library" ? (
              <Card elevation={0} sx={mobileCardSx}>
                <CardContent sx={{ p: 2.25 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1.5 }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      教材列表
                    </Typography>
                    {lessons.length > 0 ? (
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() =>
                          setDeleteTarget({
                            mode: "all",
                            count: lessons.length,
                          })
                        }
                        disabled={deletingLesson}
                      >
                        全部刪除
                      </Button>
                    ) : null}
                  </Stack>
                  <Tabs
                    value={lessonFilter}
                    onChange={(_event, value) => setLessonFilter(value)}
                    variant="fullWidth"
                    sx={{ display: "none" }}
                  >
                    <Tab label="文章" value="文章" />
                    <Tab label="歌詞" value="歌詞" />
                  </Tabs>
                  <Stack spacing={1.25} sx={{ mb: 2 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="搜尋單字／標題"
                      value={lessonSearchKeyword}
                      onChange={(event) => setLessonSearchKeyword(event.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchRoundedIcon fontSize="small" />
                          </InputAdornment>
                        )
                      }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Select
                        size="small"
                        fullWidth
                        value={lessonDateFilter}
                        onChange={(event) => setLessonDateFilter(event.target.value as LessonDateFilter)}
                      >
                        <MenuItem value="all">全部日期</MenuItem>
                        <MenuItem value="today">本日</MenuItem>
                        <MenuItem value="7d">最近7日</MenuItem>
                        <MenuItem value="30d">最近30日</MenuItem>
                      </Select>
                      <Select
                        size="small"
                        fullWidth
                        value={lessonFilter}
                        onChange={(event) => setLessonFilter(event.target.value as LessonCategory)}
                      >
                        <MenuItem value="文章">文章</MenuItem>
                        <MenuItem value="歌詞">歌詞</MenuItem>
                      </Select>
                    </Stack>
                  </Stack>
                  {renderLessonList(true)}
                </CardContent>
              </Card>
            ) : null}

            {mobileTab === "detail" ? (
              loadingLesson ? (
                <CircularProgress size={24} />
              ) : selectedLesson ? (
                <Stack spacing={2}>
                  <Card elevation={0} sx={mobileCardSx}>
                    <CardContent sx={{ p: 2.25 }}>
                      <Stack spacing={2}>
                        <Box>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="flex-start"
                            justifyContent="space-between"
                          >
                            <Typography
                              variant="h5"
                              sx={{
                                fontSize: 18,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                minWidth: 0,
                                flex: 1,
                              }}
                            >
                              {selectedLesson.title}
                            </Typography>
                            <Stack direction="row" spacing={0.5}>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setIsEditingLesson((value) => !value)
                                }
                                sx={{
                                  color: "primary.main",
                                  "&:hover": {
                                    backgroundColor: "rgba(201, 181, 156, 0.12)",
                                  },
                                }}
                              >
                                <EditRoundedIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setDeleteTarget({
                                    mode: "single",
                                    id: selectedLesson.id,
                                    title: selectedLesson.title,
                                  })
                                }
                                disabled={deletingLesson}
                                sx={{
                                  color: "#C9B59C",
                                  "&:hover": {
                                    backgroundColor: "rgba(201, 181, 156, 0.18)",
                                  },
                                }}
                              >
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>
                          <Typography color="text.secondary" sx={{ mt: 1 }}>
                            閱讀時間：
                            {new Date(selectedLesson.createdAt).toLocaleString(
                              "zh-TW",
                            )}
                          </Typography>
                        </Box>

                        {isEditingLesson ? (
                          <Card
                            elevation={0}
                            sx={{
                              border: "1px solid rgba(31,29,26,0.06)",
                              borderRadius: "18px",
                              boxShadow: "none",
                            }}
                          >
                            <CardContent sx={{ pt: 0 }}>
                              <Stack spacing={2}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="文章標題"
                                  value={editingTitle}
                                  onChange={(event) =>
                                    setEditingTitle(event.target.value)
                                  }
                                />
                                <Select
                                  size="small"
                                  value={editingCategory}
                                  onChange={(event) =>
                                    setEditingCategory(
                                      event.target.value as LessonCategory,
                                    )
                                  }
                                  sx={{ width: "100%" }}
                                >
                                  <MenuItem value="文章">文章</MenuItem>
                                  <MenuItem value="歌詞">歌詞</MenuItem>
                                </Select>
                                <TextField
                                  multiline
                                  rows={12}
                                  label="編輯文章原始內容"
                                  value={editingLessonText}
                                  onChange={(event) =>
                                    setEditingLessonText(event.target.value)
                                  }
                                  sx={{
                                    "& .MuiInputBase-inputMultiline": {
                                      overflowY: "auto",
                                      resize: "none",
                                    },
                                  }}
                                />
                                <Button
                                  variant="contained"
                                  startIcon={
                                    savingLesson ? (
                                      <CircularProgress
                                        size={18}
                                        color="inherit"
                                      />
                                    ) : (
                                      <SaveRoundedIcon />
                                    )
                                  }
                                  onClick={() => void handleUpdateLesson()}
                                  disabled={savingLesson}
                                  sx={{ alignSelf: "flex-start" }}
                                >
                                  {savingLesson ? "儲存中" : "儲存變更"}
                                </Button>
                              </Stack>
                            </CardContent>
                          </Card>
                        ) : null}

                        <Card
                          elevation={0}
                          sx={{
                            border: "1px solid rgba(31,29,26,0.06)",
                            borderRadius: "18px",
                            boxShadow: "none",
                          }}
                        >
                          <CardContent sx={{ p: 1.25 }}>
                            <Tabs
                              value={activeDetailTab}
                              onChange={(_event, value) => {
                                setActiveDetailTab(value);
                                if (value !== "vocabulary") {
                                  setVocabularyViewMode("lesson");
                                }
                              }}
                              variant="fullWidth"
                            >
                              <Tab
                                label={renderCountTabLabel(
                                  "句子",
                                  selectedLesson.sentences.length,
                                )}
                                value="sentences"
                              />
                              <Tab
                                label={renderCountTabLabel(
                                  vocabularyViewMode === "bookmarked"
                                    ? "標記單字"
                                    : "單字",
                                  vocabularyViewMode === "bookmarked"
                                    ? bookmarkedVocabulary.length
                                    : selectedLesson.vocabulary.length,
                                )}
                                value="vocabulary"
                              />
                              <Tab
                                label={renderCountTabLabel(
                                  "文法",
                                  selectedLesson.grammar.length,
                                )}
                                value="grammar"
                              />
                            </Tabs>
                          </CardContent>
                        </Card>

                        <Card
                          elevation={0}
                          sx={{
                            border: "1px solid rgba(31,29,26,0.06)",
                            borderRadius: "18px",
                            boxShadow: "none",
                          }}
                        >
                          <CardContent sx={{ p: 2.25 }}>
                            {renderDetailContent(selectedLesson)}
                          </CardContent>
                        </Card>
                      </Stack>
                    </CardContent>
                  </Card>
                  <ButtonBase
                    onClick={() => setMobileTab(mobileBackTab)}
                    sx={{
                      alignSelf: "flex-start",
                      borderRadius: "999px",
                      color: "text.secondary",
                      px: 0.25,
                      py: 0.25,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: "0.01em",
                          lineHeight: 1.2,
                        }}
                      >
                        返回
                      </Typography>
                    </Stack>
                  </ButtonBase>
                </Stack>
              ) : (
                <Alert severity="info">先從教材列表選一篇文章。</Alert>
              )
            ) : null}

            {mobileTab === "review" ? (
              <Card elevation={0} sx={mobileCardSx}>
                <CardContent sx={{ p: 2.25 }}>
                  {renderReviewPanel(true)}
                </CardContent>
              </Card>
            ) : null}

            {mobileTab === "bookmarks" ? (
              <Card elevation={0} sx={mobileCardSx}>
                <CardContent sx={{ p: 2.25 }}>
                  <Stack spacing={2.25}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="h5">標記單字</Typography>
                      <Chip
                        label={`${bookmarkedVocabulary.length} 個`}
                        variant="outlined"
                      />
                    </Stack>
                    {renderBookmarkedVocabularyContent()}
                  </Stack>
                </CardContent>
              </Card>
            ) : null}

            {mobileTab === "wrongs" ? (
              <Stack spacing={2}>
                <Card elevation={0} sx={mobileCardSx}>
                  <CardContent sx={{ p: 2.25 }}>
                    <Stack spacing={2.25}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="h5">答錯的內容</Typography>
                        <Chip
                          label={`${wrongCards.length} 筆`}
                          variant="outlined"
                        />
                      </Stack>
                      {renderWrongCardsContent()}
                    </Stack>
                  </CardContent>
                </Card>
                <ButtonBase
                  onClick={() => setMobileTab(mobileBackTab)}
                  sx={{
                    alignSelf: "flex-start",
                    borderRadius: "999px",
                    color: "text.secondary",
                    px: 0.25,
                    py: 0.25,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: "0.01em",
                        lineHeight: 1.2,
                      }}
                    >
                      返回
                    </Typography>
                  </Stack>
                </ButtonBase>
              </Stack>
            ) : null}
          </Stack>

          <Card
            elevation={0}
            sx={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 20,
              borderRadius: "18px 18px 0 0",
              border: "1px solid rgba(31,29,26,0.08)",
              boxShadow: "0 -10px 24px rgba(34, 38, 43, 0.06)",
              backgroundColor: "rgba(255,255,255,0.98)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Tabs
              value={mobileTab === "detail" ? "library" : mobileTab}
              onChange={(_event, value) => {
                if (value === "bookmarks") {
                  void openBookmarksPage("mobile");
                  return;
                }

                if (value === "review") {
                  setReviewMode("all");
                  setReviewProgressCount(0);
                  void loadDashboard("all");
                  openMobileTab("review", mobileTab);
                  return;
                }

                openMobileTab(value, mobileTab);
              }}
              variant="fullWidth"
              sx={{
                minHeight: "calc(76px + env(safe-area-inset-bottom))",
                px: 0.75,
                pb: "calc(8px + env(safe-area-inset-bottom))",
                "& .MuiTab-root": {
                  minHeight: 68,
                  fontSize: 12,
                  borderRadius: "12px",
                  margin: "6px 3px 0",
                  minWidth: 0,
                },
                "& .MuiTab-root.Mui-selected": {
                  backgroundColor: "rgba(201, 181, 156, 0.10)",
                },
                "& .MuiTabs-indicator": {
                  display: "none",
                },
              }}
            >
              <Tab
                icon={<HomeRoundedIcon />}
                iconPosition="top"
                label="首頁"
                value="home"
              />
              <Tab
                icon={<MenuBookRoundedIcon />}
                iconPosition="top"
                label="教材"
                value="library"
              />
              <Tab
                icon={<BookmarkBorderRoundedIcon />}
                iconPosition="top"
                label="標記"
                value="bookmarks"
              />
              <Tab
                icon={<QuizRoundedIcon />}
                iconPosition="top"
                label="複習"
                value="review"
              />
              <Tab
                icon={<UploadFileRoundedIcon />}
                iconPosition="top"
                label="匯入"
                value="import"
              />
            </Tabs>
          </Card>
        </Box>

        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={3}
          alignItems="stretch"
          sx={{ display: { xs: "none", lg: "flex" } }}
        >
          <Card
            elevation={0}
            sx={{
              flex: "0 0 320px",
              border: "1px solid rgba(31,29,26,0.06)",
              borderRadius: "24px",
              boxShadow: "0 12px 30px rgba(34, 38, 43, 0.05)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6">文章列表</Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant={
                      activeTab === "bookmarks" ? "contained" : "outlined"
                    }
                    onClick={() => void openBookmarksPage("desktop")}
                  >
                    標記單字
                  </Button>
                  {lessons.length > 0 ? (
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={() =>
                        setDeleteTarget({ mode: "all", count: lessons.length })
                      }
                      disabled={deletingLesson}
                    >
                      全部刪除
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
              <Tabs
                value={lessonFilter}
                onChange={(_event, value) => setLessonFilter(value)}
                variant="fullWidth"
                sx={{ display: "none" }}
              >
                <Tab label="文章" value="文章" />
                <Tab label="歌詞" value="歌詞" />
              </Tabs>
              <Stack spacing={1.25} sx={{ mb: 2 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="搜尋單字／標題"
                  value={lessonSearchKeyword}
                  onChange={(event) => setLessonSearchKeyword(event.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />
                <Stack direction="row" spacing={1}>
                  <Select
                    size="small"
                    fullWidth
                    value={lessonDateFilter}
                    onChange={(event) => setLessonDateFilter(event.target.value as LessonDateFilter)}
                  >
                    <MenuItem value="all">全部日期</MenuItem>
                    <MenuItem value="today">本日</MenuItem>
                    <MenuItem value="7d">最近7日</MenuItem>
                    <MenuItem value="30d">最近30日</MenuItem>
                  </Select>
                  <Select
                    size="small"
                    fullWidth
                    value={lessonFilter}
                    onChange={(event) => setLessonFilter(event.target.value as LessonCategory)}
                  >
                    <MenuItem value="文章">文章</MenuItem>
                    <MenuItem value="歌詞">歌詞</MenuItem>
                  </Select>
                </Stack>
              </Stack>
              {hydrating ? (
                <CircularProgress size={24} />
              ) : filteredLessons.length === 0 ? (
                <Typography color="text.secondary">還沒有資料。</Typography>
              ) : (
                <List disablePadding>
                  {filteredLessons.map((lesson, index) => (
                    <Box key={lesson.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ListItemButton
                          selected={lesson.id === selectedLessonId}
                          onClick={() => void loadLesson(lesson.id)}
                          sx={{
                            borderRadius: "18px",
                            flex: 1,
                            minWidth: 0,
                            px: 1.5,
                            py: 1.25,
                            alignItems: "flex-start",
                            backgroundColor: "#ffffff",
                            border:
                              lesson.id === selectedLessonId
                                ? "1px solid rgba(201, 181, 156, 0.28)"
                                : "1px solid transparent",
                            boxShadow:
                              lesson.id === selectedLessonId
                                ? "0 4px 12px rgba(201, 181, 156, 0.12)"
                                : "none",
                          }}
                        >
                          <ListItemText
                            primary={lesson.title}
                            primaryTypographyProps={{
                              noWrap: true,
                              fontWeight:
                                lesson.id === selectedLessonId ? 700 : 600,
                            }}
                          />
                        </ListItemButton>
                        <IconButton
                          aria-label={`刪除 ${lesson.title}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget({
                              mode: "single",
                              id: lesson.id,
                              title: lesson.title,
                            });
                          }}
                          disabled={deletingLesson}
                          sx={{ color: "#C9B59C" }}
                        >
                          <DeleteOutlineRoundedIcon />
                        </IconButton>
                      </Stack>
                      {index < filteredLessons.length - 1 ? (
                        <Divider sx={{ my: 1 }} />
                      ) : null}
                    </Box>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          <Card
            elevation={0}
            sx={{
              flex: 1,
              border: "1px solid rgba(31,29,26,0.06)",
              borderRadius: "24px",
              boxShadow: "0 12px 30px rgba(34, 38, 43, 0.05)",
            }}
          >
            <CardContent sx={{ p: 3.5 }}>
              {activeTab === "bookmarks" ? (
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="h4">標記單字</Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      集中管理已標記的單字，可直接取消標記。
                    </Typography>
                  </Box>

                  <Card
                    elevation={0}
                    sx={{
                      border: "1px solid rgba(31,29,26,0.06)",
                      borderRadius: "20px",
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      {renderBookmarkedVocabularyContent()}
                    </CardContent>
                  </Card>
                </Stack>
              ) : activeTab === "wrongs" ? (
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="h4">答錯的內容</Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      集中查看之前答錯過的題目與正解。
                    </Typography>
                  </Box>

                  <Card
                    elevation={0}
                    sx={{
                      border: "1px solid rgba(31,29,26,0.06)",
                      borderRadius: "20px",
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      {renderWrongCardsContent()}
                    </CardContent>
                  </Card>
                </Stack>
              ) : loadingLesson ? (
                <CircularProgress size={24} />
              ) : selectedLesson ? (
                <Stack spacing={3}>
                  <Box>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="flex-start"
                      justifyContent="space-between"
                    >
                      <Typography
                        variant="h4"
                        sx={{ minWidth: 0, flex: 1, fontSize: 18 }}
                      >
                        {selectedLesson.title}
                      </Typography>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          size="small"
                          onClick={() => setIsEditingLesson((value) => !value)}
                          sx={{
                            color: "primary.main",
                            "&:hover": {
                              backgroundColor: "rgba(201, 181, 156, 0.12)",
                            },
                          }}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => void handleDeleteLesson()}
                          disabled={deletingLesson}
                          sx={{
                            color: "#C9B59C",
                            "&:hover": {
                              backgroundColor: "rgba(201, 181, 156, 0.18)",
                            },
                          }}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      閱讀時間：
                      {new Date(selectedLesson.createdAt).toLocaleString(
                        "zh-TW",
                      )}
                    </Typography>
                  </Box>

                  {isEditingLesson ? (
                    <Card
                      elevation={0}
                      sx={{
                        border: "1px solid rgba(31,29,26,0.06)",
                        borderRadius: "20px",
                      }}
                    >
                      <CardContent sx={{ pt: 0 }}>
                        <Stack spacing={2}>
                          <Stack
                            direction="row"
                            spacing={2}
                            sx={{ alignItems: "flex-start" }}
                          >
                            <TextField
                              fullWidth
                              size="small"
                              label="文章標題"
                              value={editingTitle}
                              onChange={(event) =>
                                setEditingTitle(event.target.value)
                              }
                            />
                            <Select
                              size="small"
                              value={editingCategory}
                              onChange={(event) =>
                                setEditingCategory(
                                  event.target.value as LessonCategory,
                                )
                              }
                              sx={{ minWidth: 96 }}
                            >
                              <MenuItem value="文章">文章</MenuItem>
                              <MenuItem value="歌詞">歌詞</MenuItem>
                            </Select>
                          </Stack>
                          <TextField
                            multiline
                            rows={12}
                            label="編輯文章原始內容"
                            value={editingLessonText}
                            onChange={(event) =>
                              setEditingLessonText(event.target.value)
                            }
                            sx={{
                              "& .MuiInputBase-inputMultiline": {
                                overflowY: "auto",
                                resize: "none",
                              },
                            }}
                          />
                          <Button
                            variant="contained"
                            startIcon={
                              savingLesson ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : (
                                <SaveRoundedIcon />
                              )
                            }
                            onClick={() => void handleUpdateLesson()}
                            disabled={savingLesson}
                            sx={{ alignSelf: "flex-start" }}
                          >
                            {savingLesson ? "儲存中" : "儲存變更"}
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  ) : null}

                  <Card
                    elevation={0}
                    sx={{
                      border: "1px solid rgba(31,29,26,0.06)",
                      borderRadius: "20px",
                    }}
                  >
                    <CardContent sx={{ p: 1.25 }}>
                      <Tabs
                        value={activeDetailTab}
                        onChange={(_event, value) => {
                          setActiveDetailTab(value);
                          if (value !== "vocabulary") {
                            setVocabularyViewMode("lesson");
                          }
                        }}
                        variant="fullWidth"
                      >
                        <Tab
                          label={renderCountTabLabel(
                            "句子",
                            selectedLesson.sentences.length,
                          )}
                          value="sentences"
                        />
                        <Tab
                          label={renderCountTabLabel(
                            vocabularyViewMode === "bookmarked"
                              ? "標記單字"
                              : "單字",
                            vocabularyViewMode === "bookmarked"
                              ? bookmarkedVocabulary.length
                              : selectedLesson.vocabulary.length,
                          )}
                          value="vocabulary"
                        />
                        <Tab
                          label={renderCountTabLabel(
                            "文法",
                            selectedLesson.grammar.length,
                          )}
                          value="grammar"
                        />
                      </Tabs>
                    </CardContent>
                  </Card>

                  <Card
                    elevation={0}
                    sx={{
                      border: "1px solid rgba(31,29,26,0.06)",
                      borderRadius: "20px",
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      {renderDetailContent(selectedLesson)}
                    </CardContent>
                  </Card>
                </Stack>
              ) : (
                <Alert severity="info">
                  先從左邊選一篇文章，才能看句子、單字與文法。
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card
            elevation={0}
            sx={{
              flex: "0 0 380px",
              border: "1px solid rgba(31,29,26,0.06)",
              borderRadius: "24px",
              boxShadow: "0 12px 30px rgba(34, 38, 43, 0.05)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                {hydrating ? (
                  <CircularProgress size={24} />
                ) : currentCard ? (
                  <Stack spacing={2}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1.25}
                    >
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ minWidth: 0, flex: 1 }}>
                        <Chip
                          label={
                            currentCard.kind === "sentence"
                              ? "句子題"
                              : currentCard.kind === "vocabulary"
                                ? "單字題"
                                : "文法題"
                          }
                          color="secondary"
                        />
                        <Chip
                          label={currentCard.lessonTitle}
                          variant="outlined"
                          clickable
                          onClick={() => void openReviewCardSource(currentCard)}
                        />
                      </Stack>
                      <Typography
                        color="text.secondary"
                        sx={{ fontSize: 16, fontWeight: 700, whiteSpace: "nowrap", lineHeight: 1.2 }}
                      >
                        {reviewCurrentCount}/{reviewTotalCount}
                      </Typography>
                    </Stack>

                    <Typography variant="h6">{currentCard.prompt}</Typography>
                    {currentCard.hint ? (
                      <Typography color="text.secondary">
                        {currentCard.hint}
                      </Typography>
                    ) : null}

                    <Stack spacing={1.5}>
                      {currentCard.choices.map((choice) => {
                        const chosen = selectedChoice === choice;
                        const color =
                          answered && choice === currentCard.answer
                            ? "success"
                            : answered &&
                                chosen &&
                                choice !== currentCard.answer
                              ? "error"
                              : "inherit";

                        return (
                          <Button
                            key={choice}
                            variant="outlined"
                            color={color === "inherit" ? "primary" : color}
                            onClick={() => handleChoice(choice)}
                            disabled={answered}
                            sx={{
                              justifyContent: "flex-start",
                              textAlign: "left",
                              alignItems: "flex-start",
                              color:
                                answered && choice === currentCard.answer
                                  ? "success.main"
                                  : answered &&
                                        chosen &&
                                        choice !== currentCard.answer
                                    ? "error.main"
                                    : "#8E775E",
                              backgroundColor:
                                answered && choice === currentCard.answer
                                  ? "rgba(201, 181, 156, 0.12)"
                                  : answered &&
                                      chosen &&
                                      choice !== currentCard.answer
                                    ? "rgba(211, 47, 47, 0.08)"
                                    : chosen
                                      ? "rgba(201, 181, 156, 0.08)"
                                      : "#ffffff",
                              borderColor:
                                answered && choice === currentCard.answer
                                  ? "success.main"
                                  : answered &&
                                      chosen &&
                                      choice !== currentCard.answer
                                    ? "error.main"
                                    : chosen
                                      ? "#8E775E"
                                      : "rgba(142, 119, 94, 0.45)",
                              "&:hover": {
                                borderColor: "#8E775E",
                                backgroundColor:
                                  answered && choice === currentCard.answer
                                    ? "rgba(201, 181, 156, 0.12)"
                                    : answered &&
                                          chosen &&
                                          choice !== currentCard.answer
                                      ? "rgba(211, 47, 47, 0.08)"
                                      : "rgba(201, 181, 156, 0.08)",
                              },
                            }}
                          >
                            {choice}
                          </Button>
                        );
                      })}
                    </Stack>

                    {answered ? (
                      <Alert severity={isCorrect ? "success" : "warning"}>
                        {isCorrect
                          ? "答對了。"
                          : `答錯了，正解是：${currentCard.answer}`}
                      </Alert>
                    ) : null}

                    <Button
                      variant="contained"
                      onClick={() => void handleReview()}
                      disabled={!answered || reviewing}
                      startIcon={
                        reviewing ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <AutoStoriesRoundedIcon />
                        )
                      }
                      sx={reviewActionButtonSx}
                    >
                      {reviewing ? "更新中" : "下一題"}
                    </Button>

                    {currentCard.kind === "vocabulary" ? (
                      <Stack>
                        <Button
                          variant="contained"
                          onClick={() =>
                            void handleMasterVocabulary(currentCard)
                          }
                          disabled={reviewing}
                          startIcon={<DoneRoundedIcon />}
                          sx={reviewActionButtonSx}
                        >
                          我學會了
                        </Button>
                      </Stack>
                    ) : null}
                  </Stack>
                ) : (
                  <Alert severity="info">
                    先匯入至少一個有中文意思的單字，這裡就會開始隨機出題。
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Stack>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {deleteTarget?.mode === "all" ? "全部刪除" : "刪除文章"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteTarget?.mode === "single"
              ? `確定要刪除《${deleteTarget.title}》嗎？`
              : deleteTarget?.mode === "all"
                ? `確定要刪除全部 ${deleteTarget.count} 篇文章嗎？`
                : ""}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ width: "100%", gap: 1, px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deletingLesson}
            fullWidth
          >
            取消
          </Button>
          <Button
            color="error"
            onClick={() =>
              deleteTarget?.mode === "single"
                ? void handleDeleteLessonById(
                    deleteTarget.id,
                    deleteTarget.title,
                  )
                : deleteTarget?.mode === "all"
                  ? void handleDeleteAllLessons()
                  : undefined
            }
            disabled={deletingLesson}
            fullWidth
          >
            {deletingLesson ? "刪除中" : "刪除"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={4200}
        onClose={handleCloseErrorSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ mt: "calc(env(safe-area-inset-top) + 8px)" }}
      >
        <Alert
          onClose={handleCloseErrorSnackbar}
          severity="error"
          variant="standard"
          sx={{
            width: "100%",
            minWidth: { xs: "calc(100vw - 24px)", sm: 420 },
            backgroundColor: "#F8EFDF",
            border: "1px solid #E4D5BC",
            color: "#5D5240",
            boxShadow: "0 10px 22px rgba(34, 38, 43, 0.10)",
            "& .MuiAlert-icon": {
              color: "#C9B59C",
            },
          }}
        >
          {error}
        </Alert>
      </Snackbar>
      <Snackbar
        open={Boolean(success)}
        autoHideDuration={3600}
        onClose={handleCloseSuccessSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ mt: "calc(env(safe-area-inset-top) + 8px)" }}
      >
        <Alert
          onClose={handleCloseSuccessSnackbar}
          severity="success"
          variant="standard"
          sx={{
            width: "100%",
            minWidth: { xs: "calc(100vw - 24px)", sm: 420 },
            backgroundColor: "#D9CFC7",
            border: "1px solid #D6CBC1",
            color: "#5B5045",
            boxShadow: "0 10px 22px rgba(34, 38, 43, 0.10)",
            "& .MuiAlert-icon": {
              color: "#B7A288",
            },
          }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
}
