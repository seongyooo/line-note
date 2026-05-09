---
title: "3주차: RAG 기반 쇼핑 리뷰 분석 챗봇 만들기"
date: 2026-05-09
tags:
  - RAG
  - LangChain
  - Pinecone
  - Supabase
  - Nextjs
  - Gemini
  - 벡터DB
  - 임베딩
draft: false
---

## 📌 오늘 배운 것 한 줄 요약

> 쇼핑 리뷰 데이터를 벡터 DB에 넣고, 사용자 질문에 맞는 리뷰를 검색해서 LLM이 답변하는 RAG 챗봇을 Next.js로 구현했다.

---

## 1. 왜 RAG인가? — 일반 LLM의 3대 한계

| 한계          | 설명                         |
| ----------- | -------------------------- |
| **최신성 절벽**  | 학습 데이터 컷오프 이후 정보를 모름       |
| **폐쇄성 자물쇠** | 사내 데이터, 비공개 쇼핑몰 리뷰 등 접근 불가 |
| **환각의 미로**  | 모르는 내용도 사실처럼 그럴싸하게 지어냄     |

### RAG (Retrieval-Augmented Generation) 란?

> AI가 모르는 지식을 **실시간으로 검색**하여 응답에 활용하는 기술

**주요 이점**

- **최신/도메인 정보**: 모델 재학습 없이 사내 문서와 최신 데이터 활용
- **환각 감소**: 실제 검색된 문서를 근거로 답변 → 정확도 극대화
- **출처 제공**: 답변의 근거가 되는 원본 문서 인용 가능

### RAG 파이프라인 흐름

```
프롬프트 (Prompt)
    → 검색 (Retrieval)
    → 관련 문서 (Relevant Documents)
    → LLM + 문서 (Context Augmentation)
    → 응답 (Response)
```

---

## 2. RAG vs. 파인튜닝

> **핵심 결론: 지식이 변한다면 RAG, 행동을 바꾼다면 파인튜닝**

| 항목    | RAG         | 파인튜닝            |
| ----- | ----------- | --------------- |
| 목적    | 동적 지식 주입    | 모델 행동/말투/뉘앙스 교정 |
| 비용    | 효율적 ✅       | 재학습 비용 높음 ❌     |
| 환각 통제 | 팩트 기반 억제 가능 | 상대적으로 약함        |
| 업데이트  | 데이터만 교체하면 됨 | 매번 재학습 필요       |

---

## 3. 핵심 개념들

### 📐 텍스트 임베딩 (Embedding)

> 자연어 텍스트를 컴퓨터가 이해할 수 있는 **다차원 숫자 벡터**로 변환하는 기술

- **키워드 매칭 ❌** → **의미적 유사도 ⭕**
- 문맥과 의미가 비슷하면 벡터 공간에서 **가까운 거리**에 매핑됨
- 예시: "소파 위의 잠자는 고양이" ↔ "고양이가 소파에서 잔다" → 벡터상 가까움

#### 한국어 특화 임베딩 주의사항

- 한국어는 교착어 특성상 (조사, 어미, 형태소) 일반 모델에서 의미적 유사도 파악과 토큰화 효율이 떨어짐
- **권장 임베딩 모델**:
    - `BGE-M3` (BAAI): Dense + Sparse 하이브리드 검색 지원, 한국어 처리 최우수
    - `multilingual-e5-large`: 100개 이상 언어 지원, 안정적인 다국어 처리

---

### 🗄️ 벡터 데이터베이스 (Vector DB)

> 임베딩 모델이 생성한 수많은 숫자 벡터를 저장하는 전용 데이터베이스

- 사용자 질문을 벡터로 변환 후, DB 내에서 **가장 거리가 가까운 문서를 밀리초 단위로 고속 검색** (ANN 알고리즘)

#### Vector DB 생태계 비교

|DB|분류|특징|
|---|---|---|
|**Pinecone**|SaaS (완전 관리형)|프로덕션 스케일 최적화, 서버리스|
|**Milvus / Qdrant**|로컬/오픈소스|대규모 데이터 처리용 고성능|
|**Chroma**|로컬/오픈소스|로컬 실행, 개발 및 프로토타입용 ✅ 입문에 적합|
|**pgvector**|하이브리드|기존 PostgreSQL 사용자에게 친숙한 익스텐션|

---

### 🔗 LangChain

> LLM과 외부 데이터, 도구를 **사슬처럼 연결**해주는 오픈소스 오케스트레이션 프레임워크

**목적**: LLM에 부족한 외부 세계 접근성(손과 발, 기억력)을 부여하고 복잡한 호출 규격을 표준화

#### LangChain 표준화 5가지 기본 모듈

1. **Document Loaders** — PDF, Notion, GitHub, Slack, Google Drive 등 100개 이상 소스에서 데이터 입력
2. **Text Splitters (Document Transformers)** — LLM 토큰 한계 대응, 문맥이 끊기지 않도록 정교한 알고리즘으로 청크 분할
3. **Text Embedding Models** — Gemini, OpenAI, HuggingFace 등 다양한 임베딩 모델 연결
4. **Vector Stores** — 벡터 데이터베이스와의 통신 관리
5. **Retrievers** — 검색 전략 정의 (단순 유사도, 날짜·가중치 필터링 등)

#### 랭체인의 데이터 정제 파이프라인 (Data Refinery)

```
Document Loaders → Text Splitters → Vector Stores → Retrievers
  (다양한 소스)     (최적 청크 분할)  (임베딩+DB 저장)  (관련 문서 추출)
```

#### LCEL (LangChain Expression Language)

> 선언적 코드 작성 방식으로, 복잡한 로직을 놀랍도록 단순하게 구성

```
Prompt | Model | OutputParser
  ↑           ↑           ↑
질문을      AI 답변    필요한 텍스트만
템플릿에    생성       추출
```

---

## 4. 오늘의 실전 구현 — 쇼핑 리뷰 챗봇 아키텍처

### 기술 스택

| 역할        | 기술                                    |
| --------- | ------------------------------------- |
| 프론트/백엔드   | **Next.js** (풀스택, API Routes)         |
| RAG 파이프라인 | **LangChain.js** (LCEL 컴포저블 로직)       |
| 벡터 DB     | **Pinecone** (완전 관리형 SaaS)            |
| LLM       | **Gemini 3.1 Flash Lite** (빠르고 저렴)    |
| RDBMS     | **Supabase** (PostgreSQL 기반 메타데이터 관리) |

### End-to-End 파이프라인

```
1. 사용자 질문
    → 2. 질문 임베딩 (숫자 벡터로 변환)
    → 3. Vector DB 검색 (Pinecone에서 유사 리뷰 탐색)
    → 4. 관련 리뷰 추출 (Top 5~10개)
    → 5. LLM 답변 생성 (Gemini가 리뷰 기반으로 응답)
```

### Grounding & 환각 통제 (Guardrails)

```javascript
// 1. 유사도 검색
const results = await vectorStore.similaritySearch(message, 3);

// 2. 컨텍스트 증강
const context = results.map(doc =>
  `[리뷰어: ${doc.author}] ${doc.content}`
).join("\n");

// 3. 환각 통제 프롬프트
const prompt = `제공된 [리뷰 컨텍스트]만을 사용하여 답변하세요.
추측하지 말고 알 수 없다고 답변하세요.
Context: ${context}`;
```

| 기법                       | 역할                                   |
| ------------------------ | ------------------------------------ |
| **Similarity Search**    | 상위 3개 리뷰 추출 및 Reference 메타데이터 정제     |
| **Context Augmentation** | 검색된 텍스트들을 단일 컨텍스트 블록으로 결합            |
| **Anti-Hallucination**   | '제공된 컨텍스트만 사용', '추측 금지' 지시로 거짓 정보 차단 |

---

## 5. 환경변수 설정 파일

> `.env` vs `.env.local` — 절대 헷갈리면 안 됨!

|파일|용도|Git 공유|
|---|---|---|
|`.env`|공통 설정 파일. 모든 개발자가 공유해야 하는 기본 설정 (API 주소 등)|✅ 가능|
|`.env.local`|비밀 설정 파일. API Secret Key, DB 계정 정보, 클라우드 비밀 키|❌ 절대 금지 → `.gitignore`에 반드시 포함|

### 오늘 프로젝트 환경변수 목록

```env
PINECONE_API_KEY=
PINECONE_HOST=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
GEMINI_API_KEY=
```

---

## 6. 실습 진행 순서

### Step 1 — 프로젝트 세팅

```bash
# ① Stitch에서 workspace 생성
# ② workspace명으로 Next.js 앱 생성
npx create-next-app@latest .
```

### Step 2 — 샘플 데이터 생성

- 경로: `samples/review.csv`
- 100개 리뷰 데이터
- 컬럼: `id, rating, title, content, author, date, helpful_votes, verified_purchase`

### Step 3 — Pinecone 설정

- 인덱스명: `review-chatbot`
- 임베딩 모델: `llama-text-embed-v2`
- 용량 모드: Serverless (On-demand)
- Cloud/Region: AWS / us-east-1

### Step 4 — Supabase 연동

```bash
npx supabase login
npx supabase link
npx supabase db push
```

- RLS (Row Level Security) 정책 적용
- 비로그인 익명 사용자도 안전하게 조회 가능하도록 설정

### Step 5 — AI 연동

- Gemini API 연결
- 모델: `gemini-3.1-flash-lite-preview`
- LangChain으로 연동

---

## 7. 심화 개념 (이후 학습 방향)

### 검색 전략의 진화: Hybrid Search

- **Dense Search** (의미 기반): 신경망·임베딩 활용, 의미적 유사성 기반 검색
- **Sparse Search** (키워드 기반): BM25/TF-IDF 활용, 정확한 단어 매칭·고유명사 검색에 강함
- **Hybrid Search** = Dense + Sparse → RRF(Reciprocal Rank Fusion) 알고리즘으로 두 결과를 융합해 최고 성능 달성

### 문맥 손실 문제와 해결책

- **문제 (Context Loss)**: 청킹 과정에서 주어가 생략되거나 문서 전체 맥락이 잘려나감
- **해결 1 — Contextual Retrieval**: 개별 청크에 문서 전체 요약(Context Prefix) 강제 부착 → BM25 결합 시 검색 실패율 67% 감소
- **해결 2 — Late Chunking**: 전체 문서를 먼저 임베딩하여 문맥을 흡수한 뒤 토큰 수준에서 분할

### 고급 검색 기법 (Advanced RAG)

1. **1차 검색 (Initial Retrieval)**: Recall 중심의 대규모 결과 풀 확보
2. **MMR (Maximum Marginal Relevance)**: 유사도 중복 방지 및 검색 다양성 확보
3. **리랭킹 (Reranking)**: Cross-Encoder 모델을 통한 쿼리-문서 간 정밀 관련성 재정렬 (Top 3~5 도출)

### 중요: RAG 파이프라인 고도화 전략

- **Streaming**: LangChainAdapter 활용 → 답변이 한 글자씩 출력되는 타이핑 효과 (TTFT 대폭 축소)
- **Score Filtering**: 유사도 점수가 임계값 이하인 노이즈 데이터 프롬프트 주입 전 폐기
- **Re-ranking**: 검색된 결과의 순서를 AI가 다시 평가·재배치하여 답변 질 향상

### RAG 비용 최적화 아키텍처

|방식|속도|비용|특징|
|---|---|---|---|
|일반 RAG|보통|높음|기본 표준 아키텍처|
|시맨틱 캐시|최고 (LLM 우회)|대폭 절감|중복 질문 많은 B2C CS 환경 최적|
|프롬프트 캐싱 & CAG|매우 빠름|반복 쿼리 시 절감|고정된 단일 대형 문서 분석에 적합|

### 멀티모달 RAG

- 텍스트를 넘어 리뷰 사진, 제품 매뉴얼의 표, 다이어그램 등 시각적 데이터까지 검색·생성 영역으로 확장
- **방법 1 — CLIP 방식**: 이미지 자체를 벡터로 인코딩 (시각적 유사도 검색에 유리, Modality Gap 발생 가능)
- **방법 2 — Vision LLM 방식**: 이미지를 텍스트로 사전 요약 → 기존 RAG 인프라 100% 재사용 가능, 객관적 정보 검색에 탁월

### 향후 확장 방향

- **Multi-modal RAG**: 고객이 업로드한 사진·표까지 분석하는 시각 지능 통합
- **Agentic RAG → LangGraph**: 스스로 검색의 필요성을 판단하고, 정보가 부족하면 쿼리를 재작성하여 반복 탐색하는 자율형 Self-RAG으로 진화

---

## 9. 실습 과제

### 📝 To-Do List 앱 만들기

**워크스페이스명**: `todolist`

**구현 목표**

1. 기본 할 일 생성/수정/삭제 기능 + Supabase 마이그레이션
2. Gemini API 추가 → 할 일 입력 시 **쉬움 / 중간 / 어려움** 자동 분류 표기

> ⚠️ RAG가 아님! 순수 LLM 호출로 분류만 수행

**제출**

- 제출 기한: 오후 5:25 (10분)
- 앱 동작 화면 녹화 후 드라이브 업로드
- 파일명: `학교-이름-전화번호뒷자리`

---

## 🔗 관련 링크

- Supabase: https://supabase.com/
- Gemini API: https://aistudio.google.com/prompts/new_chat
- Pinecone: https://www.pinecone.io/

---

## 💬 수업 중 메모 / 필기

- **C. 아키텍처 다이어그램**: Query → Search Data → 검색 결과 → LLM → 응답 → Pinecone (참고자기반)
- ![[Pasted image 20260509181429.png]]
- Document Loaders에서 CEL(LCEL)로 연결
- 오늘 할 것: Next.js + LangChain.js + Pinecone으로 RAG 파이프라인 이해와 구축
- 심화: 멀티모달 RAG → LangChain → LangGraph (멀티에이전트), CLIP
- `.env.local`은 절대 git에 올리면 안 됨 → `.gitignore`에 반드시 포함

---
![[한동대_김선교_9191.mp4]]