'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import SafeImage from './SafeImage';
import ScrollTopButton from './ScrollTopButton';
import { getAccessToken } from '@/lib/auth-storage';
import { productApi } from '@/lib/panda-api';
import { queryKeys } from '@/lib/query-keys';

const PAGE_SIZE = 15;

function parsePage(value) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString('ko-KR')}원`;
}

function getPageNumbers(currentPage, totalPages) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
}

function ProductCard({ product, onPrefetch }) {
  return (
    <Link
      className="market-product-card-link"
      href={`/items/${product.id}`}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
    >
      <article className="market-product-card">
        <SafeImage className="market-product-card__image" src={product.image} alt={product.name} loading="lazy" />
        <div className="market-product-card__body">
          <h2 className="market-product-card__name">{product.name}</h2>
          <p className="market-product-card__price">{formatPrice(product.price)}</p>
          <p className="market-product-card__date">
            관심 {product.favoriteCount.toLocaleString('ko-KR')}
          </p>
        </div>
      </article>
    </Link>
  );
}

export default function ItemsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const page = parsePage(searchParams.get('page'));
  const keyword = searchParams.get('q')?.trim() || '';
  const orderBy = searchParams.get('orderBy') === 'favorite' ? 'favorite' : 'recent';
  const filters = useMemo(
    () => ({ page, pageSize: PAGE_SIZE, keyword, orderBy }),
    [keyword, orderBy, page],
  );
  const productsQuery = useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => productApi.getList(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const products = productsQuery.data || { list: [], totalCount: 0 };
  const totalPages = Math.max(1, Math.ceil(products.totalCount / PAGE_SIZE));

  useEffect(() => {
    if (!productsQuery.data || page >= totalPages) return;
    const nextFilters = { ...filters, page: page + 1 };
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.list(nextFilters),
      queryFn: () => productApi.getList(nextFilters),
      staleTime: 30_000,
    });
  }, [filters, page, productsQuery.data, queryClient, totalPages]);

  function navigate(next = {}) {
    const params = new URLSearchParams();
    const nextKeyword = next.keyword ?? keyword;
    const nextOrder = next.orderBy ?? orderBy;
    const nextPage = next.page ?? page;
    if (nextKeyword) params.set('q', nextKeyword);
    if (nextOrder !== 'recent') params.set('orderBy', nextOrder);
    if (nextPage > 1) params.set('page', String(nextPage));
    router.push(params.size ? `/items?${params}` : '/items');
  }

  function prefetchProduct(productId) {
    if (!getAccessToken()) return;
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.detail(productId),
      queryFn: () => productApi.get(productId),
      staleTime: 60_000,
    });
  }

  return (
    <div className="market-page" id="top">
      <div className="market-floating-panel">
        <div className="market-floating-controls" aria-label="상품 검색, 정렬과 등록">
          <form
            className="market-search-form"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              navigate({ keyword: String(formData.get('q') || '').trim(), page: 1 });
            }}
          >
            <label className="sr-only" htmlFor="product-search">상품 검색</label>
            <Search className="market-search-form__lucide" size={19} aria-hidden="true" />
            <input
              id="product-search"
              key={keyword}
              name="q"
              type="search"
              placeholder="검색할 상품을 입력해주세요"
              defaultValue={keyword}
              autoComplete="off"
            />
          </form>
          <select
            className="market-sort-select"
            value={orderBy}
            onChange={(event) => navigate({ orderBy: event.target.value, page: 1 })}
            aria-label="상품 정렬"
          >
            <option value="recent">최신순</option>
            <option value="favorite">좋아요순</option>
          </select>
          <Link className="market-register-button" href="/registration">상품 등록하기</Link>
        </div>
        <ScrollTopButton />
      </div>
      <div className="market-desktop-scroll-slot"><ScrollTopButton /></div>

      <main className="market-main">
        <section className="market-section market-sale-section" aria-labelledby="sale-title">
          <div className="market-sale-toolbar">
            <h1 id="sale-title" className="market-section-title">판매 중인 상품</h1>
          </div>

          {productsQuery.isPending ? (
            <div className="market-query-state" role="status"><span className="loading-spinner" /> 상품을 불러오는 중입니다.</div>
          ) : productsQuery.isError ? (
            <div className="market-query-state is-error" role="alert">
              <p>{productsQuery.error?.response?.data?.message || '상품을 불러오지 못했습니다.'}</p>
              <button type="button" onClick={() => productsQuery.refetch()}>다시 시도</button>
            </div>
          ) : (
            <>
              <p className="market-product-status" aria-live="polite">
                {products.totalCount ? `총 ${products.totalCount.toLocaleString('ko-KR')}개 상품` : '검색 결과가 없습니다.'}
                {productsQuery.isFetching ? ' · 업데이트 중' : ''}
              </p>
              <div className="market-product-grid market-products-grid">
                {products.list.map((product) => (
                  <ProductCard key={product.id} product={product} onPrefetch={() => prefetchProduct(product.id)} />
                ))}
              </div>
              <nav className="market-pagination" aria-label="상품 목록 페이지">
                <button type="button" disabled={page <= 1} onClick={() => navigate({ page: page - 1 })} aria-label="이전 페이지">
                  <ChevronLeft size={19} />
                </button>
                {getPageNumbers(Math.min(page, totalPages), totalPages).map((pageNumber) => (
                  <button
                    type="button"
                    key={pageNumber}
                    className={pageNumber === page ? 'is-active' : ''}
                    onClick={() => navigate({ page: pageNumber })}
                    aria-current={pageNumber === page ? 'page' : undefined}
                  >{pageNumber}</button>
                ))}
                <button type="button" disabled={page >= totalPages} onClick={() => navigate({ page: page + 1 })} aria-label="다음 페이지">
                  <ChevronRight size={19} />
                </button>
              </nav>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
