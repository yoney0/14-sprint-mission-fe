'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Heart, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import SafeImage from './SafeImage';
import ScrollTopButton from './ScrollTopButton';
import { getApiErrorMessage } from '@/lib/api-client';
import { productApi } from '@/lib/panda-api';
import { queryKeys } from '@/lib/query-keys';

const PAGE_SIZE = 15;
const BEST_PRODUCT_COUNT = 4;
const SORT_OPTIONS = [
  { value: 'recent', label: '최신순' },
  { value: 'like', label: '좋아요순' },
];

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
          <h3 className="market-product-card__name">{product.name}</h3>
          <p className="market-product-card__price">{formatPrice(product.price)}</p>
          <p
            className="market-product-card__likes"
            aria-label={`좋아요 ${Number(product.likeCount || 0).toLocaleString('ko-KR')}개`}
          >
            <Heart size={13} strokeWidth={1.8} aria-hidden="true" />
            <span>{Number(product.likeCount || 0).toLocaleString('ko-KR')}</span>
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
  const orderBy = searchParams.get('orderBy') === 'like' ? 'like' : 'recent';
  const [isSortOpen, setIsSortOpen] = useState(false);
  const filters = useMemo(
    () => ({ page, pageSize: PAGE_SIZE, keyword, orderBy }),
    [keyword, orderBy, page],
  );
  const bestProductsQuery = useQuery({
    queryKey: queryKeys.products.best,
    queryFn: productApi.getBest,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const productsQuery = useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => productApi.getList(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const bestProducts = bestProductsQuery.data?.list || [];
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

  useEffect(() => {
    if (!isSortOpen) return undefined;

    function closeSortOptions(event) {
      if (event.key === 'Escape') setIsSortOpen(false);
    }

    window.addEventListener('keydown', closeSortOptions);
    return () => window.removeEventListener('keydown', closeSortOptions);
  }, [isSortOpen]);

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
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.detail(productId),
      queryFn: () => productApi.get(productId),
      staleTime: 60_000,
    });
  }

  return (
    <div className="market-page" id="top">
      <ScrollTopButton />

      <main className="market-main">
        <section className="market-section market-best-section" aria-labelledby="best-title">
          <h1 id="best-title" className="market-section-title">베스트 상품</h1>
          {bestProductsQuery.isPending ? (
            <div className="market-product-grid market-best-grid" aria-label="베스트 상품을 불러오는 중">
              {Array.from({ length: BEST_PRODUCT_COUNT }, (_, index) => (
                <article className="market-product-card is-loading" aria-hidden="true" key={index}>
                  <div className="market-product-card__image" />
                  <div className="market-product-card__body">
                    <div className="market-product-card__name">불러오는 중</div>
                  </div>
                </article>
              ))}
            </div>
          ) : bestProductsQuery.isError ? (
            <div className="market-query-state is-error" role="alert">
              <p>{getApiErrorMessage(bestProductsQuery.error, '베스트 상품을 불러오지 못했습니다.')}</p>
              <button type="button" onClick={() => bestProductsQuery.refetch()}>다시 시도</button>
            </div>
          ) : bestProducts.length ? (
            <div className="market-product-grid market-best-grid">
              {bestProducts.map((product) => (
                <ProductCard key={product.id} product={product} onPrefetch={() => prefetchProduct(product.id)} />
              ))}
            </div>
          ) : (
            <p className="market-product-status">베스트 상품이 없습니다.</p>
          )}
        </section>

        <section className="market-section market-sale-section" aria-labelledby="sale-title">
          <div className="market-sale-toolbar" aria-label="상품 검색, 정렬과 등록">
            <div className="market-sale-heading-row">
              <h2 id="sale-title" className="market-section-title">판매 중인 상품</h2>
              <Link className="market-register-button" href="/registration">상품 등록하기</Link>
            </div>
            <div className="market-sale-actions">
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
              <div className={`market-sort-control ${isSortOpen ? 'is-open' : ''}`}>
                <button
                  className="market-sort-trigger"
                  type="button"
                  aria-label="상품 정렬"
                  aria-expanded={isSortOpen}
                  aria-controls="product-sort-options"
                  onClick={() => setIsSortOpen((open) => !open)}
                >
                  <span>{SORT_OPTIONS.find((option) => option.value === orderBy)?.label}</span>
                  <span className="market-sort-chevron" aria-hidden="true" />
                </button>
                {isSortOpen ? (
                  <div id="product-sort-options" className="market-sort-options" aria-label="상품 정렬 방식 선택">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        className={option.value === orderBy ? 'is-selected' : ''}
                        type="button"
                        key={option.value}
                        aria-pressed={option.value === orderBy}
                        onClick={() => {
                          setIsSortOpen(false);
                          navigate({ orderBy: option.value, page: 1 });
                        }}
                      >
                        <span>{option.label}</span>
                        <span className="market-sort-check" aria-hidden="true">
                          {option.value === orderBy ? '✓' : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {productsQuery.isPending ? (
            <div className="market-query-state" role="status"><span className="loading-spinner" /> 상품을 불러오는 중입니다.</div>
          ) : productsQuery.isError ? (
            <div className="market-query-state is-error" role="alert">
              <p>{getApiErrorMessage(productsQuery.error, '상품을 불러오지 못했습니다.')}</p>
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
