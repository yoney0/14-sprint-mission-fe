'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import ImagePicker, { resolveImageItemUrls } from './ImagePicker';
import useRequireAuth from '@/hooks/useRequireAuth';
import { getApiErrorMessage } from '@/lib/api-client';
import { productApi } from '@/lib/panda-api';
import { queryKeys } from '@/lib/query-keys';

const initialValues = { name: '', description: '', price: '' };

const rules = {
  name: {
    isValid: (value) => value.trim().length >= 1 && value.trim().length <= 30,
    message: '30자 이내로 입력해주세요',
  },
  description: {
    isValid: (value) => value.trim().length >= 10 && value.trim().length <= 1000,
    message: '10자 이상 1,000자 이내로 입력해주세요',
  },
  price: {
    isValid: (value) => value.trim().length >= 1 && /^\d+$/.test(value.trim()),
    message: '숫자로 입력해주세요',
  },
  tag: {
    isValid: (value) => value.trim().length >= 1 && value.trim().length <= 20,
    message: '20글자 이내로 입력해주세요',
  },
};

export default function ProductRegistrationForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const auth = useRequireAuth();
  const [values, setValues] = useState(initialValues);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [imageItems, setImageItems] = useState([]);
  const [touched, setTouched] = useState({});

  const validation = useMemo(() => {
    const errors = {
      name: values.name.trim() && !rules.name.isValid(values.name) ? rules.name.message : '',
      description: values.description.trim() && !rules.description.isValid(values.description)
        ? rules.description.message
        : '',
      price: values.price.trim() && !rules.price.isValid(values.price) ? rules.price.message : '',
      tagInput: tagInput.trim() && !rules.tag.isValid(tagInput) ? rules.tag.message : '',
      tags: !tags.length
        ? '태그를 1개 이상 입력해주세요'
        : tags.length > 10 ? '태그는 최대 10개까지 입력해주세요' : '',
    };
    const requiredFieldsFilled = Boolean(
      values.name.trim() && values.description.trim() && values.price.trim() && tags.length,
    );
    const isValid = requiredFieldsFilled
      && rules.name.isValid(values.name)
      && rules.description.isValid(values.description)
      && rules.price.isValid(values.price)
      && !errors.tagInput
      && tags.length <= 10;

    return { errors, requiredFieldsFilled, isValid };
  }, [tagInput, tags.length, values]);

  const visibleErrors = {
    name: touched.name ? validation.errors.name : '',
    description: touched.description ? validation.errors.description : '',
    price: touched.price ? validation.errors.price : '',
    tagInput: touched.tagInput ? validation.errors.tagInput : '',
    tags: touched.tags ? validation.errors.tags : '',
  };
  const isSubmitDisabled = !validation.requiredFieldsFilled || !validation.isValid;
  const createMutation = useMutation({
    mutationFn: async () => {
      const images = await resolveImageItemUrls(imageItems);
      return productApi.create({
        name: values.name.trim(),
        description: values.description.trim(),
        price: Number(values.price),
        tags,
        images,
      });
    },
    onSuccess(product) {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.setQueryData(queryKeys.products.detail(product.id), product);
      router.push('/items');
    },
  });

  const updateField = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }));
  };
  const touchField = (name) => () => {
    setTouched((current) => ({ ...current, [name]: true }));
  };

  function addTag() {
    const nextTag = tagInput.trim();
    setTouched((current) => ({ ...current, tagInput: true, tags: true }));
    if (!rules.tag.isValid(nextTag) || tags.includes(nextTag) || tags.length >= 10) return;
    setTags((current) => [...current, nextTag]);
    setTagInput('');
    setTouched((current) => ({ ...current, tagInput: false, tags: true }));
  }

  function handleTagKeyDown(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addTag();
  }

  if (auth.isCheckingAuth || (auth.isAuthenticated && auth.isPending)) return <div className="product-detail-state"><span className="loading-spinner" /> 로그인 상태를 확인하고 있습니다.</div>;
  if (!auth.isAuthenticated) return <div className="product-detail-state">로그인 페이지로 이동하고 있습니다.</div>;

  return (
    <form
      className="registration-form"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched({ name: true, description: true, price: true, tags: true });
        if (!isSubmitDisabled) createMutation.mutate();
      }}
      noValidate
    >
      <div className="registration-title-row">
        <h1>상품 등록하기</h1>
        <button
          className="registration-submit-button"
          type="submit"
          disabled={isSubmitDisabled || createMutation.isPending}
        >{createMutation.isPending ? '등록 중' : '등록'}</button>
      </div>

      <div className="registration-field">
        <span className="registration-label">상품 이미지</span>
        <ImagePicker
          items={imageItems}
          onChange={setImageItems}
          disabled={createMutation.isPending}
          label="상품 이미지"
        />
      </div>

      <label className="registration-field">
        <span className="registration-label">상품명</span>
        <input
          className={`registration-input ${visibleErrors.name ? 'is-error' : ''}`}
          name="name"
          type="text"
          value={values.name}
          onChange={updateField('name')}
          onBlur={touchField('name')}
          placeholder="상품명을 입력해주세요"
          maxLength={30}
        />
        {visibleErrors.name ? <span className="registration-error">{visibleErrors.name}</span> : null}
      </label>

      <label className="registration-field">
        <span className="registration-label">상품 소개</span>
        <textarea
          className={`registration-textarea ${visibleErrors.description ? 'is-error' : ''}`}
          name="description"
          value={values.description}
          onChange={updateField('description')}
          onBlur={touchField('description')}
          placeholder="상품 소개를 입력해주세요"
          maxLength={1000}
        />
        {visibleErrors.description ? <span className="registration-error">{visibleErrors.description}</span> : null}
      </label>

      <label className="registration-field">
        <span className="registration-label">판매가격</span>
        <input
          className={`registration-input ${visibleErrors.price ? 'is-error' : ''}`}
          name="price"
          type="text"
          inputMode="numeric"
          value={values.price}
          onChange={updateField('price')}
          onBlur={touchField('price')}
          placeholder="판매 가격을 입력해주세요"
        />
        {visibleErrors.price ? <span className="registration-error">{visibleErrors.price}</span> : null}
      </label>

      <div className="registration-field">
        <label className="registration-label" htmlFor="product-tag">태그</label>
        <input
          id="product-tag"
          className={`registration-input ${(visibleErrors.tagInput || visibleErrors.tags) ? 'is-error' : ''}`}
          type="text"
          value={tagInput}
          onChange={(event) => setTagInput(event.target.value)}
          onBlur={touchField('tagInput')}
          onKeyDown={handleTagKeyDown}
          placeholder="태그를 입력하고 Enter를 눌러주세요"
          maxLength={20}
        />
        {visibleErrors.tagInput ? <span className="registration-error">{visibleErrors.tagInput}</span> : null}
        {!visibleErrors.tagInput && visibleErrors.tags
          ? <span className="registration-error">{visibleErrors.tags}</span>
          : null}
        <div className="registration-tags" aria-label="입력된 태그">
          {tags.map((tag) => (
            <span className="registration-tag" key={tag}>
              #{tag}
              <button
                type="button"
                onClick={() => {
                  setTags((current) => current.filter((item) => item !== tag));
                  setTouched((current) => ({ ...current, tags: true }));
                }}
                aria-label={`${tag} 태그 삭제`}
              >×</button>
            </span>
          ))}
        </div>
      </div>

      {createMutation.isError ? (
        <p className="registration-submit-error">
          {getApiErrorMessage(createMutation.error, '상품 등록에 실패했습니다.')}
        </p>
      ) : null}
    </form>
  );
}
