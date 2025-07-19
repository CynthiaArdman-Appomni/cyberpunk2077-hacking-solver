let fs: typeof import('fs') | null = null;
let path: typeof import('path') | null = null;
let logStream: import('fs').WriteStream | null = null;

if (typeof process !== 'undefined' && !(process as any).browser) {
  try {
    fs = require('fs');
    path = require('path');
    const logFile = path.resolve(process.cwd(), 'app.log');
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
  } catch (error) {
    console.error(`Failed to open log file`, error);
  }
}

function write(prefix: string, message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${prefix}] ${timestamp} ${message}\n`;
  if (logStream) {
    logStream.write(line);
  } else {
    console.log(line.trim());
  }
}

export function log(message: string) {
  write('INFO', message);
}

export function logError(message: string, error?: unknown) {
  const errStr = error ? (error instanceof Error ? error.stack || error.message : String(error)) : '';
  write('ERROR', `${message}${errStr ? ' - ' + errStr : ''}`);
}
