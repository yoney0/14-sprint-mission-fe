'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Heart, MoreVertical, Pencil, Trash2, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import AlertModal from './AlertModal';
import MessageModal from './MessageModal';
import SafeImage from './SafeImage';
import useRequireAuth from '@/hooks/useRequireAuth';
import { getApiErrorMessage } from '@/lib/api-client';
import { commentApi, productApi } from '@/lib/panda-api';
import { queryKeys } from '@/lib/query-keys';

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString('ko-KR')}원`;
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

function ProductEditForm({ product, onCancel, onSave, isPending }) {
  const [values, setValues] = useState({
    name: product.name,
    price: String(product.price),
    description: product.description,
    tags: product.tags.join(', '),
    images: product.images.join(', '),
  });

  function update(name) {
    return (event) => setValues((current) => ({ ...current, [name]: event.target.value }));
  }

  return (
    <form
      className="product-edit-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          name: values.name.trim(),
          price: Number(values.price),
          description: values.description.trim(),
          tags: values.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          images: values.images.split(',').map((image) => image.trim()).filter(Boolean),
        });
      }}
    >
      <label>상품명<input value={values.name} onChange={update('name')} maxLength={30} required /></label>
      <label>가격<input value={values.price} onChange={update('price')} type="number" min="0" required /></label>
      <label>상품 설명<textarea value={values.description} onChange={update('description')} required /></label>
      <label>태그 <small>쉼표로 구분</small><input value={values.tags} onChange={update('tags')} required /></label>
      <label>이미지 URL <small>쉼표로 구분</small><input value={values.images} onChange={update('images')} type="url" required /></label>
      <div className="product-edit-form__actions">
        <button type="button" onClick={onCancel} disabled={isPending}>취소</button>
        <button className="is-primary" type="submit" disabled={isPending}>{isPending ? '저장 중' : '저장'}</button>
      </div>
    </form>
  );
}

function ProductComments({ productId, currentUser }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState('');
  const commentsKey = queryKeys.products.comments(productId);
  const commentsQuery = useQuery({
    queryKey: commentsKey,
    queryFn: () => commentApi.getProductComments(productId, { limit: 100 }),
    staleTime: 30_000,
  });
  const invalidateComments = () => queryClient.invalidateQueries({ queryKey: commentsKey });
  const createMutation = useMutation({
    mutationFn: () => commentApi.create(productId, content.trim()),
    onSuccess() { setContent(''); invalidateComments(); },
    onError(error) { setMessage(getApiErrorMessage(error, '댓글을 등록하지 못했습니다.')); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ commentId, value }) => commentApi.update(commentId, value),
    onSuccess() { setEditingId(null); invalidateComments(); },
    onError(error) { setMessage(getApiErrorMessage(error, '댓글을 수정하지 못했습니다.')); },
  });
  const deleteMutation = useMutation({
    mutationFn: commentApi.remove,
    onSuccess() { setDeleteTarget(null); invalidateComments(); },
    onError(error) { setMessage(getApiErrorMessage(error, '댓글을 삭제하지 못했습니다.')); },
  });

  return (
    <section className="product-comments" aria-labelledby="comments-title">
      <h2 id="comments-title">상품 문의</h2>
      <form
        className="product-comment-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (content.trim()) createMutation.mutate();
        }}
      >
        <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="문의 내용을 입력해주세요" />
        <button type="submit" disabled={!content.trim() || createMutation.isPending}>
          {createMutation.isPending ? '등록 중' : '등록'}
        </button>
      </form>

      {commentsQuery.isPending ? (
        <div className="product-comment-state" role="status"><span className="loading-spinner" /> 댓글을 불러오는 중입니다.</div>
      ) : commentsQuery.isError ? (
        <div className="product-comment-state is-error" role="alert">
          댓글을 불러오지 못했습니다. <button type="button" onClick={() => commentsQuery.refetch()}>다시 시도</button>
        </div>
      ) : commentsQuery.data.list.length ? (
        <ul className="product-comment-list">
          {commentsQuery.data.list.map((comment) => {
            const isMine = currentUser?.id === comment.writer?.id;
            return (
              <li key={comment.id}>
                <div className="product-comment__avatar">
                  {comment.writer?.image ? <SafeImage src={comment.writer.image} alt="" /> : <UserRound size={19} />}
                </div>
                <div className="product-comment__body">
                  <div className="product-comment__meta">
                    <strong>{comment.writer?.nickname || '사용자'}</strong>
                    <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
                  </div>
                  {editingId === comment.id ? (
                    <form
                      className="product-comment-edit"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (editingContent.trim()) updateMutation.mutate({ commentId: comment.id, value: editingContent.trim() });
                      }}
                    >
                      <textarea value={editingContent} onChange={(event) => setEditingContent(event.target.value)} />
                      <div><button type="button" onClick={() => setEditingId(null)}>취소</button><button type="submit">저장</button></div>
                    </form>
                  ) : <p>{comment.content}</p>}
                </div>
                {isMine && editingId !== comment.id ? (
                  <div className="product-comment__actions">
                    <button
                      type="button"
                      title="댓글 수정"
                      onClick={() => { setEditingId(comment.id); setEditingContent(comment.content); }}
                    ><Pencil size={17} /><span className="sr-only">댓글 수정</span></button>
                    <button type="button" title="댓글 삭제" onClick={() => setDeleteTarget(comment)}>
                      <Trash2 size={17} /><span className="sr-only">댓글 삭제</span>
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : <p className="product-comment-empty">아직 문의가 없습니다. 첫 문의를 남겨보세요.</p>}

      <AlertModal
        isOpen={Boolean(deleteTarget)}
        title="댓글을 삭제할까요?"
        message="삭제한 댓글은 복구할 수 없습니다."
        variant="danger"
        confirmLabel="삭제"
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
      />
      <MessageModal message={message} onClose={() => setMessage('')} />
    </section>
  );
}

export default function ProductDetailClient({ productId }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const auth = useRequireAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState('');
  const productKey = queryKeys.products.detail(productId);
  const productQuery = useQuery({
    queryKey: productKey,
    queryFn: () => productApi.get(productId),
    enabled: auth.isAuthenticated,
    staleTime: 60_000,
  });
  const product = productQuery.data;
  const isOwner = useMemo(() => auth.data?.id === product?.ownerId, [auth.data?.id, product?.ownerId]);
  const refreshProduct = () => {
    queryClient.invalidateQueries({ queryKey: productKey });
    queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
  };
  const updateMutation = useMutation({
    mutationFn: (values) => productApi.update(productId, values),
    onSuccess(data) { queryClient.setQueryData(productKey, data); setEditing(false); refreshProduct(); },
    onError(error) { setMessage(getApiErrorMessage(error, '상품을 수정하지 못했습니다.')); },
  });
  const deleteMutation = useMutation({
    mutationFn: () => productApi.remove(productId),
    onSuccess() { queryClient.removeQueries({ queryKey: productKey }); router.replace('/items'); },
    onError(error) { setMessage(getApiErrorMessage(error, '상품을 삭제하지 못했습니다.')); },
  });
  const favoriteMutation = useMutation({
    mutationFn: () => product.isFavorite ? productApi.unfavorite(productId) : productApi.favorite(productId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: productKey });
      const previous = queryClient.getQueryData(productKey);
      queryClient.setQueryData(productKey, (current) => current ? {
        ...current,
        isFavorite: !current.isFavorite,
        favoriteCount: Math.max(0, current.favoriteCount + (current.isFavorite ? -1 : 1)),
      } : current);
      return { previous };
    },
    onError(error, _values, context) {
      queryClient.setQueryData(productKey, context?.previous);
      setMessage(getApiErrorMessage(error, '좋아요 상태를 변경하지 못했습니다.'));
    },
    onSettled: refreshProduct,
  });

  if (auth.isCheckingAuth || (auth.isAuthenticated && productQuery.isPending)) {
    return <main className="product-detail-main"><div className="product-detail-state"><span className="loading-spinner" /> 상품을 불러오는 중입니다.</div></main>;
  }
  if (!auth.isAuthenticated) return <main className="product-detail-main"><div className="product-detail-state">로그인 페이지로 이동하고 있습니다.</div></main>;
  if (productQuery.isError) {
    return (
      <main className="product-detail-main"><div className="product-detail-state is-error">
        <p>{getApiErrorMessage(productQuery.error, '상품을 불러오지 못했습니다.')}</p>
        <button type="button" onClick={() => productQuery.refetch()}>다시 시도</button>
        <Link href="/items">목록으로 돌아가기</Link>
      </div></main>
    );
  }

  return (
    <main className="product-detail-main">
      <Link className="product-back-link" href="/items"><ArrowLeft size={19} /> 목록으로 돌아가기</Link>
      <article className="product-detail">
        <div className="product-detail__image-wrap"><SafeImage src={product.image} alt={product.name} /></div>
        <div className="product-detail__content">
          <div className="product-detail__topline">
            <p className="product-detail__date">{formatDate(product.createdAt)}</p>
            {isOwner ? (
              <div className="product-action-menu-wrap">
                <button type="button" className="product-more-button" onClick={() => setMenuOpen((open) => !open)} title="상품 메뉴">
                  <MoreVertical size={22} /><span className="sr-only">상품 메뉴</span>
                </button>
                {menuOpen ? (
                  <div className="product-action-menu">
                    <button type="button" onClick={() => { setEditing(true); setMenuOpen(false); }}><Pencil size={16} /> 수정하기</button>
                    <button type="button" onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}><Trash2 size={16} /> 삭제하기</button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          {editing ? (
            <ProductEditForm product={product} onCancel={() => setEditing(false)} onSave={updateMutation.mutate} isPending={updateMutation.isPending} />
          ) : (
            <>
              <h1>{product.name}</h1>
              <p className="product-detail__price">{formatPrice(product.price)}</p>
              <div className="product-detail__seller"><UserRound size={18} /> {product.ownerNickname || '판매자'}</div>
              <p className="product-detail__description">{product.description}</p>
              {product.tags.length ? <div className="product-detail__tags">{product.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div> : null}
              <button
                type="button"
                className={`product-favorite-button ${product.isFavorite ? 'is-active' : ''}`}
                onClick={() => favoriteMutation.mutate()}
                disabled={favoriteMutation.isPending}
                aria-pressed={Boolean(product.isFavorite)}
              >
                <Heart size={21} fill={product.isFavorite ? 'currentColor' : 'none'} /> 관심 {product.favoriteCount.toLocaleString('ko-KR')}
              </button>
            </>
          )}
        </div>
      </article>

      <ProductComments productId={productId} currentUser={auth.data} />

      <AlertModal
        isOpen={confirmDelete}
        title="상품을 삭제할까요?"
        message="삭제한 상품과 댓글은 복구할 수 없습니다."
        variant="danger"
        confirmLabel="삭제"
        isPending={deleteMutation.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
      <MessageModal message={message} onClose={() => setMessage('')} />
    </main>
  );
}
