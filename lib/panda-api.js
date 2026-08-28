import { apiClient } from './api-client';

function normalizeWriter(writer, fallback = {}) {
  if (!writer && !fallback.writerId && !fallback.ownerId) return null;
  return {
    ...(writer || {}),
    id: writer?.id ?? fallback.writerId ?? fallback.ownerId ?? null,
    nickname: writer?.nickname ?? fallback.writerNickname ?? fallback.ownerNickname ?? '',
    image: writer?.image ?? fallback.writerImage ?? fallback.ownerImage ?? null,
  };
}

function normalizeComment(comment) {
  if (!comment) return null;
  return {
    ...comment,
    writer: normalizeWriter(comment.writer || comment.author, comment),
  };
}

function normalizeImages(resource) {
  const images = Array.isArray(resource?.images)
    ? resource.images
    : resource?.image ? [resource.image] : [];
  return [...new Set(images.filter((image) => typeof image === 'string' && image.trim()))];
}

function normalizeProduct(product) {
  if (!product) return null;
  const images = normalizeImages(product);
  return {
    ...product,
    image: images[0] || null,
    images,
    tags: Array.isArray(product.tags) ? product.tags : [],
    likeCount: Number(product.likeCount ?? product.favoriteCount ?? 0),
    isLiked: Boolean(product.isLiked ?? product.isFavorite),
    price: Number(product.price || 0),
    ownerId: product.ownerId ?? product.owner?.id ?? null,
    ownerNickname: product.ownerNickname ?? product.owner?.nickname ?? '',
    comments: Array.isArray(product.comments)
      ? product.comments.map(normalizeComment).filter(Boolean)
      : [],
  };
}

function normalizeArticle(article) {
  if (!article) return null;
  const images = normalizeImages(article);
  const writer = normalizeWriter(article.writer || article.owner, article);
  return {
    ...article,
    image: images[0] || null,
    images,
    likeCount: Number(article.likeCount ?? 0),
    isLiked: Boolean(article.isLiked),
    ownerId: article.ownerId ?? writer?.id ?? null,
    writer,
    comments: Array.isArray(article.comments)
      ? article.comments.map(normalizeComment).filter(Boolean)
      : [],
  };
}

function normalizeList(data, normalizeItem) {
  const source = Array.isArray(data) ? data : data?.list;
  const list = Array.isArray(source) ? source.map(normalizeItem).filter(Boolean) : [];
  return {
    ...(Array.isArray(data) ? {} : data),
    list,
    totalCount: Number(data?.totalCount ?? list.length),
  };
}

export const authApi = {
  async signIn(values) {
    const { data } = await apiClient.post('/auth/signin', values);
    return data;
  },
  async signUp(values) {
    const { data } = await apiClient.post('/auth/signup', values);
    return data;
  },
  async refresh(refreshToken = '') {
    const { data } = await apiClient.post('/auth/refresh', refreshToken ? { refreshToken } : {});
    return data;
  },
};

export const userApi = {
  async getMe() {
    const { data } = await apiClient.get('/users/me');
    return data;
  },
};

export const articleApi = {
  async getList({ page = 1, pageSize = 5, keyword = '', orderBy = 'recent' } = {}) {
    const { data } = await apiClient.get('/articles', {
      params: { page, pageSize, orderBy, ...(keyword ? { keyword } : {}) },
    });
    return normalizeList(data, normalizeArticle);
  },
  async get(articleId) {
    const { data } = await apiClient.get(`/articles/${articleId}`);
    return normalizeArticle(data);
  },
  async create(values) {
    const { data } = await apiClient.post('/articles', values);
    return normalizeArticle(data);
  },
  async update(articleId, values) {
    const { data } = await apiClient.patch(`/articles/${articleId}`, values);
    return normalizeArticle(data);
  },
  async remove(articleId) {
    const { data } = await apiClient.delete(`/articles/${articleId}`);
    return data;
  },
  async like(articleId) {
    const { data } = await apiClient.post(`/articles/${articleId}/likes`);
    return normalizeArticle(data);
  },
  async unlike(articleId) {
    const { data } = await apiClient.delete(`/articles/${articleId}/likes`);
    return normalizeArticle(data);
  },
};

export const productApi = {
  async create(values) {
    const { data } = await apiClient.post('/products', values);
    return normalizeProduct(data);
  },
  async getList({ page = 1, pageSize = 15, keyword = '', orderBy = 'recent' } = {}) {
    const { data } = await apiClient.get('/products', {
      params: { page, pageSize, orderBy, ...(keyword ? { keyword } : {}) },
    });
    return normalizeList(data, normalizeProduct);
  },
  async getBest() {
    const { data } = await apiClient.get('/products/best');
    const normalized = normalizeList(data, normalizeProduct);
    return { ...normalized, list: normalized.list.slice(0, 4) };
  },
  async get(productId) {
    const { data } = await apiClient.get(`/products/${productId}`);
    return normalizeProduct(data);
  },
  async update(productId, values) {
    const { data } = await apiClient.patch(`/products/${productId}`, values);
    return normalizeProduct(data);
  },
  async remove(productId) {
    const { data } = await apiClient.delete(`/products/${productId}`);
    return data;
  },
  async like(productId) {
    const { data } = await apiClient.post(`/products/${productId}/likes`);
    return normalizeProduct(data);
  },
  async unlike(productId) {
    const { data } = await apiClient.delete(`/products/${productId}/likes`);
    return normalizeProduct(data);
  },
};

export const imageApi = {
  async upload(images) {
    const files = Array.isArray(images) ? images : [images];
    const formData = new FormData();
    files.filter(Boolean).forEach((image) => formData.append('images', image));
    const { data } = await apiClient.post('/uploads/images', formData);
    return {
      ...data,
      urls: Array.isArray(data?.urls) ? data.urls : [],
    };
  },
};

export const commentApi = {
  async getArticleComments(articleId, { cursor, limit = 3 } = {}) {
    const { data } = await apiClient.get(`/articles/${articleId}/comments`, {
      params: { limit, ...(cursor ? { cursor } : {}) },
    });
    return {
      ...data,
      list: Array.isArray(data.list) ? data.list.map(normalizeComment).filter(Boolean) : [],
      nextCursor: data.nextCursor || null,
    };
  },
  async createArticle(articleId, content) {
    const { data } = await apiClient.post(`/articles/${articleId}/comments`, { content });
    return normalizeComment(data);
  },
  async getProductComments(productId, { cursor, limit = 10 } = {}) {
    const { data } = await apiClient.get(`/products/${productId}/comments`, {
      params: { limit, ...(cursor ? { cursor } : {}) },
    });
    return {
      ...data,
      list: Array.isArray(data.list) ? data.list.map(normalizeComment).filter(Boolean) : [],
      nextCursor: data.nextCursor || null,
    };
  },
  async create(productId, content) {
    const { data } = await apiClient.post(`/products/${productId}/comments`, { content });
    return normalizeComment(data);
  },
  async update(commentId, content) {
    const { data } = await apiClient.patch(`/comments/${commentId}`, { content });
    return normalizeComment(data);
  },
  async remove(commentId) {
    const { data } = await apiClient.delete(`/comments/${commentId}`);
    return data;
  },
};
