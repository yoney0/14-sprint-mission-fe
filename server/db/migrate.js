import { spawn } from 'node:child_process';
import path from 'node:path';

const executable = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
const prismaBinary = path.join(process.cwd(), 'node_modules', '.bin', executable);
const child = spawn(prismaBinary, ['migrate', 'deploy'], { stdio: 'inherit' });

child.on('error', (error) => {
  console.error('Prisma CLI를 실행하지 못했습니다. 먼저 npm install을 실행하세요.', error.message);
  process.exitCode = 1;
});

child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
