export function getPagination({ page = 1, pageSize = 15 } = {}) {
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function clampBestLimit(limit = 4) {
  return Math.min(Math.max(Number(limit) || 4, 1), 4);
}
