import ArticleDetailView from '@/components/ArticleDetailView';

export const metadata = { title: '게시글 상세' };

export default async function ArticleDetailPage({ params }) {
  const { articleId } = await params;
  return <ArticleDetailView articleId={articleId} />;
}
