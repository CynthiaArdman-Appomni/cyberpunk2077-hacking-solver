import fs from 'fs';
import path from 'path';

const logFile = path.resolve(process.cwd(), 'app.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function write(prefix: string, message: string) {
  const timestamp = new Date().toISOString();
  logStream.write(`[${prefix}] ${timestamp} ${message}\n`);
}

export function log(message: string) {
  write('INFO', message);
}

export function logError(message: string, error?: unknown) {
  const errStr = error ? (error instanceof Error ? error.stack || error.message : String(error)) : '';
  write('ERROR', `${message}${errStr ? ' - ' + errStr : ''}`);
}
