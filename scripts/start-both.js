import { spawn } from 'child_process';
import process from 'process';

console.log('====================================================');
console.log(' Starting Unitel Dual-Portal Architecture ');
console.log('----------------------------------------------------');
console.log(' Portal 1: Applicant Portal        -> http://localhost:5173');
console.log(' Portal 2: Approver & Admin Portal -> http://localhost:5174');
console.log(' Shared DB: data/shared_db.json + Live Real-Time SSE');
console.log('====================================================\n');

const isWin = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';

// Spawn Applicant Portal on Port 5173
const applicantProc = spawn(npxCmd, ['vite', '--port', '5173', '--strictPort'], {
  shell: true,
  env: { ...process.env, PORT: '5173' },
});

// Spawn Approver & Admin Portal on Port 5174
const approverProc = spawn(npxCmd, ['vite', '--port', '5174', '--strictPort'], {
  shell: true,
  env: { ...process.env, PORT: '5174' },
});

applicantProc.stdout?.on('data', (data) => {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (line.trim()) {
      console.log('\x1b[33m[Applicant 5173]\x1b[0m ' + line.trimEnd());
    }
  }
});

applicantProc.stderr?.on('data', (data) => {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (line.trim()) {
      console.error('\x1b[31m[Applicant 5173 ERR]\x1b[0m ' + line.trimEnd());
    }
  }
});

approverProc.stdout?.on('data', (data) => {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (line.trim()) {
      console.log('\x1b[36m[Approver 5174]\x1b[0m ' + line.trimEnd());
    }
  }
});

approverProc.stderr?.on('data', (data) => {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (line.trim()) {
      console.error('\x1b[31m[Approver 5174 ERR]\x1b[0m ' + line.trimEnd());
    }
  }
});

function cleanup() {
  console.log('\nShutting down both Unitel portal servers...');
  try {
    applicantProc.kill();
  } catch {}
  try {
    approverProc.kill();
  } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
