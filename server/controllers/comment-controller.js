import * as commentService from '../services/comment-service.js';

export function parentCommentController(type, idField) {
  return {
    async list(req, res) {
      res.status(200).json(await commentService.listComments(
        type,
        req.validated.params[idField],
        req.validated.query,
      ));
    },
    async create(req, res) {
      const comment = await commentService.createComment(
        type,
        req.validated.params[idField],
        req.validated.body.content,
        req.user.id,
      );
      res.status(201).json(comment);
    },
  };
}

export async function update(req, res) {
  res.status(200).json(await commentService.updateComment(
    req.validated.params.commentId,
    req.validated.body.content,
    req.user.id,
  ));
}

export async function remove(req, res) {
  await commentService.deleteComment(req.validated.params.commentId, req.user.id);
  res.status(204).send();
}
