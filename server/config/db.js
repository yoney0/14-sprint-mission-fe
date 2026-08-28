// Compatibility entry point for older server imports. Prisma is now the
// canonical database client; new code should import from ./prisma.js directly.
export { prisma, prisma as default } from './prisma.js';
