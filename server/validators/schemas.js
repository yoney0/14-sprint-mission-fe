import { Buffer } from 'node:buffer';
import { z } from 'zod';

function numberInput(schema) {
  return z.preprocess((value) => {
    if (typeof value === 'string' && value.trim() !== '') return Number(value);
    return value;
  }, schema);
}

const positiveId = numberInput(
  z.number().finite().int().min(1, 'ID는 양의 정수여야 합니다.').max(2_147_483_647),
);
const boundedPage = numberInput(z.number().finite().int().min(1).max(1_000_000));
const boundedPageSize = numberInput(z.number().finite().int().min(1).max(100));
const uploadedImagePath = z.string().trim().regex(
  /^\/uploads\/[1-9]\d*-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpe?g|png|webp|gif)$/i,
  '업로드 API가 반환한 이미지 경로만 사용할 수 있습니다.',
);
const existingImageReference = z.string().trim().min(1).max(2048).refine(
  (value) => !value.includes('\\')
    && !value.startsWith('//')
    && (value.startsWith('/') || /^https:\/\//i.test(value)),
  '이미지 경로는 절대 HTTP(S) URL 또는 /로 시작하는 경로여야 합니다.',
);
const passwordBytes = (minimum) => z.string().min(minimum).max(72).refine(
  (value) => Buffer.byteLength(value, 'utf8') <= 72,
  '비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.',
);

export const idParams = (field) => z.object({ [field]: positiveId }).strict();

export const listQuery = z.object({
  page: boundedPage.default(1),
  pageSize: boundedPageSize.default(15),
  keyword: z.string().trim().max(100).default(''),
  orderBy: z.enum(['recent', 'like']).default('recent'),
}).strict();

export const bestProductsQuery = z.object({
  limit: numberInput(z.number().finite().int().min(1).max(4)).default(4),
}).strict();

export const signupBody = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  nickname: z.string().trim().min(1).max(20),
  password: passwordBytes(8),
  passwordConfirmation: z.string().optional(),
}).strict().superRefine((value, context) => {
  if (value.passwordConfirmation && value.passwordConfirmation !== value.password) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['passwordConfirmation'],
      message: '비밀번호 확인이 일치하지 않습니다.',
    });
  }
});

export const signinBody = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: passwordBytes(1),
}).strict();

export const refreshBody = z.object({
  refreshToken: z.string().min(1).optional(),
}).strict().default({});

const productFields = {
  name: z.string().trim().min(1).max(30),
  description: z.string().trim().min(10).max(1000),
  price: numberInput(z.number().finite().int().min(0).max(2_147_483_647)),
  tags: z.array(z.string().trim().min(1).max(20)).max(10).default([]),
  images: z.array(uploadedImagePath).max(3).optional(),
};

export const createProductBody = z.object(productFields).strict();
export const updateProductBody = z.object({
  name: productFields.name.optional(),
  description: productFields.description.optional(),
  price: productFields.price.optional(),
  tags: productFields.tags.optional(),
  images: z.array(existingImageReference).max(3).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, '수정할 필드가 없습니다.');

const articleFields = {
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(10_000),
  images: z.array(uploadedImagePath).max(3).optional(),
};

export const createArticleBody = z.object(articleFields).strict();
export const updateArticleBody = z.object({
  title: articleFields.title.optional(),
  content: articleFields.content.optional(),
  images: z.array(existingImageReference).max(3).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, '수정할 필드가 없습니다.');

export const commentBody = z.object({
  content: z.string().trim().min(1).max(1000),
}).strict();

export const commentsQuery = z.object({
  cursor: positiveId.optional(),
  limit: boundedPageSize.default(10),
}).strict();

export const oauthStartQuery = z.object({
  next: z.string().max(500).default(''),
}).strict();

export const oauthCallbackQuery = z.object({
  code: z.string().min(1).max(4096).optional(),
  error: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(4096),
}).passthrough().superRefine((value, context) => {
  if (Boolean(value.code) === Boolean(value.error)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['code'],
      message: 'OAuth 콜백에는 code 또는 error 중 하나만 필요합니다.',
    });
  }
});
