import { apiClient } from './api-client';

function normalizeProduct(product) {
  if (!product) return null;
  const images = Array.isArray(product.images) ? product.images : [];
  return {
    ...product,
    image: images[0] || null,
    images,
    tags: Array.isArray(product.tags) ? product.tags : [],
    favoriteCount: Number(product.favoriteCount || 0),
    price: Number(product.price || 0),
  };
}

export const authApi = {
  async signIn(values) {
    const { data } = await apiClient.post('/auth/signIn', values);
    return data;
  },
  async signUp(values) {
    const { data } = await apiClient.post('/auth/signUp', values);
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
    return {
      ...data,
      list: Array.isArray(data.list) ? data.list : [],
      totalCount: Number(data.totalCount || 0),
    };
  },
  async get(articleId) {
    const { data } = await apiClient.get(`/articles/${articleId}`);
    return data;
  },
  async create(values) {
    const { data } = await apiClient.post('/articles', values);
    return data;
  },
  async update(articleId, values) {
    const { data } = await apiClient.patch(`/articles/${articleId}`, values);
    return data;
  },
  async remove(articleId) {
    const { data } = await apiClient.delete(`/articles/${articleId}`);
    return data;
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
    return {
      ...data,
      list: Array.isArray(data.list) ? data.list.map(normalizeProduct) : [],
      totalCount: Number(data.totalCount || 0),
    };
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
  async favorite(productId) {
    const { data } = await apiClient.post(`/products/${productId}/favorite`);
    return normalizeProduct(data);
  },
  async unfavorite(productId) {
    const { data } = await apiClient.delete(`/products/${productId}/favorite`);
    return normalizeProduct(data);
  },
};

export const imageApi = {
  async upload(image) {
    const formData = new FormData();
    formData.append('image', image);
    const { data } = await apiClient.post('/images/upload', formData);
    return data;
  },
};

export const commentApi = {
  async getArticleComments(articleId, { cursor, limit = 3 } = {}) {
    const { data } = await apiClient.get(`/articles/${articleId}/comments`, {
      params: { limit, ...(cursor ? { cursor } : {}) },
    });
    return {
      ...data,
      list: Array.isArray(data.list) ? data.list : [],
      nextCursor: data.nextCursor || null,
    };
  },
  async createArticle(articleId, content) {
    const { data } = await apiClient.post(`/articles/${articleId}/comments`, { content });
    return data;
  },
  async getProductComments(productId, { cursor, limit = 10 } = {}) {
    const { data } = await apiClient.get(`/products/${productId}/comments`, {
      params: { limit, ...(cursor ? { cursor } : {}) },
    });
    return {
      ...data,
      list: Array.isArray(data.list) ? data.list : [],
      nextCursor: data.nextCursor || null,
    };
  },
  async create(productId, content) {
    const { data } = await apiClient.post(`/products/${productId}/comments`, { content });
    return data;
  },
  async update(commentId, content) {
    const { data } = await apiClient.patch(`/comments/${commentId}`, { content });
    return data;
  },
  async remove(commentId) {
    const { data } = await apiClient.delete(`/comments/${commentId}`);
    return data;
  },
};
