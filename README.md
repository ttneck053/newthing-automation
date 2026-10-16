# AX Contents Studio

기사 URL 또는 본문에서 카드뉴스를 만드는 GPT 기반 웹앱입니다. 참고 화면의 사이드바와 5장 편집기를 재현하고, 세 가지 카드 디자인·YouTube 썸네일·블로그·리서치 초안을 제공합니다.

## 실행

Node.js 24 이상. 별도 패키지 설치가 필요 없습니다.

```sh
npm run build
npm run dev
```

`http://localhost:4177/generate`에서 열고 **샘플로 시작**을 누르면 API 비용 없이 카드 편집과 저장을 확인할 수 있습니다. 샘플은 기능 확인용 가상 기사로 표시됩니다.

## GPT 연결

앱의 **GPT 연결**에서 개인 API 키를 입력합니다. 키는 열린 탭의 메모리에만 보관하며 localStorage나 서버 파일에 저장하지 않습니다. 실제 생성 요청 시 같은 출처의 서버를 거쳐 OpenAI에 전달됩니다. ChatGPT Pro 구독과 API 요금은 별도입니다.

서버 연결은 `.env.example`을 참고해 Git에서 제외된 `.env.local`에 `OPENAI_API_KEY`를 설정합니다. Sites 배포에서는 런타임 비밀 값으로 설정합니다. 기본 모델은 `gpt-5.4-mini`, 선택 모델은 `gpt-5.4`입니다. Responses API의 strict JSON Schema를 사용하며, 응답 저장은 끕니다.

## 기능

- 기사 추출과 원문 링크, 본문 직접 입력, 생성 상태·오류·취소
- 1080×1350 카드 5장, 1920×1080 YouTube 썸네일
- 실시간 문구 수정, 이미지 업로드/주소/프리셋, 사진 위치, 제목 색·크기·강조
- 화이트·다크·크림 배경, 카드 확대, PNG 및 캡션 포함 ZIP 다운로드
- 블로그·리서치 초안 편집/복사/텍스트 저장
- 브라우저별 작업 자동 저장, 모바일 가로 스크롤 편집기

기사 페이지가 로그인을 요구하거나 수집을 차단하면 본문 직접 입력을 안내합니다. 외부 사진의 수집이 차단되면 직접 업로드할 수 있습니다. HEIC는 브라우저 간 호환 문제로 지원하지 않습니다.

## 검증

```sh
npm test
npm run build
npm run validate
```

유효한 API 키가 없는 환경에서는 실제 유료 GPT 호출을 실행하지 않습니다. API 계약, 기사 추출, 사설 주소/리다이렉트 차단, 인증·잔액 오류, 잘못된 모델 응답은 모의 응답으로 검증합니다.

소스는 `web/`와 `worker/server.mjs`에서 수정합니다. 빌드가 HTML·JS·CSS·사진·폰트를 `worker/index.js` 하나로 묶고, Sites용 `dist/server/index.js`를 만듭니다.

프리셋 사진: [Unsplash 도시](https://images.unsplash.com/photo-1486406146926-c627a92ad1ab), [금융 차트](https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3), [업무 이미지](https://images.unsplash.com/photo-1454165804606-c3d57bc86b40). 폰트: Pretendard, SIL Open Font License 1.1. 참고 사이트의 로고 파일이나 서버 코드는 복사하지 않았습니다.
