import swaggerJSDoc from 'swagger-jsdoc';

const bearer = [{ bearerAuth: [] }, { accessCookie: [] }];
const optionalBearer = [{}, ...bearer];
const errorResponses = {
  400: { description: '입력값 오류', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
  401: { description: '인증 필요 또는 토큰 오류', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
  403: { description: '소유권/권한 오류', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
  404: { description: '리소스를 찾을 수 없음', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
  409: { description: '중복 또는 현재 상태와 충돌', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
  413: { description: '업로드 크기 초과', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
  429: { description: '요청 횟수 또는 저장 한도 초과', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
  500: { description: '서버 오류', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
  502: { description: '외부 인증 서버 오류', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
  503: { description: '외부 인증 설정 또는 서비스 사용 불가', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
};

const productId = {
  name: 'productId', in: 'path', required: true, schema: { type: 'integer', minimum: 1, maximum: 2_147_483_647 },
};
const articleId = {
  name: 'articleId', in: 'path', required: true, schema: { type: 'integer', minimum: 1, maximum: 2_147_483_647 },
};
const commentId = {
  name: 'commentId', in: 'path', required: true, schema: { type: 'integer', minimum: 1, maximum: 2_147_483_647 },
};
const listParameters = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 1_000_000, default: 1 } },
  { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 15 } },
  { name: 'keyword', in: 'query', schema: { type: 'string', maxLength: 100 } },
  { name: 'orderBy', in: 'query', schema: { type: 'string', enum: ['recent', 'like'], default: 'recent' } },
];
const commentParameters = [
  { name: 'cursor', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 2_147_483_647 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
];
const body = (schema) => ({
  required: true,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } },
});
const optionalBody = (schema) => ({
  required: false,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } },
});
const response = (description, schema) => ({
  description,
  content: schema ? { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } } : undefined,
});

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'Panda Market API',
    version: '1.0.0',
    description: 'Sprint Mission 09 REST API. Bearer access tokens and rotating refresh sessions are supported.',
  },
  servers: [{ url: '/api', description: '현재 호스트' }],
  tags: [
    { name: 'Auth' }, { name: 'Users' }, { name: 'Products' },
    { name: 'Articles' }, { name: 'Comments' }, { name: 'Uploads' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      accessCookie: { type: 'apiKey', in: 'cookie', name: 'access_token' },
      refreshCookie: { type: 'apiKey', in: 'cookie', name: 'refresh_token' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
          message: { type: 'string' },
        },
      },
      User: {
        type: 'object',
        required: ['id', 'email', 'nickname'],
        properties: {
          id: { type: 'integer' }, email: { type: 'string', format: 'email' },
          nickname: { type: 'string' }, image: { type: 'string', nullable: true },
          emailVerifiedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      SignupInput: {
        type: 'object', additionalProperties: false, required: ['email', 'nickname', 'password'],
        properties: {
          email: { type: 'string', format: 'email' }, nickname: { type: 'string', maxLength: 20 },
          password: { type: 'string', format: 'password', minLength: 8, maxLength: 72 },
          passwordConfirmation: { type: 'string', format: 'password' },
        },
      },
      SigninInput: {
        type: 'object', additionalProperties: false, required: ['email', 'password'],
        properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } },
      },
      RefreshInput: { type: 'object', additionalProperties: false, properties: { refreshToken: { type: 'string' } } },
      UploadedImagePath: {
        type: 'string',
        pattern: '^/uploads/[1-9][0-9]*-[0-9a-f-]+\\.(jpg|jpeg|png|webp|gif)$',
        example: '/uploads/1-550e8400-e29b-41d4-a716-446655440000.jpg',
        description: '이미지 업로드 API가 발급한 현재 사용자의 상대 경로',
      },
      AuthResponse: {
        type: 'object', required: ['user', 'accessToken', 'tokenType', 'expiresIn'],
        properties: {
          user: { $ref: '#/components/schemas/User' }, accessToken: { type: 'string' },
          tokenType: { type: 'string', example: 'Bearer' },
          expiresIn: { type: 'integer', example: 900 },
        },
      },
      Writer: {
        type: 'object',
        properties: { id: { type: 'integer' }, nickname: { type: 'string' }, image: { type: 'string', nullable: true } },
      },
      Comment: {
        type: 'object', required: ['id', 'content'],
        properties: {
          id: { type: 'integer' }, content: { type: 'string' }, writer: { $ref: '#/components/schemas/Writer' },
          createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CommentInput: { type: 'object', additionalProperties: false, required: ['content'], properties: { content: { type: 'string', minLength: 1, maxLength: 1000 } } },
      CommentList: {
        type: 'object',
        properties: {
          list: { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
          nextCursor: { type: 'integer', nullable: true },
        },
      },
      ProductInput: {
        type: 'object', additionalProperties: false, required: ['name', 'description', 'price'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 30 }, description: { type: 'string', minLength: 10, maxLength: 1000 },
          price: { type: 'integer', minimum: 0, maximum: 2_147_483_647 }, tags: { type: 'array', maxItems: 10, items: { type: 'string', minLength: 1, maxLength: 20 } },
          images: { type: 'array', maxItems: 3, items: { $ref: '#/components/schemas/UploadedImagePath' } },
        },
      },
      ProductUpdate: {
        type: 'object', additionalProperties: false, minProperties: 1,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 30 }, description: { type: 'string', minLength: 10, maxLength: 1000 },
          price: { type: 'integer', minimum: 0, maximum: 2_147_483_647 }, tags: { type: 'array', maxItems: 10, items: { type: 'string', minLength: 1, maxLength: 20 } },
          images: { type: 'array', maxItems: 3, items: { type: 'string' }, description: '기존 첨부 경로는 유지할 수 있고 새 경로는 현재 사용자가 업로드한 경로여야 합니다.' },
        },
      },
      Product: {
        type: 'object', required: ['id', 'name', 'price', 'images', 'likeCount', 'isLiked', 'ownerId'],
        properties: {
          id: { type: 'integer' }, name: { type: 'string' }, description: { type: 'string' }, price: { type: 'integer' },
          tags: { type: 'array', items: { type: 'string' } }, images: { type: 'array', maxItems: 3, items: { type: 'string' } },
          image: { type: 'string', nullable: true }, likeCount: { type: 'integer' }, favoriteCount: { type: 'integer' },
          isLiked: { type: 'boolean' }, isFavorite: { type: 'boolean' }, ownerId: { type: 'integer' },
          ownerNickname: { type: 'string' }, commentsCount: { type: 'integer' },
          comments: { type: 'array', maxItems: 100, description: '최신 댓글 최대 100개 미리보기. 전체 목록은 댓글 목록 API를 사용합니다.', items: { $ref: '#/components/schemas/Comment' } },
          commentsTruncated: { type: 'boolean', description: '댓글 미리보기가 전체 댓글 수보다 적은지 여부' },
          createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProductList: {
        type: 'object',
        properties: {
          list: { type: 'array', items: { $ref: '#/components/schemas/Product' } }, totalCount: { type: 'integer' },
          page: { type: 'integer' }, pageSize: { type: 'integer' }, orderBy: { type: 'string', enum: ['recent', 'like'] },
        },
      },
      ArticleInput: {
        type: 'object', additionalProperties: false, required: ['title', 'content'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 100 }, content: { type: 'string', minLength: 1, maxLength: 10000 },
          images: { type: 'array', maxItems: 3, items: { $ref: '#/components/schemas/UploadedImagePath' } },
        },
      },
      ArticleUpdate: {
        type: 'object', additionalProperties: false, minProperties: 1, properties: {
          title: { type: 'string', minLength: 1, maxLength: 100 }, content: { type: 'string', minLength: 1, maxLength: 10000 },
          images: { type: 'array', maxItems: 3, items: { type: 'string' }, description: '기존 첨부 경로는 유지할 수 있고 새 경로는 현재 사용자가 업로드한 경로여야 합니다.' },
        },
      },
      Article: {
        type: 'object', required: ['id', 'title', 'content', 'likeCount', 'isLiked', 'ownerId'],
        properties: {
          id: { type: 'integer' }, title: { type: 'string' }, content: { type: 'string' },
          images: { type: 'array', maxItems: 3, items: { type: 'string' } }, image: { type: 'string', nullable: true },
          likeCount: { type: 'integer' }, isLiked: { type: 'boolean' }, ownerId: { type: 'integer' }, ownerNickname: { type: 'string' },
          commentsCount: { type: 'integer' },
          comments: { type: 'array', maxItems: 100, description: '최신 댓글 최대 100개 미리보기. 전체 목록은 댓글 목록 API를 사용합니다.', items: { $ref: '#/components/schemas/Comment' } },
          commentsTruncated: { type: 'boolean', description: '댓글 미리보기가 전체 댓글 수보다 적은지 여부' },
          createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ArticleList: {
        type: 'object', properties: {
          list: { type: 'array', items: { $ref: '#/components/schemas/Article' } }, totalCount: { type: 'integer' },
          page: { type: 'integer' }, pageSize: { type: 'integer' }, orderBy: { type: 'string', enum: ['recent', 'like'] },
        },
      },
      UploadResponse: {
        type: 'object', properties: {
          urls: { type: 'array', maxItems: 3, items: { type: 'string', format: 'uri-reference' } },
          images: { type: 'array', maxItems: 3, items: { type: 'string', format: 'uri-reference' } },
          url: { type: 'string', format: 'uri-reference', example: '/uploads/1-550e8400-e29b-41d4-a716-446655440000.jpg' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: { summary: '서버/DB 상태 확인', responses: { 200: response('정상') } },
    },
    '/auth/signup': {
      post: { tags: ['Auth'], summary: '회원가입', requestBody: body('SignupInput'), responses: { 201: response('가입 성공', 'AuthResponse'), ...errorResponses } },
    },
    '/auth/signin': {
      post: { tags: ['Auth'], summary: '로그인', requestBody: body('SigninInput'), responses: { 200: response('로그인 성공', 'AuthResponse'), ...errorResponses } },
    },
    '/auth/refresh': {
      post: { tags: ['Auth'], security: [{ refreshCookie: [] }], summary: '회전형 HttpOnly 리프레시 쿠키로 세션 연장', requestBody: optionalBody('RefreshInput'), responses: { 200: response('재발급 성공', 'AuthResponse'), ...errorResponses } },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], security: [{ refreshCookie: [] }], summary: '리프레시 세션 폐기', requestBody: optionalBody('RefreshInput'), responses: { 204: response('로그아웃 성공'), ...errorResponses } },
    },
    '/auth/google': {
      get: { tags: ['Auth'], summary: 'Google OAuth 시작', parameters: [{ name: 'next', in: 'query', schema: { type: 'string' } }], responses: { 302: { description: 'Google로 이동' }, ...errorResponses } },
    },
    '/auth/google/callback': {
      get: {
        tags: ['Auth'],
        summary: 'Google OAuth 콜백',
        description: 'Google 성공(code) 또는 취소/실패(error) 콜백을 처리합니다.',
        parameters: [
          { name: 'code', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'error', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'state', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: { 302: { description: '성공 또는 안전한 오류 코드와 함께 프런트로 이동' }, ...errorResponses },
      },
    },
    '/users/me': {
      get: { tags: ['Users'], security: bearer, summary: '내 정보 조회', responses: { 200: response('사용자', 'User'), ...errorResponses } },
    },
    '/uploads/images': {
      post: {
        tags: ['Uploads'], security: bearer, summary: '상품/게시글 이미지 최대 3개 업로드',
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', additionalProperties: false, required: ['images'], properties: { images: { type: 'array', maxItems: 3, items: { type: 'string', format: 'binary' } } } } } } },
        responses: { 201: response('업로드 성공', 'UploadResponse'), ...errorResponses },
      },
    },
    '/products': {
      get: { tags: ['Products'], security: optionalBearer, summary: '상품 목록/검색/정렬', parameters: listParameters, responses: { 200: response('상품 목록', 'ProductList'), ...errorResponses } },
      post: { tags: ['Products'], security: bearer, summary: '상품 등록', requestBody: body('ProductInput'), responses: { 201: response('상품', 'Product'), ...errorResponses } },
    },
    '/products/best': {
      get: { tags: ['Products'], security: optionalBearer, summary: '좋아요 기준 베스트 상품(최대 4개)', parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 4, default: 4 } }], responses: { 200: response('베스트 상품', 'ProductList'), ...errorResponses } },
    },
    '/products/{productId}': {
      get: { tags: ['Products'], security: optionalBearer, summary: '상품 상세(댓글/isLiked 포함)', parameters: [productId], responses: { 200: response('상품', 'Product'), ...errorResponses } },
      patch: { tags: ['Products'], security: bearer, summary: '소유 상품 수정', parameters: [productId], requestBody: body('ProductUpdate'), responses: { 200: response('상품', 'Product'), ...errorResponses } },
      delete: { tags: ['Products'], security: bearer, summary: '소유 상품 삭제', parameters: [productId], responses: { 204: response('삭제 성공'), ...errorResponses } },
    },
    '/products/{productId}/likes': {
      post: { tags: ['Products'], security: bearer, summary: '상품 좋아요', parameters: [productId], responses: { 200: response('상품', 'Product'), ...errorResponses } },
      delete: { tags: ['Products'], security: bearer, summary: '상품 좋아요 취소', parameters: [productId], responses: { 200: response('상품', 'Product'), ...errorResponses } },
    },
    '/products/{productId}/comments': {
      get: { tags: ['Comments'], security: optionalBearer, summary: '상품 댓글 목록', parameters: [productId, ...commentParameters], responses: { 200: response('댓글 목록', 'CommentList'), ...errorResponses } },
      post: { tags: ['Comments'], security: bearer, summary: '상품 댓글 등록', parameters: [productId], requestBody: body('CommentInput'), responses: { 201: response('댓글', 'Comment'), ...errorResponses } },
    },
    '/articles': {
      get: { tags: ['Articles'], security: optionalBearer, summary: '게시글 목록/검색/정렬', parameters: listParameters, responses: { 200: response('게시글 목록', 'ArticleList'), ...errorResponses } },
      post: { tags: ['Articles'], security: bearer, summary: '게시글 등록', requestBody: body('ArticleInput'), responses: { 201: response('게시글', 'Article'), ...errorResponses } },
    },
    '/articles/{articleId}': {
      get: { tags: ['Articles'], security: optionalBearer, summary: '게시글 상세(댓글/isLiked 포함)', parameters: [articleId], responses: { 200: response('게시글', 'Article'), ...errorResponses } },
      patch: { tags: ['Articles'], security: bearer, summary: '소유 게시글 수정', parameters: [articleId], requestBody: body('ArticleUpdate'), responses: { 200: response('게시글', 'Article'), ...errorResponses } },
      delete: { tags: ['Articles'], security: bearer, summary: '소유 게시글 삭제', parameters: [articleId], responses: { 204: response('삭제 성공'), ...errorResponses } },
    },
    '/articles/{articleId}/likes': {
      post: { tags: ['Articles'], security: bearer, summary: '게시글 좋아요', parameters: [articleId], responses: { 200: response('게시글', 'Article'), ...errorResponses } },
      delete: { tags: ['Articles'], security: bearer, summary: '게시글 좋아요 취소', parameters: [articleId], responses: { 200: response('게시글', 'Article'), ...errorResponses } },
    },
    '/articles/{articleId}/comments': {
      get: { tags: ['Comments'], security: optionalBearer, summary: '게시글 댓글 목록', parameters: [articleId, ...commentParameters], responses: { 200: response('댓글 목록', 'CommentList'), ...errorResponses } },
      post: { tags: ['Comments'], security: bearer, summary: '게시글 댓글 등록', parameters: [articleId], requestBody: body('CommentInput'), responses: { 201: response('댓글', 'Comment'), ...errorResponses } },
    },
    '/comments/{commentId}': {
      patch: { tags: ['Comments'], security: bearer, summary: '소유 댓글 수정', parameters: [commentId], requestBody: body('CommentInput'), responses: { 200: response('댓글', 'Comment'), ...errorResponses } },
      delete: { tags: ['Comments'], security: bearer, summary: '소유 댓글 삭제', parameters: [commentId], responses: { 204: response('삭제 성공'), ...errorResponses } },
    },
  },
};

export const openapiSpecification = swaggerJSDoc({ definition, apis: [] });

export default openapiSpecification;
