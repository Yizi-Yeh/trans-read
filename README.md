# JP N1 Study Vault

這個專案把整理好的日文教材貼進系統，拆出句子卡與單字卡，寫入 PostgreSQL，並提供最小可用的複習流程。

## 目前完成

- 貼文匯入頁
- `POST /api/import` 匯入 API
- `GET /api/review` / `POST /api/review` 複習 API
- Prisma + PostgreSQL 資料模型
- 句子卡 / 單字卡複習介面

## 啟動

1. 安裝依賴：`npm install`
2. 建立環境變數：把 `.env.example` 複製成 `.env.local`
3. 在 `.env.local` 填入 `DATABASE_URL`
4. 產生 Prisma Client：`npm run prisma:generate`
5. 把 schema 推到資料庫：`npm run prisma:push`
6. 啟動：`npm run dev`

## 貼上格式

目前解析器支援這類結構：

- `文章 A：...`
- `逐句對照與翻譯`
- 日文句
- 中文翻譯
- `關鍵單字與用法`
- `單字（讀音）：中文意思`
- `例句：...（...）`

## 資料表

- `lessons`
- `sentences`
- `vocabularies`
