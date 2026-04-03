type ParsedSentence = {
  sectionTitle: string;
  original: string;
  translationZh: string;
};

type ParsedVocabulary = {
  sectionTitle: string;
  word: string;
  reading: string;
  meaningZh: string;
  exampleSentence: string;
  exampleTranslation: string;
};

type ParsedGrammar = {
  sectionTitle: string;
  pattern: string;
  meaningZh: string;
  explanation: string;
  exampleSentence: string;
  exampleTranslation: string;
};

export type ParsedLesson = {
  title: string;
  sourceText: string;
  sentences: ParsedSentence[];
  vocabulary: ParsedVocabulary[];
  grammar: ParsedGrammar[];
};

function cleanLine(line: string) {
  return line
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\*\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ");
}

function normalizeTitle(line: string) {
  return line
    .replace(/^標題：\s*/, "")
    .replace(/^原文：\s*/, "")
    .replace(/^原句：\s*/, "")
    .replace(/^中文翻譯：\s*/, "")
    .replace(/^中文：\s*/, "")
    .trim();
}

function normalizeSentenceLine(line: string) {
  return line.replace(/^\d+\.\s*/, "").trim();
}

function looksLikeSentencePair(line: string, nextLine: string) {
  if (!line || !nextLine) {
    return false;
  }

  if (!/^(\d+\.\s*)?.+/.test(line)) {
    return false;
  }

  return nextLine.startsWith("翻譯：") || nextLine.startsWith("中文：");
}

function looksLikeJapaneseSourceLine(line: string) {
  if (!line) {
    return false;
  }

  if (
    isBoilerplateLine(line) ||
    isSectionBreakLine(line) ||
    isUsageSceneLabel(line) ||
    isSentenceHeader(line) ||
    isVocabularyHeader(line) ||
    isGrammarHeader(line) ||
    line.startsWith("例句：") ||
    line.startsWith("翻譯：") ||
    line.startsWith("中文：") ||
    line.startsWith("原文：") ||
    line.startsWith("書中句子：") ||
    line.startsWith("中文翻譯：")
  ) {
    return false;
  }

  return /[ぁ-んァ-ン]/.test(line);
}

function looksLikeChineseTranslationLine(line: string) {
  if (!line) {
    return false;
  }

  if (
    isBoilerplateLine(line) ||
    isSectionBreakLine(line) ||
    isUsageSceneLabel(line) ||
    isSentenceHeader(line) ||
    isVocabularyHeader(line) ||
    isGrammarHeader(line) ||
    line.startsWith("例句：") ||
    line.startsWith("翻譯：") ||
    line.startsWith("中文：") ||
    line.startsWith("原文：") ||
    line.startsWith("書中句子：") ||
    line.startsWith("中文翻譯：")
  ) {
    return false;
  }

  return /[一-龥]/.test(line) && !/[ぁ-んァ-ン]/.test(line);
}

function isSentenceHeader(line: string) {
  return (
    line === "逐句對照與翻譯" ||
    line === "逐句中日翻譯" ||
    line === "逐句翻譯" ||
    line === "逐句解析" ||
    line.startsWith("逐句中日翻譯（") ||
    line.startsWith("逐句翻譯（")
  );
}

function isVocabularyHeader(line: string) {
  return (
    line === "單字解析" ||
    line === "單字解析：" ||
    line === "關鍵單字與用法" ||
    line === "重點單字解析" ||
    line === "重點單字與文法" ||
    line === "重點單字與文法解析" ||
    line.startsWith("重點單字解析（")
  );
}

function isGrammarHeader(line: string) {
  return (
    line === "文法解析" ||
    line === "文法解析：" ||
    line === "核心文法解析" ||
    line === "重點文法說明" ||
    line === "重點單字與文法" ||
    line === "重點單字與文法解析" ||
    line === "核心文法與句型" ||
    line.startsWith("關鍵文法說明") ||
    line.startsWith("核心文法與句型（")
  );
}

function isSectionTitle(line: string) {
  return /^文章\s*[A-ZＡ-Ｚ]/.test(line);
}

function extractPairValue(line: string, label: "原文" | "中文") {
  const match = line.match(new RegExp(`^${label}：\\s*(.+)$`));
  return match?.[1]?.trim() ?? "";
}

function extractPairValueFromLabels(line: string, labels: string[]) {
  for (const label of labels) {
    const match = line.match(new RegExp(`^${label}：\\s*(.+)$`));
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  return "";
}

function extractTranslationValue(line: string) {
  const match = line.match(/^翻譯：\s*(.+)$/);
  return match?.[1]?.trim() ?? "";
}

function extractLabeledValue(
  line: string,
  label: "翻譯" | "中文" | "例句" | "意義" | "意思" | "定義" | "重點單字" | "語法解析" | "使用場景"
) {
  const match = line.match(new RegExp(`^${label}：\\s*(.+)$`));
  return match?.[1]?.trim() ?? "";
}

function looksLikeGrammarPattern(line: string) {
  return /^～/.test(line) || /\(文法\)/.test(line) || /^\d+\.\s*文法：/.test(line);
}

function isIgnorableVocabularyWord(word: string) {
  const normalized = word.trim();

  if (!normalized) {
    return true;
  }

  if (/^本句無/.test(normalized) || /^無特別/.test(normalized)) {
    return true;
  }

  if (/重點單字/.test(normalized) && /補充/.test(normalized)) {
    return true;
  }

  return false;
}

function isIgnorableGrammarPattern(pattern: string) {
  const normalized = pattern.trim();

  if (!normalized) {
    return true;
  }

  if (/^本句無/.test(normalized) || /^無特別/.test(normalized)) {
    return true;
  }

  if (/省略/.test(normalized)) {
    return true;
  }

  if (/^[.…。\s（）()]+$/.test(normalized)) {
    return true;
  }

  return false;
}

function isStructuredGrammarSubField(line: string) {
  return /^(接續|意思|語氣／用法說明|用法說明|語氣|例句|日文|中文)：/.test(line.replace(/^-+\s*/, ""));
}

function isStructuredVocabularySubField(line: string) {
  return /^(假名|詞性|中文意思|單字例句|單字例句中文)：/.test(line.replace(/^-+\s*/, ""));
}

function isStrictFormatSectionLabel(line: string) {
  const normalized = line.replace(/^-+\s*/, "");
  return (
    normalized === "單字解析：" ||
    normalized === "文法解析：" ||
    normalized === "例句：" ||
    normalized === "常用使用場景：" ||
    normalized === "單字解析" ||
    normalized === "文法解析" ||
    normalized === "例句" ||
    normalized === "常用使用場景"
  );
}

function isStrictFormatStructureLine(line: string) {
  return (
    line === "無" ||
    isStrictFormatSectionLabel(line) ||
    isStructuredVocabularySubField(line) ||
    isStructuredGrammarSubField(line)
  );
}

function parseInlineVocabulary(line: string) {
  const match = line.match(/^(重點單字|單字)：\s*(.+?)(?:[（(](.+?)[）)])?：\s*(.+)$/);
  if (!match) {
    return null;
  }

  return {
    word: match[2].trim(),
    reading: match[3]?.trim() ?? "",
    meaningZh: match[4].trim()
  };
}

function parseInlineGrammar(line: string) {
  const raw =
    extractLabeledValue(line, "語法解析") ||
    line.match(/^文法：\s*(.+)$/)?.[1]?.trim() ||
    "";
  if (!raw) {
    return null;
  }

  const quotedMatch = raw.match(/[「『](.+?)[」』](.+)$/);
  if (quotedMatch) {
    return {
      pattern: quotedMatch[1].trim(),
      meaningZh: quotedMatch[2].replace(/^表示/, "").trim()
    };
  }

  const colonMatch = raw.match(/^(.+?)：\s*(.+)$/);
  if (colonMatch) {
    return {
      pattern: colonMatch[1].trim(),
      meaningZh: colonMatch[2].trim()
    };
  }

  return {
    pattern: raw,
    meaningZh: raw
  };
}

function isBoilerplateLine(line: string) {
  return (
    line === "---" ||
    line === "日文翻譯" ||
    line === "自訂 Gem" ||
    line === "日文翻譯說" ||
    line.startsWith("以下為您整理") ||
    line.startsWith("以下為您進行逐句") ||
    line.startsWith("以下為您逐句翻譯") ||
    line.startsWith("以下為您進行逐句中日翻譯") ||
    line.startsWith("這張圖片") ||
    line.startsWith("這篇貼文") ||
    line.startsWith("這頁訪談") ||
    line.startsWith("這兩頁的內容") ||
    line.startsWith("這段文字來自於") ||
    line.startsWith("需要我") ||
    line.startsWith("看到這裡") ||
    line.startsWith("這部分的訪談") ||
    line.startsWith("這段訪談非常") ||
    line.startsWith("這幾頁訪談") ||
    line.startsWith("希望這些解析") ||
    line.startsWith("我想問的是")
  );
}

function isTitleLine(line: string) {
  return /^標題：/.test(line);
}

function isSentenceIndexLine(line: string) {
  return /^第[一二三四五六七八九十\d]+句$/.test(line);
}

function isSectionBreakLine(line: string) {
  return /^第[一二三四五六七八九十\d]+段：/.test(line) || /^📋/.test(line);
}

function extractWordAndReading(line: string) {
  const match = line.match(/^(.+?)(?:[（(](.+?)[）)])?$/);
  if (!match) {
    return null;
  }

  return {
    word: match[1].trim(),
    reading: match[2]?.trim() ?? ""
  };
}

function isUsageSceneLabel(line: string) {
  return line === "使用場景" || line.startsWith("使用場景：");
}

function looksLikePlainMeaningLine(line: string) {
  if (!line) {
    return false;
  }

  if (
    line.startsWith("例句：") ||
    line.startsWith("中文翻譯：") ||
    line.startsWith("書中句子：") ||
    line.startsWith("翻譯：") ||
    line.startsWith("原文：") ||
    line.startsWith("中文：") ||
    isUsageSceneLabel(line)
  ) {
    return false;
  }

  return /[一-龥]/.test(line);
}

function extractQuotedOrPlainValue(line: string, label: "書中句子" | "中文翻譯") {
  const raw = line.match(new RegExp(`^${label}：\\s*(.+)$`))?.[1]?.trim() ?? "";
  if (!raw) {
    return "";
  }

  const quoted = raw.match(/[「『](.+?)[」』]/);
  if (quoted) {
    return quoted[1].trim();
  }

  return raw;
}

export function parseStudyText(sourceText: string): ParsedLesson {
  const lines = sourceText
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const firstUsefulLine =
    lines.find((line) => !isBoilerplateLine(line) && !isSectionBreakLine(line)) ?? lines[0] ?? "未命名文章";

  const title =
    extractPairValueFromLabels(lines.find((line) => isTitleLine(line)) ?? "", ["標題"]) ||
    lines.find((line) => /^這是一份關於/.test(line))?.replace(/^這是一份關於/, "").replace(/的閱讀測驗文章.*/, "") ||
    lines.find((line) => isSectionTitle(line)) ||
    normalizeTitle(firstUsefulLine);

  const sentences: ParsedSentence[] = [];
  const vocabulary: ParsedVocabulary[] = [];
  const grammar: ParsedGrammar[] = [];

  let currentSection = "未分類";
  let mode: "idle" | "sentences" | "vocabulary" | "grammar" | "mixed" = "idle";

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (isBoilerplateLine(line)) {
      continue;
    }

    if (isTitleLine(line)) {
      continue;
    }

    if (isUsageSceneLabel(line)) {
      continue;
    }

    if (isSentenceIndexLine(line)) {
      mode = "sentences";
      continue;
    }

    if (isSectionBreakLine(line)) {
      currentSection = line.replace(/^📋\s*/, "").trim();
      continue;
    }

    const vocabSentenceLine = lines[index + 1] ?? "";
    const vocabTranslationLine = lines[index + 2] ?? "";
    if (line && vocabSentenceLine.startsWith("書中句子：") && vocabTranslationLine.startsWith("中文翻譯：")) {
      const wordLine = extractWordAndReading(line);

      if (wordLine) {
        vocabulary.push({
          sectionTitle: currentSection,
          word: wordLine.word,
          reading: wordLine.reading,
          meaningZh: "",
          exampleSentence: extractQuotedOrPlainValue(vocabSentenceLine, "書中句子"),
          exampleTranslation: extractQuotedOrPlainValue(vocabTranslationLine, "中文翻譯")
        });
        index += 2;
        continue;
      }
    }

    const inlineVocabulary = parseInlineVocabulary(line);
    if (inlineVocabulary) {
      const exampleLine = lines[index + 1]?.startsWith("例句：") ? lines[index + 1] : "";
      const exampleMatch = exampleLine.match(/^例句：\s*(.+?)[。.]?（(.+?)）$/);

      vocabulary.push({
        sectionTitle: currentSection,
        word: inlineVocabulary.word,
        reading: inlineVocabulary.reading,
        meaningZh: inlineVocabulary.meaningZh,
        exampleSentence: exampleMatch?.[1]?.trim() ?? "",
        exampleTranslation: exampleMatch?.[2]?.trim() ?? ""
      });

      if (exampleLine) {
        index += 1;
      }

      continue;
    }

    const inlineGrammar = parseInlineGrammar(line);
    if (inlineGrammar) {
      const exampleLine = lines[index + 1]?.startsWith("例句：") ? lines[index + 1] : "";
      const exampleMatch = exampleLine.match(/^例句：\s*(.+?)[。.]?（(.+?)）$/);

      grammar.push({
        sectionTitle: currentSection,
        pattern: inlineGrammar.pattern,
        meaningZh: inlineGrammar.meaningZh,
        explanation: "",
        exampleSentence: exampleMatch?.[1]?.trim() ?? "",
        exampleTranslation: exampleMatch?.[2]?.trim() ?? ""
      });

      if (exampleLine) {
        index += 1;
      }

      continue;
    }

    if ((mode === "vocabulary" || mode === "mixed") && /^-?\s*日文：/.test(line)) {
      const word = extractPairValueFromLabels(line.replace(/^-+\s*/, ""), ["日文"]);
      const reading = extractPairValueFromLabels(lines[index + 1] ?? "", ["假名"]);
      const meaningZh = extractPairValueFromLabels(lines[index + 3] ?? "", ["中文意思"]);
      const exampleSentence = extractPairValueFromLabels(lines[index + 4] ?? "", ["單字例句"]);
      const exampleTranslation = extractPairValueFromLabels(lines[index + 5] ?? "", ["單字例句中文"]);

      if (word && meaningZh) {
        if (!isIgnorableVocabularyWord(word)) {
          vocabulary.push({
            sectionTitle: currentSection,
            word,
            reading,
            meaningZh,
            exampleSentence,
            exampleTranslation
          });
        }

        if (exampleSentence || exampleTranslation) {
          index += 5;
        } else {
          index += 3;
        }
        continue;
      }
    }

    if (isSectionTitle(line)) {
      currentSection = line;
      mode = "idle";
      continue;
    }

    if (isSentenceHeader(line)) {
      mode = "sentences";
      continue;
    }

    if (line === "重點單字與文法" || line === "重點單字與文法解析") {
      mode = "mixed";
      continue;
    }

    if (isVocabularyHeader(line)) {
      mode = "vocabulary";
      continue;
    }

    if (isGrammarHeader(line)) {
      mode = "grammar";
      continue;
    }

    if (/^常用使用場景|^希望這份詳細的解析|^接下來，您是否需要/.test(line)) {
      mode = "idle";
      continue;
    }

    if (!isStrictFormatStructureLine(line) && !isStrictFormatStructureLine(lines[index + 1] ?? "") && looksLikeSentencePair(line, lines[index + 1] ?? "")) {
      const translation =
        extractTranslationValue(lines[index + 1] ?? "") ||
        extractLabeledValue(lines[index + 1] ?? "", "翻譯") ||
        extractPairValue(lines[index + 1] ?? "", "中文");

      if (translation) {
        sentences.push({
          sectionTitle: currentSection,
          original: normalizeTitle(normalizeSentenceLine(line)),
          translationZh: translation
        });
        index += 1;
        continue;
      }
    }

    const labeledOriginal = isStrictFormatStructureLine(line) ? "" : extractPairValueFromLabels(line, ["原句", "原文"]);
    const labeledTranslation = isStrictFormatStructureLine(lines[index + 1] ?? "")
      ? ""
      : extractPairValueFromLabels(lines[index + 1] ?? "", ["中文翻譯", "中文", "翻譯"]);
    if (labeledOriginal && labeledTranslation) {
      sentences.push({
        sectionTitle: currentSection,
        original: labeledOriginal,
        translationZh: labeledTranslation
      });
      index += 1;
      continue;
    }

    if (
      !isStrictFormatStructureLine(line) &&
      !isStrictFormatStructureLine(lines[index + 1] ?? "") &&
      looksLikeJapaneseSourceLine(line) &&
      looksLikeChineseTranslationLine(lines[index + 1] ?? "")
    ) {
      sentences.push({
        sectionTitle: currentSection,
        original: normalizeSentenceLine(line),
        translationZh: lines[index + 1].trim()
      });
      index += 1;
      continue;
    }

    if (mode === "sentences") {
      if (
        line === "無" ||
        isStrictFormatSectionLabel(line) ||
        isStructuredVocabularySubField(line) ||
        isStructuredGrammarSubField(line)
      ) {
        continue;
      }

      const normalizedOriginal = normalizeSentenceLine(line);
      const original = extractPairValue(line, "原文");
      const translation = extractPairValue(lines[index + 1] ?? "", "中文");
      const translatedLine =
        extractTranslationValue(lines[index + 1] ?? "") ||
        extractLabeledValue(lines[index + 1] ?? "", "翻譯");

      if (original && translation) {
        sentences.push({
          sectionTitle: currentSection,
          original,
          translationZh: translation
        });
        index += 1;
        continue;
      }

      if (line && translatedLine) {
        sentences.push({
          sectionTitle: currentSection,
          original: normalizeTitle(normalizedOriginal),
          translationZh: translatedLine
        });
        index += 1;
        continue;
      }

      const nextLine = lines[index + 1];
      if (
        line &&
        nextLine &&
        !isSectionBreakLine(line) &&
        !line.startsWith("中文：") &&
        !nextLine.startsWith("原文：") &&
        !nextLine.startsWith("翻譯：")
      ) {
        sentences.push({
          sectionTitle: currentSection,
          original: normalizeTitle(normalizedOriginal),
          translationZh: normalizeTitle(nextLine)
        });
        index += 1;
      }

      continue;
    }

    if (mode === "vocabulary" || mode === "mixed") {
      if (
        line === "無" ||
        isStrictFormatSectionLabel(line) ||
        isStructuredVocabularySubField(line) ||
        isStructuredGrammarSubField(line)
      ) {
        continue;
      }

      if (/^\d+\.\s*單字：/.test(line)) {
        const normalizedLine = line.replace(/^\d+\.\s*單字：\s*/, "");
        const wordLine = extractWordAndReading(normalizedLine);
        const meaningLine =
          lines[index + 1]?.startsWith("意思：") ||
          lines[index + 1]?.startsWith("定義：") ||
          lines[index + 1]?.startsWith("意義：") ||
          lines[index + 1]?.startsWith("重點單字：")
            ? lines[index + 1]
            : "";
        const exampleLine =
          lines[index + 2]?.startsWith("例句：")
            ? lines[index + 2]
            : lines[index + 3]?.startsWith("例句：")
              ? lines[index + 3]
              : "";
        const exampleMatch = exampleLine.match(/^例句：\s*(.+?)[。.]?（(.+?)）$/);

        if (wordLine && meaningLine) {
          if (!isIgnorableVocabularyWord(wordLine.word)) {
            vocabulary.push({
              sectionTitle: currentSection,
              word: wordLine.word,
              reading: wordLine.reading,
              meaningZh: meaningLine.replace(/^(意思|定義|意義|重點單字)：\s*/, "").trim(),
              exampleSentence: exampleMatch?.[1]?.trim() ?? "",
              exampleTranslation: exampleMatch?.[2]?.trim() ?? ""
            });
          }

          if (exampleLine === lines[index + 3]) {
            index += 3;
          } else if (exampleLine) {
            index += 2;
          } else {
            index += 1;
          }
        }

        continue;
      }

      if (looksLikeGrammarPattern(line) || /^\d+\.\s*～/.test(line)) {
        if (mode === "mixed") {
          const patternLine = line
            .replace(/^\d+\.\s*文法：\s*/, "")
            .replace(/\s*\(文法\)\s*$/, "")
            .trim();
          const meaningLine =
            lines[index + 1]?.startsWith("意思：") ||
            lines[index + 1]?.startsWith("定義：") ||
            lines[index + 1]?.startsWith("用法：") ||
            lines[index + 1]?.startsWith("意義：")
              ? lines[index + 1]
              : "";
          const explanationLine =
            lines[index + 2]?.startsWith("解析：") || lines[index + 2]?.startsWith("應用場景：")
              ? lines[index + 2]
              : "";
          const exampleLine =
            lines[index + 2]?.startsWith("例句：")
              ? lines[index + 2]
              : lines[index + 3]?.startsWith("例句：") || lines[index + 3]?.startsWith("文中例句：")
                ? lines[index + 3]
                : "";
          const exampleMatch = exampleLine.match(/^(例句|文中例句)：\s*(.+?)[。.]?（(.+?)）$/);

          grammar.push({
            sectionTitle: currentSection,
            pattern: patternLine,
            meaningZh: meaningLine.replace(/^(意思|定義|用法|意義)：\s*/, "").trim(),
            explanation: explanationLine.replace(/^(解析|應用場景)：\s*/, "").trim(),
            exampleSentence: exampleMatch?.[2]?.trim() ?? "",
            exampleTranslation: exampleMatch?.[3]?.trim() ?? ""
          });

          if (exampleLine === lines[index + 3]) {
            index += 3;
          } else if (exampleLine || explanationLine) {
            index += 2;
          } else if (meaningLine) {
            index += 1;
          }

          continue;
        }

        mode = "grammar";
        index -= 1;
        continue;
      }

      const match = line.match(/^(.+?)(?:（(.+?)）)?：\s*(.+)$/);
      if (!match || /^例句：/.test(line)) {
        const wordLine = extractWordAndReading(line);
        const meaningLine =
          lines[index + 1]?.startsWith("意思：") ||
          lines[index + 1]?.startsWith("定義：") ||
          looksLikePlainMeaningLine(lines[index + 1] ?? "")
            ? lines[index + 1]
            : "";
        const exampleLine =
          lines[index + 2]?.startsWith("例句：")
            ? lines[index + 2]
            : lines[index + 3]?.startsWith("例句：")
              ? lines[index + 3]
              : lines[index + 4]?.startsWith("例句：")
                ? lines[index + 4]
              : "";
        const exampleMatch = exampleLine.match(/^例句：\s*(.+?)[。.]?（(.+?)）$/);

        if (wordLine && meaningLine) {
          if (!isIgnorableVocabularyWord(wordLine.word)) {
            vocabulary.push({
              sectionTitle: currentSection,
              word: wordLine.word,
              reading: wordLine.reading,
              meaningZh: meaningLine.replace(/^(意思|定義)：\s*/, "").trim(),
              exampleSentence: exampleMatch?.[1]?.trim() ?? "",
              exampleTranslation: exampleMatch?.[2]?.trim() ?? ""
            });
          }

          if (exampleLine === lines[index + 4]) {
            index += 4;
          } else if (exampleLine === lines[index + 3]) {
            index += 3;
          } else if (exampleLine) {
            index += 2;
          } else {
            index += 1;
          }
        }

        continue;
      }

      const exampleLine = lines[index + 1]?.startsWith("例句：") ? lines[index + 1] : "";
      const exampleMatch = exampleLine.match(/^例句：(.+?)[。.]?（(.+?)）$/);

      if (!isIgnorableVocabularyWord(match[1].trim())) {
        vocabulary.push({
          sectionTitle: currentSection,
          word: match[1].trim(),
          reading: match[2]?.trim() ?? "",
          meaningZh: match[3].trim(),
          exampleSentence: exampleMatch?.[1]?.trim() ?? "",
          exampleTranslation: exampleMatch?.[2]?.trim() ?? ""
        });
      }

      if (exampleLine) {
        index += 1;
      }

      continue;
    }

    if (mode === "grammar") {
      if (line === "重點文法說明") {
        continue;
      }

      if (line === "無" || isStructuredVocabularySubField(line)) {
        continue;
      }

      if (/^-?\s*文法：/.test(line)) {
        const pattern = extractPairValueFromLabels(line.replace(/^-+\s*/, ""), ["文法"]);
        const connection = extractPairValueFromLabels(lines[index + 1] ?? "", ["接續"]);
        const meaningZh = extractPairValueFromLabels(lines[index + 2] ?? "", ["意思"]);
        const usage = extractPairValueFromLabels(lines[index + 3] ?? "", ["語氣／用法說明", "用法說明", "語氣"]);

        let exampleSentence = "";
        let exampleTranslation = "";
        let consumedUntil = index + 3;

        for (let offset = 4; offset <= 10; offset += 1) {
          const currentLine = lines[index + offset] ?? "";
          const nextLine = lines[index + offset + 1] ?? "";
          const normalizedCurrentLine = currentLine.replace(/^-+\s*/, "");
          const normalizedNextLine = nextLine.replace(/^-+\s*/, "");

          if (/^例句：/.test(normalizedCurrentLine)) {
            consumedUntil = index + offset;
            continue;
          }

          if (/^日文：/.test(normalizedCurrentLine) && /^中文：/.test(normalizedNextLine)) {
            exampleSentence = extractPairValueFromLabels(normalizedCurrentLine, ["日文"]);
            exampleTranslation = extractPairValueFromLabels(normalizedNextLine, ["中文"]);
            consumedUntil = index + offset + 1;
            break;
          }

          if (
            isSentenceIndexLine(currentLine) ||
            isTitleLine(currentLine) ||
            isVocabularyHeader(currentLine) ||
            isGrammarHeader(currentLine) ||
            isUsageSceneLabel(currentLine) ||
            /^第[一二三四五六七八九十\d]+句$/.test(currentLine)
          ) {
            break;
          }
        }

        if (pattern && !isIgnorableGrammarPattern(pattern)) {
          grammar.push({
            sectionTitle: currentSection,
            pattern,
            meaningZh,
            explanation: [connection, usage].filter(Boolean).join(" "),
            exampleSentence,
            exampleTranslation
          });

          index = consumedUntil;
          continue;
        }
      }

      if (/^\d+\.\s*/.test(line)) {
        const patternLine = line.replace(/^\d+\.\s*/, "");
        const meaningLine = lines[index + 1];
        const usageLine = lines[index + 2];
        const structureLine = lines[index + 3];
        const articleLine = lines[index + 4];
        const exampleLine = lines[index + 5];
        const exampleMatch = exampleLine?.match(/^例句：\s*(.+?)[。.]?（(.+?)）$/);

        if (!isIgnorableGrammarPattern(patternLine)) {
          grammar.push({
            sectionTitle: currentSection,
            pattern: patternLine,
            meaningZh: meaningLine?.replace(/^(用法|意思|定義)：\s*/, "").trim() ?? "",
            explanation: [usageLine, structureLine, articleLine]
              .filter(Boolean)
              .join(" ")
              .replace(/^(用法|結構|文章應用|解析)：\s*/, "")
              .trim(),
            exampleSentence: exampleMatch?.[1]?.trim() ?? "",
            exampleTranslation: exampleMatch?.[2]?.trim() ?? ""
          });
        }

        if (exampleLine?.startsWith("例句：")) {
          index += 5;
        }

        continue;
      }

      if (/\(文法\)/.test(line)) {
        const patternLine = line.replace(/\s*\(文法\)\s*$/, "").trim();
        const meaningLine = lines[index + 1];
        const explanationLine =
          lines[index + 2]?.startsWith("解析：") || lines[index + 2]?.startsWith("應用場景：")
            ? lines[index + 2]
            : "";
        const exampleLine =
          lines[index + 2]?.startsWith("例句：")
            ? lines[index + 2]
            : lines[index + 3]?.startsWith("例句：") || lines[index + 3]?.startsWith("文中例句：")
              ? lines[index + 3]
              : "";
        const exampleMatch = exampleLine.match(/^(例句|文中例句)：\s*(.+?)[。.]?（(.+?)）$/);

        if (!isIgnorableGrammarPattern(patternLine)) {
          grammar.push({
            sectionTitle: currentSection,
            pattern: patternLine,
            meaningZh: meaningLine?.replace(/^(意思|定義|用法)：\s*/, "").trim() ?? "",
            explanation: explanationLine.replace(/^(解析|應用場景)：\s*/, "").trim(),
            exampleSentence: exampleMatch?.[2]?.trim() ?? "",
            exampleTranslation: exampleMatch?.[3]?.trim() ?? ""
          });
        }

        if (exampleLine === lines[index + 3]) {
          index += 3;
        } else if (exampleLine) {
          index += 2;
        } else if (meaningLine?.startsWith("意思：")) {
          index += 1;
        }

        continue;
      }

      if (
        line.startsWith("用法：") ||
        line.startsWith("結構：") ||
        line.startsWith("文章應用：") ||
        line.startsWith("例句：") ||
        line.startsWith("文中例句：") ||
        line.startsWith("解析：") ||
        line.startsWith("應用場景：")
      ) {
        continue;
      }

      if (isStructuredGrammarSubField(line)) {
        continue;
      }

      const match = line.match(/^(.+?)：\s*(.+)$/);
      if (!match) {
        continue;
      }

      const explanationLine = lines[index + 1]?.startsWith("說明：") ? lines[index + 1] : "";
      const exampleLineIndex = explanationLine ? index + 2 : index + 1;
      const exampleLine = lines[exampleLineIndex]?.startsWith("例句：") ? lines[exampleLineIndex] : "";
      const exampleMatch = exampleLine.match(/^例句：\s*(.+?)[。.]?（(.+?)）$/);

      if (!isIgnorableGrammarPattern(match[1].trim())) {
        grammar.push({
          sectionTitle: currentSection,
          pattern: match[1].trim(),
          meaningZh: match[2].trim(),
          explanation: explanationLine.replace(/^說明：/, "").trim(),
          exampleSentence: exampleMatch?.[1]?.trim() ?? "",
          exampleTranslation: exampleMatch?.[2]?.trim() ?? ""
        });
      }

      if (exampleLine) {
        index = exampleLineIndex;
      } else if (explanationLine) {
        index += 1;
      }
    }
  }

  if (sentences.length === 0 && vocabulary.length === 0 && grammar.length === 0) {
    throw new Error("貼上的內容沒有辨識到可匯入的句子、單字或文法。請保留原本的標題與解析格式。");
  }

  return {
    title,
    sourceText,
    sentences,
    vocabulary,
    grammar
  };
}
