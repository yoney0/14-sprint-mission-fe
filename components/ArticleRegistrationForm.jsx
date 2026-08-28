'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import ImagePicker, { createImageItems, resolveImageItemUrls } from './ImagePicker';
import useRequireAuth from '@/hooks/useRequireAuth';
import { createArticle, getArticle, patchArticle } from '@/lib/client-api';
import { getApiErrorMessage } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

function ArticleForm({ mode, articleId, initialValues }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === 'edit';
  const [values, setValues] = useState(initialValues);
  const [imageItems, setImageItems] = useState(() => createImageItems(initialValues.images, 'article-image'));
  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      const images = await resolveImageItemUrls(payload.imageItems);
      const requestBody = { title: payload.title, content: payload.content, images };
      return isEdit
        ? patchArticle(articleId, requestBody)
        : createArticle(requestBody);
    },
    onSuccess(article) {
      queryClient.setQueryData(queryKeys.articles.detail(article.id), article);
      queryClient.invalidateQueries({ queryKey: queryKeys.articles.all });
      router.push(`/free-board/${article.id}`);
    },
  });
  const isSubmitDisabled = useMemo(
    () => !values.title.trim() || !values.content.trim() || submitMutation.isPending,
    [submitMutation.isPending, values.content, values.title],
  );

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  return (
    <form
      className="article-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isSubmitDisabled) {
          submitMutation.mutate({
            title: values.title.trim(),
            content: values.content.trim(),
            imageItems,
          });
        }
      }}
    >
      <div className="article-form-title-row">
        <h1>{isEdit ? '게시글 수정' : '게시글 쓰기'}</h1>
        <button className="article-submit-button" type="submit" disabled={isSubmitDisabled}>
          {submitMutation.isPending ? '처리 중' : isEdit ? '수정 완료' : '등록'}
        </button>
      </div>

      <label className="article-form-field">
        <span>*제목</span>
        <input
          name="title"
          type="text"
          value={values.title}
          onChange={updateField}
          placeholder="제목을 입력해주세요"
          maxLength={100}
        />
      </label>

      <div className="article-form-field article-form-image-field">
        <span>이미지</span>
        <ImagePicker
          items={imageItems}
          onChange={setImageItems}
          disabled={submitMutation.isPending}
          label="게시글 이미지"
        />
      </div>

      <label className="article-form-field">
        <span>*내용</span>
        <textarea
          name="content"
          value={values.content}
          onChange={updateField}
          placeholder="내용을 입력해주세요"
        />
      </label>

      {submitMutation.isError ? (
        <p className="article-submit-error" role="alert">
          {getApiErrorMessage(submitMutation.error, `게시글 ${isEdit ? '수정' : '등록'}에 실패했습니다.`)}
        </p>
      ) : null}
    </form>
  );
}

export default function ArticleRegistrationForm({ mode = 'create', articleId = '' }) {
  const isEdit = mode === 'edit';
  const auth = useRequireAuth();
  const articleQuery = useQuery({
    queryKey: queryKeys.articles.detail(articleId),
    queryFn: () => getArticle(articleId),
    enabled: isEdit && Boolean(articleId) && auth.isAuthenticated,
    staleTime: 60_000,
  });

  if (auth.isCheckingAuth || (auth.isAuthenticated && auth.isPending)) {
    return <p className="board-status">로그인 상태를 확인하고 있습니다.</p>;
  }
  if (!auth.isAuthenticated) {
    return <p className="board-status">로그인 페이지로 이동하고 있습니다.</p>;
  }
  if (isEdit && articleQuery.isPending) {
    return <p className="board-status">게시글을 불러오는 중입니다.</p>;
  }
  if (isEdit && articleQuery.isError) {
    return <p className="article-submit-error">{getApiErrorMessage(articleQuery.error, '게시글을 불러오지 못했습니다.')}</p>;
  }
  if (isEdit && String(articleQuery.data?.ownerId) !== String(auth.data?.id)) {
    return <p className="article-submit-error" role="alert">게시글 작성자만 수정할 수 있습니다.</p>;
  }

  const initialValues = isEdit
    ? {
      title: articleQuery.data?.title || '',
      content: articleQuery.data?.content || '',
      images: articleQuery.data?.images || [],
    }
    : { title: '', content: '', images: [] };

  return (
    <ArticleForm
      key={isEdit ? articleQuery.data?.id : 'create'}
      mode={mode}
      articleId={articleId}
      initialValues={initialValues}
    />
  );
}
