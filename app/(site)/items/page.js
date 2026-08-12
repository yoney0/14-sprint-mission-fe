import ItemsClient from '@/components/ItemsClient';

export const metadata = {
  title: '중고마켓',
  description: '판다마켓에서 판매 중인 중고 상품을 검색해 보세요.',
};

export default function ItemsPage() {
  return <ItemsClient />;
}
