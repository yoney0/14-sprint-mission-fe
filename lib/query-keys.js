export const queryKeys = {
  user: ['user', 'me'],
  articles: {
    all: ['articles'],
    list: (filters) => ['articles', 'list', filters],
    detail: (articleId) => ['articles', 'detail', String(articleId)],
    comments: (articleId) => ['articles', 'comments', String(articleId)],
  },
  products: {
    all: ['products'],
    best: ['products', 'best'],
    list: (filters) => ['products', 'list', filters],
    detail: (productId) => ['products', 'detail', String(productId)],
    comments: (productId) => ['products', 'comments', String(productId)],
  },
};

export function invalidateViewerScopedQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.articles.all });
}
