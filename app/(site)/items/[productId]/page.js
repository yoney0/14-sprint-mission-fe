import ProductDetailClient from '@/components/ProductDetailClient';

export const metadata = {
  title: '상품 상세',
  description: '판다마켓 상품 정보와 댓글을 확인하세요.',
};

export default async function ProductDetailPage({ params }) {
  const { productId } = await params;
  return <ProductDetailClient productId={productId} />;
}
