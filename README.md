# Panda Market · Sprint Mission 09

Next.js 프론트엔드와 Express/Prisma REST API를 한 서버에서 제공하는 풀스택
중고 거래 프로젝트입니다. 프론트엔드는 외부 Panda Market API 대신 동일 origin의
`/api`를 사용합니다.

## 주요 기능

- 상품 목록, 검색, 최신/좋아요 정렬, 좋아요 기준 베스트 상품 4개
- 상품·게시글 등록/수정 시 이미지 최대 3개 업로드 및 미리보기
- 상품 상세의 댓글 목록과 사용자별 `isLiked`
- 상품·게시글 좋아요/취소 트랜잭션
- 회원가입, bcrypt 비밀번호 해싱, 로그인, JWT access token
- 회전형 HttpOnly refresh cookie 기반 sliding session과 재사용 탐지
- Google OAuth, 리소스/댓글 소유권 인가
- 중앙 에러 처리, 요청 검증, 인증·업로드 rate limit
- 사용자별 업로드 quota와 주기적인 미참조 이미지 정리
- Swagger UI 및 OpenAPI JSON

## 실행

Node.js는 `.nvmrc`의 버전을 사용합니다.

```sh
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed   # 선택
npm run dev
```

- 앱: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs.json`

기존 Sprint 08 데이터베이스를 채택하는 baseline 절차와 운영 업로드 주의사항은
[`server/README.md`](server/README.md)에 정리되어 있습니다. 운영 배포 전에는 JWT
비밀키, 허용 origin, Google OAuth callback, 영속 업로드 스토리지를 반드시 설정해야
합니다.

## 품질 확인

```sh
npm test
npm run lint
npm run build
DATABASE_URL='postgresql://…' npx prisma validate
```

서버 코드는 `routes → controllers → services → Prisma` 계층으로 분리되어 있고,
상품/게시글 라우터는 각각 `express.Router()`와 `route()` 체인을 사용합니다.
