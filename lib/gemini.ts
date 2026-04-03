import type { LessonCategory } from "@/types/study";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const MAX_RETRY_ATTEMPTS = 2;
const DEFAULT_REQUEST_TIMEOUT_MS = 0;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

type GeminiImageInput = {
  mimeType: string;
  dataBase64: string;
};

type GeminiGenerateInput = {
  category: LessonCategory;
  rawText?: string;
  image?: GeminiImageInput;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  if (timeoutMs <= 0) {
    return fetch(url, init);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseRetryAfterMs(response: Response, raw: string) {
  const headerValue = response.headers.get("retry-after");
  if (headerValue) {
    const seconds = Number(headerValue);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.round(seconds * 1000);
    }
  }

  const rawMatch = raw.match(/Please retry in\s+([\d.]+)s/i);
  const secondsFromRaw = Number(rawMatch?.[1] ?? "");
  if (Number.isFinite(secondsFromRaw) && secondsFromRaw > 0) {
    return Math.round(secondsFromRaw * 1000);
  }

  return null;
}

function buildN1Instruction(category: LessonCategory) {
  return [
    "你是我的日文學習助教，教學目標是 JLPT N1。",
    "輸出語言固定為繁體中文，不要使用表格。",
    "所有解析只保留 N1 或進階重點；沒有重點時固定輸出「無」，禁止硬湊內容。",
    "第一行必須固定格式：標題：<自動生成的標題>。",
    "接著按句子順序輸出：第1句、第2句……，不得跳句。",
    "每一句都必填以下欄位，且名稱不得改動：原句、中文翻譯、單字解析、文法解析、例句、常用使用場景。",
    "單字解析規則：若不是無，每個詞必須包含：日文、假名、詞性、中文意思、單字例句、單字例句中文。",
    "文法解析規則：若不是無，每個文法必須包含：文法、接續、意思、語氣／用法說明。",
    "例句規則：文法解析為無時，例句必須輸出無；文法解析非無時，例句必須含：日文、中文。",
    "常用使用場景規則：使用條列，至少 2 點。",
    "禁止把「省略、停頓、留白」當作文法名稱。",
    "可使用 --- 作為句子區塊分隔線。",
    "輸出前請自我檢查每一句是否含所有必填欄位，若缺少先補齊。",
    "不要輸出 markdown code block。",
    `內容類型：${category}`
  ].join("\n");
}

export async function generateN1AnalysisWithGemini(input: GeminiGenerateInput) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("尚未設定 GEMINI_API_KEY。請先在環境變數加入金鑰。");
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const configuredMaxOutputTokens = process.env.GEMINI_MAX_OUTPUT_TOKENS;
  const parsedMaxOutputTokens = configuredMaxOutputTokens ? Number(configuredMaxOutputTokens) : NaN;
  const maxOutputTokens =
    Number.isFinite(parsedMaxOutputTokens) && parsedMaxOutputTokens > 0
      ? parsedMaxOutputTokens
      : undefined;
  const configuredTimeoutMs = Number(process.env.GEMINI_TIMEOUT_MS ?? DEFAULT_REQUEST_TIMEOUT_MS);
  const requestTimeoutMs =
    Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs >= 0
      ? configuredTimeoutMs
      : DEFAULT_REQUEST_TIMEOUT_MS;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const userParts: Array<Record<string, unknown>> = [
    {
      text: `${buildN1Instruction(input.category)}\n\n請先完成 OCR 與理解，再輸出符合規格的最終結果。`
    }
  ];

  if (input.rawText?.trim()) {
    userParts.push({ text: `以下是使用者提供的日文文字：\n${input.rawText.trim()}` });
  }

  if (input.image) {
    userParts.push({
      inline_data: {
        mime_type: input.image.mimeType,
        data: input.image.dataBase64
      }
    });
    userParts.push({ text: "上面附有日文文章圖片，請先讀取圖片內容後再進行解析。" });
  }

  const requestBody = JSON.stringify({
    systemInstruction: {
      parts: [{ text: "你是嚴格遵守固定欄位格式的日文 N1 教學助教。缺欄位視為失敗。" }]
    },
    contents: [{ role: "user", parts: userParts }],
    generationConfig: {
      temperature: 0.1,
      topP: 0.9,
      ...(maxOutputTokens ? { maxOutputTokens } : {})
    }
  });

  let raw = "";
  let response: Response | null = null;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    try {
      response = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: requestBody
        },
        requestTimeoutMs
      );
    } catch (error) {
      if (attempt === MAX_RETRY_ATTEMPTS) {
        throw new Error("Gemini 請求失敗，請稍後再試或調整 GEMINI_TIMEOUT_MS。");
      }

      const jitter = Math.floor(Math.random() * 150);
      const delayMs = Math.min(2200, 250 * 2 ** (attempt - 1)) + jitter;
      await sleep(delayMs);
      continue;
    }

    raw = await response.text();

    if (response.ok) {
      break;
    }

    const retryAfterMs = parseRetryAfterMs(response, raw);

    if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_RETRY_ATTEMPTS) {
      if (response.status === 429) {
        const waitSeconds = retryAfterMs ? Math.max(1, Math.ceil(retryAfterMs / 1000)) : 30;
        throw new Error(`Gemini 配額已用盡（429）。請等待約 ${waitSeconds} 秒後再試，或更換 API 金鑰／升級方案。`);
      }

      throw new Error(`Gemini API 呼叫失敗（${response.status}）：${raw.slice(0, 500)}`);
    }

    const jitter = Math.floor(Math.random() * 150);
    const baseDelayMs = Math.min(2200, 250 * 2 ** (attempt - 1)) + jitter;
    const delayMs = retryAfterMs ? Math.max(baseDelayMs, retryAfterMs) : baseDelayMs;
    await sleep(delayMs);
  }

  if (!response || !response.ok) {
    throw new Error("Gemini 服務目前繁忙，請稍後再試。");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Gemini 回傳非 JSON，請稍後再試。");
  }

  const candidate =
    typeof payload === "object" &&
    payload !== null &&
    "candidates" in payload &&
    Array.isArray((payload as { candidates?: unknown[] }).candidates)
      ? (payload as { candidates: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates[0]
      : null;

  const text = candidate?.content?.parts?.map((part) => part.text ?? "").join("").trim();

  if (!text) {
    throw new Error("Gemini 沒有回傳可用內容，請重試或改短一點內容。");
  }

  return { text, model };
}
