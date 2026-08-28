'use client';

import { useState } from 'react';
import { imageApi } from '@/lib/panda-api';

export const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
let imageItemSequence = 0;

function nextImageItemId(prefix) {
  imageItemSequence += 1;
  return `${prefix}-${imageItemSequence}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.addEventListener('error', () => reject(new Error('이미지를 읽지 못했습니다.')));
    reader.readAsDataURL(file);
  });
}

export function createImageItems(urls = [], prefix = 'saved-image') {
  return [...new Set(urls.filter(Boolean))].slice(0, MAX_IMAGES).map((url) => ({
    id: nextImageItemId(prefix),
    file: null,
    name: '',
    preview: url,
    url,
  }));
}

export async function resolveImageItemUrls(items) {
  const fileItems = items.filter((item) => item.file);
  let uploadedUrls = [];

  if (fileItems.length) {
    const result = await imageApi.upload(fileItems.map((item) => item.file));
    uploadedUrls = result.urls;
    if (uploadedUrls.length !== fileItems.length) {
      throw new Error('일부 이미지를 업로드하지 못했습니다. 다시 시도해주세요.');
    }
  }

  let uploadIndex = 0;
  return items.map((item) => {
    if (!item.file) return item.url;
    const url = uploadedUrls[uploadIndex];
    uploadIndex += 1;
    return url;
  }).filter(Boolean);
}

export default function ImagePicker({
  items,
  onChange,
  disabled = false,
  label = '이미지',
  maxImages = MAX_IMAGES,
}) {
  const [error, setError] = useState('');
  const remainingCount = Math.max(0, maxImages - items.length);

  async function addImages(event) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    setError('');
    if (!selectedFiles.length || !remainingCount) return;

    const acceptedFiles = [];
    let validationMessage = '';

    for (const file of selectedFiles) {
      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
        validationMessage = 'JPG, PNG, WEBP, GIF 이미지만 등록할 수 있습니다.';
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        validationMessage = '이미지는 한 장당 5MB 이하로 등록해주세요.';
        continue;
      }
      acceptedFiles.push(file);
    }

    if (acceptedFiles.length > remainingCount) {
      validationMessage = `이미지는 최대 ${maxImages}개까지 등록할 수 있습니다.`;
    }

    try {
      const nextItems = await Promise.all(acceptedFiles.slice(0, remainingCount).map(async (file) => ({
        id: nextImageItemId('new-image'),
        file,
        name: file.name,
        preview: await readFileAsDataUrl(file),
        url: '',
      })));
      onChange([...items, ...nextItems]);
      setError(validationMessage);
    } catch (readError) {
      setError(readError.message);
    }
  }

  return (
    <div className="image-picker">
      <div className="image-picker__grid">
        {remainingCount ? (
          <label className={`image-picker__upload ${disabled ? 'is-disabled' : ''}`}>
            <span className="image-picker__plus" aria-hidden="true">+</span>
            <span>이미지 등록</span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
              multiple
              disabled={disabled}
              onChange={addImages}
              aria-label={`${label} 파일 선택`}
            />
          </label>
        ) : null}

        {items.map((item, index) => (
          <figure className="image-picker__preview" key={item.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.preview} alt={`${label} 미리보기 ${index + 1}`} />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(items.filter((candidate) => candidate.id !== item.id))}
              aria-label={`${label} ${index + 1} 삭제`}
            >×</button>
            {item.name ? <figcaption>{item.name}</figcaption> : null}
          </figure>
        ))}
      </div>
      <p className="image-picker__hint">이미지는 최대 {maxImages}개, 한 장당 5MB까지 등록할 수 있습니다. ({items.length}/{maxImages})</p>
      {error ? <p className="image-picker__error" role="alert">{error}</p> : null}
    </div>
  );
}
