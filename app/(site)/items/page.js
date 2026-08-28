import ItemsClient from '@/components/ItemsClient';
import { Suspense } from 'react';

export const metadata = {
  title: '중고마켓',
  description: '판다마켓에서 판매 중인 중고 상품을 검색해 보세요.',
};

export default function ItemsPage() {
  return (
    <Suspense fallback={<main className="market-main"><p className="market-product-status">상품을 불러오는 중입니다.</p></main>}>
      <ItemsClient />
    </Suspense>
  );
}
