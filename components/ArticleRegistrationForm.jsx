'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { createArticle, getArticle, patchArticle } from '@/lib/client-api';
import { getApiErrorMessage } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

function ArticleForm({ mode, articleId, initialValues }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === 'edit';
  const [values, setValues] = useState(initialValues);
  const submitMutation = useMutation({
    mutationFn: (payload) => isEdit
      ? patchArticle(articleId, payload)
      : createArticle(payload),
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
          submitMutation.mutate({ title: values.title.trim(), content: values.content.trim() });
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
          maxLength={50}
        />
      </label>

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
  const articleQuery = useQuery({
    queryKey: queryKeys.articles.detail(articleId),
    queryFn: () => getArticle(articleId),
    enabled: isEdit && Boolean(articleId),
    staleTime: 60_000,
  });

  if (isEdit && articleQuery.isPending) {
    return <p className="board-status">게시글을 불러오는 중입니다.</p>;
  }
  if (isEdit && articleQuery.isError) {
    return <p className="article-submit-error">{getApiErrorMessage(articleQuery.error, '게시글을 불러오지 못했습니다.')}</p>;
  }

  const initialValues = isEdit
    ? { title: articleQuery.data?.title || '', content: articleQuery.data?.content || '' }
    : { title: '', content: '' };

  return (
    <ArticleForm
      key={isEdit ? articleQuery.data?.id : 'create'}
      mode={mode}
      articleId={articleId}
      initialValues={initialValues}
    />
  );
}
