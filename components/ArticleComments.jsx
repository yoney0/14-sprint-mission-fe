'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  createArticleComment,
  deleteComment,
  getArticleComments,
  patchComment,
} from '@/lib/client-api';
import { getApiErrorMessage } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import AlertMessage from './AlertMessage';
import AlertModal from './AlertModal';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function CommentItem({
  comment,
  isMenuOpen,
  isEditing,
  isBusy,
  canManage,
  onToggleMenu,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}) {
  const [editValue, setEditValue] = useState(comment.content);

  return (
    <article className={`article-comment-item ${isEditing ? 'is-editing' : ''}`}>
      {isEditing ? (
        <form
          className="article-comment-edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSaveEdit(editValue.trim());
          }}
        >
          <textarea
            value={editValue}
            onChange={(event) => setEditValue(event.target.value)}
            aria-label="댓글 수정 내용"
            maxLength={1000}
            autoFocus
          />
          <div className="article-comment-edit-actions">
            <button type="button" onClick={onCancelEdit}>취소</button>
            <button type="submit" className="is-primary" disabled={!editValue.trim() || isBusy}>
              {isBusy ? '수정 중' : '수정 완료'}
            </button>
          </div>
        </form>
      ) : (
        <>
          {canManage ? <div className="article-menu-wrap">
            <button
              type="button"
              className="article-more-button"
              aria-label="댓글 메뉴"
              aria-expanded={isMenuOpen}
              onClick={onToggleMenu}
            >⋮</button>
            {isMenuOpen ? (
              <div className="article-action-menu" role="menu">
                <button type="button" role="menuitem" onClick={onStartEdit}>수정하기</button>
                <button type="button" role="menuitem" onClick={onDelete} disabled={isBusy}>삭제하기</button>
              </div>
            ) : null}
          </div> : null}
          <p>{comment.content}</p>
        </>
      )}
      <div className="article-comment-meta">
        <span className="board-avatar" aria-hidden="true" />
        <span>{comment.writer?.nickname || '판다마켓 사용자'}</span>
        <time>{formatDate(comment.createdAt)}</time>
      </div>
    </article>
  );
}

function hasSameId(left, right) {
  return left != null && right != null && String(left) === String(right);
}

export default function ArticleComments({ articleId, currentUser, isAuthenticated, initialComments = [] }) {
  const queryClient = useQueryClient();
  const [commentValue, setCommentValue] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteNotice, setDeleteNotice] = useState('');
  const commentsKey = queryKeys.articles.comments(articleId);
  const commentsQuery = useInfiniteQuery({
    queryKey: commentsKey,
    queryFn: ({ pageParam }) => getArticleComments(articleId, { cursor: pageParam, pageSize: 3 }),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    placeholderData: initialComments.length ? {
      pages: [{ list: initialComments, nextCursor: null }],
      pageParams: [''],
    } : undefined,
    staleTime: 30_000,
  });
  const comments = useMemo(
    () => commentsQuery.data?.pages.flatMap((page) => page.list || []) || [],
    [commentsQuery.data?.pages],
  );
  const refreshComments = () => queryClient.invalidateQueries({ queryKey: commentsKey });
  const createMutation = useMutation({
    mutationFn: (content) => createArticleComment(articleId, content),
    onSuccess() { setCommentValue(''); refreshComments(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ commentId, content }) => patchComment(commentId, content),
    onSuccess() { setEditingId(null); refreshComments(); },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess() {
      setOpenMenuId(null);
      setDeleteTargetId(null);
      setDeleteNotice('댓글이 삭제되었습니다.');
      refreshComments();
    },
  });
  const busyId = updateMutation.isPending
    ? updateMutation.variables?.commentId
    : deleteMutation.isPending ? deleteMutation.variables : null;
  const requestError = commentsQuery.error || createMutation.error || updateMutation.error || deleteMutation.error;
  const error = requestError ? getApiErrorMessage(requestError, '댓글 요청을 처리하지 못했습니다.') : '';

  const isSubmitDisabled = useMemo(
    () => !commentValue.trim() || createMutation.isPending,
    [commentValue, createMutation.isPending],
  );

  function submitComment(event) {
    event.preventDefault();
    if (isSubmitDisabled) return;
    createMutation.mutate(commentValue.trim());
  }

  function saveComment(commentId, content) {
    if (!content) return;
    updateMutation.mutate({ commentId, content });
  }

  useEffect(() => {
    if (!deleteNotice) return undefined;
    const timerId = window.setTimeout(() => setDeleteNotice(''), 2500);
    return () => window.clearTimeout(timerId);
  }, [deleteNotice]);

  function removeComment() {
    const commentId = deleteTargetId;
    if (!commentId) return;
    deleteMutation.mutate(commentId);
  }

  return (
    <>
      <section className="article-comment-section" aria-labelledby="comment-title">
        <h2 id="comment-title">댓글달기</h2>
        {isAuthenticated ? (
          <form className="article-comment-form" onSubmit={submitComment}>
            <textarea
              value={commentValue}
              onChange={(event) => setCommentValue(event.target.value)}
              placeholder="댓글을 입력해주세요."
              maxLength={1000}
            />
            <button type="submit" disabled={isSubmitDisabled}>
              {createMutation.isPending ? '등록 중' : '등록'}
            </button>
          </form>
        ) : (
          <p className="article-comment-login"><Link href={`/signin?next=${encodeURIComponent(`/free-board/${articleId}`)}`}>로그인</Link> 후 댓글을 작성할 수 있습니다.</p>
        )}
        {error ? <p className="article-submit-error" role="alert">{error}</p> : null}
      </section>

      <section className="article-comments" aria-label="댓글 목록">
        {commentsQuery.isPending ? <p className="board-status">댓글을 불러오는 중입니다.</p> : null}
        {!commentsQuery.isPending && comments.length ? (
          <>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isMenuOpen={openMenuId === comment.id}
                isEditing={editingId === comment.id}
                isBusy={busyId === comment.id}
                canManage={hasSameId(currentUser?.id, comment.writer?.id)}
                onToggleMenu={() => setOpenMenuId((current) => current === comment.id ? null : comment.id)}
                onStartEdit={() => {
                  setEditingId(comment.id);
                  setOpenMenuId(null);
                }}
                onCancelEdit={() => setEditingId(null)}
                onSaveEdit={(content) => saveComment(comment.id, content)}
                onDelete={() => {
                  setOpenMenuId(null);
                  setDeleteTargetId(comment.id);
                }}
              />
            ))}
            {commentsQuery.hasNextPage ? (
              <button
                className="article-load-more"
                type="button"
                disabled={commentsQuery.isFetchingNextPage}
                onClick={() => commentsQuery.fetchNextPage()}
              >
                {commentsQuery.isFetchingNextPage ? '불러오는 중' : '댓글 더보기'}
              </button>
            ) : null}
          </>
        ) : null}
        {!commentsQuery.isPending && !comments.length ? (
          <div className="article-empty-comments">
            <div className="article-empty-comments__icon" aria-hidden="true" />
            <p>아직 댓글이 없어요,<br />지금 댓글을 달아보세요!</p>
          </div>
        ) : null}
      </section>

      <AlertMessage
        message={deleteNotice}
        variant="success"
        onClose={() => setDeleteNotice('')}
      />

      <AlertModal
        isOpen={Boolean(deleteTargetId)}
        title="댓글을 삭제하시겠어요?"
        message="삭제한 댓글은 다시 복구할 수 없습니다."
        variant="danger"
        confirmLabel="삭제"
        isPending={busyId === deleteTargetId}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={removeComment}
      />
    </>
  );
}
