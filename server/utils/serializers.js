export function serializeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    image: user.image || null,
    emailVerifiedAt: user.emailVerifiedAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function serializeComment(comment) {
  const writer = comment.author ? {
    id: comment.author.id,
    nickname: comment.author.nickname,
    image: comment.author.image || null,
  } : null;

  return {
    id: comment.id,
    content: comment.content,
    writer,
    author: writer,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

export function serializeProduct(product) {
  const images = product.images?.map((item) => item.url) || [];
  if (!images.length && product.image) images.push(product.image);

  const commentsCount = Number(product._count?.comments || 0);
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    tags: product.tags || [],
    images,
    image: images[0] || null,
    likeCount: Number(product.likesCount ?? product._count?.likes ?? 0),
    favoriteCount: Number(product.likesCount ?? product._count?.likes ?? 0),
    isLiked: Boolean(product.likes?.length),
    isFavorite: Boolean(product.likes?.length),
    ownerId: product.ownerId,
    ownerNickname: product.owner?.nickname || null,
    owner: product.owner || null,
    commentsCount,
    ...(product.comments ? { comments: product.comments.map(serializeComment) } : {}),
    ...(product.comments ? { commentsTruncated: product.comments.length < commentsCount } : {}),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export function serializeArticle(article) {
  const images = article.images?.map((item) => item.url) || [];
  if (!images.length && article.image) images.push(article.image);

  const commentsCount = Number(article._count?.comments || 0);
  return {
    id: article.id,
    title: article.title,
    content: article.content,
    images,
    image: images[0] || null,
    likeCount: Number(article.likesCount ?? article._count?.likes ?? 0),
    isLiked: Boolean(article.likes?.length),
    ownerId: article.ownerId,
    ownerNickname: article.owner?.nickname || null,
    owner: article.owner || null,
    commentsCount,
    ...(article.comments ? { comments: article.comments.map(serializeComment) } : {}),
    ...(article.comments ? { commentsTruncated: article.comments.length < commentsCount } : {}),
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
  };
}
