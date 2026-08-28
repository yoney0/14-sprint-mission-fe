import prisma from '../config/prisma.js';
import AppError from '../errors/AppError.js';
import { serializeComment } from '../utils/serializers.js';
import { commentSelect } from './selectors.js';

const parentByType = {
  product: { model: 'product', foreignKey: 'productId', label: '상품' },
  article: { model: 'article', foreignKey: 'articleId', label: '게시글' },
};

function parentConfig(type) {
  const config = parentByType[type];
  if (!config) throw new AppError(400, '댓글 대상이 올바르지 않습니다.');
  return config;
}

async function ensureParent(type, parentId) {
  const config = parentConfig(type);
  const parent = await prisma[config.model].findUnique({
    where: { id: parentId },
    select: { id: true },
  });
  if (!parent) throw new AppError(404, `${config.label}을 찾을 수 없습니다.`, { code: 'PARENT_NOT_FOUND' });
  return config;
}

export async function listComments(type, parentId, { cursor, limit }) {
  const config = await ensureParent(type, parentId);
  const rows = await prisma.comment.findMany({
    where: { [config.foreignKey]: parentId },
    orderBy: { id: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: commentSelect,
  });
  const list = rows.slice(0, limit);
  return {
    list: list.map(serializeComment),
    nextCursor: rows.length > limit ? list.at(-1).id : null,
  };
}

export async function createComment(type, parentId, content, userId) {
  const config = await ensureParent(type, parentId);
  const comment = await prisma.comment.create({
    data: {
      content,
      authorId: userId,
      [config.foreignKey]: parentId,
    },
    select: commentSelect,
  });
  return serializeComment(comment);
}

async function ensureOwnedComment(commentId, userId) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true },
  });
  if (!comment) throw new AppError(404, '댓글을 찾을 수 없습니다.', { code: 'COMMENT_NOT_FOUND' });
  if (comment.authorId !== userId) {
    throw new AppError(403, '댓글을 등록한 사용자만 변경할 수 있습니다.', { code: 'FORBIDDEN' });
  }
}

export async function updateComment(commentId, content, userId) {
  await ensureOwnedComment(commentId, userId);
  const comment = await prisma.comment.update({
    where: { id: commentId },
    data: { content },
    select: commentSelect,
  });
  return serializeComment(comment);
}

export async function deleteComment(commentId, userId) {
  await ensureOwnedComment(commentId, userId);
  await prisma.comment.delete({ where: { id: commentId } });
}
