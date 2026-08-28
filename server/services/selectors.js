const userSummarySelect = {
  id: true,
  nickname: true,
  image: true,
};

export const commentSelect = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: { select: userSummarySelect },
};

export function productSelect(userId, { includeComments = false } = {}) {
  return {
    id: true,
    name: true,
    description: true,
    price: true,
    tags: true,
    image: true,
    likesCount: true,
    ownerId: true,
    createdAt: true,
    updatedAt: true,
    owner: { select: userSummarySelect },
    images: {
      select: { url: true, position: true },
      orderBy: { position: 'asc' },
    },
    _count: { select: { likes: true, comments: true } },
    ...(userId ? {
      likes: { where: { userId }, select: { userId: true } },
    } : {}),
    ...(includeComments ? {
      comments: {
        select: commentSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 100,
      },
    } : {}),
  };
}

export function articleSelect(userId, { includeComments = false } = {}) {
  return {
    id: true,
    title: true,
    content: true,
    image: true,
    likesCount: true,
    ownerId: true,
    createdAt: true,
    updatedAt: true,
    owner: { select: userSummarySelect },
    images: {
      select: { url: true, position: true },
      orderBy: { position: 'asc' },
    },
    _count: { select: { likes: true, comments: true } },
    ...(userId ? {
      likes: { where: { userId }, select: { userId: true } },
    } : {}),
    ...(includeComments ? {
      comments: {
        select: commentSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 100,
      },
    } : {}),
  };
}
