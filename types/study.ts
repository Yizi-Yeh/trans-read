export type LessonCategory = "文章" | "歌詞";

export type ImportedLesson = {
  id: number;
  title: string;
  category: LessonCategory;
  createdAt: string;
  sentenceCount: number;
  vocabularyCount: number;
  grammarCount: number;
  vocabularyPreview: string[];
  grammarPreview: string[];
};

export type SentenceRecord = {
  id: number;
  lessonId: number;
  sectionTitle: string;
  original: string;
  translationZh: string;
  nextReviewAt: string;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
};

export type VocabularyRecord = {
  id: number;
  lessonId: number;
  sectionTitle: string;
  word: string;
  reading: string;
  bookmarked: boolean;
  mastered: boolean;
  meaningZh: string;
  exampleSentence: string;
  exampleTranslation: string;
  nextReviewAt: string;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
};

export type GrammarRecord = {
  id: number;
  lessonId: number;
  sectionTitle: string;
  pattern: string;
  meaningZh: string;
  explanation: string;
  exampleSentence: string;
  exampleTranslation: string;
  nextReviewAt: string;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
};

export type LessonDetail = {
  id: number;
  title: string;
  category: LessonCategory;
  sourceText: string;
  createdAt: string;
  sentences: SentenceRecord[];
  vocabulary: VocabularyRecord[];
  grammar: GrammarRecord[];
};

export type ReviewCard = {
  id: number;
  kind: "sentence" | "vocabulary" | "grammar";
  lessonId: number;
  lessonTitle: string;
  sectionTitle: string;
  prompt: string;
  answer: string;
  hint?: string;
  choices: string[];
  nextReviewAt: string;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  reviewStage: number;
};
