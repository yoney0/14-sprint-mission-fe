import * as articleService from '../services/article-service.js';

export async function list(req, res) {
  res.status(200).json(await articleService.listArticles(req.validated.query, req.user?.id));
}

export async function get(req, res) {
  res.status(200).json(await articleService.getArticle(
    req.validated.params.articleId,
    req.user?.id,
  ));
}

export async function create(req, res) {
  const article = await articleService.createArticle(req.validated.body, req.user.id);
  res.status(201).json(article);
}

export async function update(req, res) {
  res.status(200).json(await articleService.updateArticle(
    req.validated.params.articleId,
    req.validated.body,
    req.user.id,
  ));
}

export async function remove(req, res) {
  await articleService.deleteArticle(req.validated.params.articleId, req.user.id);
  res.status(204).send();
}

export async function like(req, res) {
  res.status(200).json(await articleService.likeArticle(
    req.validated.params.articleId,
    req.user.id,
  ));
}

export async function unlike(req, res) {
  res.status(200).json(await articleService.unlikeArticle(
    req.validated.params.articleId,
    req.user.id,
  ));
}
