import { articleApi, commentApi } from './panda-api';

export const getArticleList = articleApi.getList;
export const getArticle = articleApi.get;
export const createArticle = articleApi.create;
export const patchArticle = articleApi.update;
export const deleteArticle = articleApi.remove;
export const getArticleComments = (articleId, { cursor, pageSize } = {}) => (
  commentApi.getArticleComments(articleId, { cursor, limit: pageSize })
);
export const createArticleComment = commentApi.createArticle;
export const patchComment = commentApi.update;
export const deleteComment = commentApi.remove;
