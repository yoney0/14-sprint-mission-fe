import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';

const email = String(process.env.SEED_USER_EMAIL || 'demo@panda.local').trim().toLowerCase();
const password = process.env.SEED_USER_PASSWORD
  || (process.env.NODE_ENV === 'production' ? '' : 'PandaDemo123!');

if (!password) {
  throw new Error('운영 환경에서 시드하려면 SEED_USER_PASSWORD를 설정해야 합니다.');
}

async function seed() {
  const encryptedPassword = await bcrypt.hash(password, 12);
  const emailVerifiedAt = new Date();
  const owner = await prisma.user.upsert({
    where: { email },
    update: { nickname: '판다 판매자', encryptedPassword, emailVerifiedAt },
    create: {
      email,
      nickname: '판다 판매자',
      encryptedPassword,
      emailVerifiedAt,
    },
  });

  if (await prisma.product.count() === 0) {
    await prisma.product.create({
      data: {
        name: '맥북',
        description: '상태 좋은 맥북을 판매합니다.',
        price: 1_200_000,
        tags: ['노트북', '전자'],
        image: '/images/Img_home_01.png',
        ownerId: owner.id,
        images: { create: [{ url: '/images/Img_home_01.png', position: 0 }] },
        comments: {
          create: [
            { content: '제품 상태 사진을 더 볼 수 있을까요?', authorId: owner.id },
            { content: '혹시 직거래 가능할까요?', authorId: owner.id },
          ],
        },
      },
    });
  }

  if (await prisma.article.count() === 0) {
    await prisma.article.create({
      data: {
        title: '중고 거래할 때 확인할 점 공유합니다',
        content: '직거래 장소와 제품 상태, 구성품을 꼭 확인해보세요.',
        image: '/images/Img_home_02.png',
        ownerId: owner.id,
        images: { create: [{ url: '/images/Img_home_02.png', position: 0 }] },
        comments: {
          create: [{ content: '좋은 정보 감사합니다.', authorId: owner.id }],
        },
      },
    });
  }

  console.log(`Seed completed for ${email}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
