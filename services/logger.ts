import fs from 'fs';
import path from 'path';

const logFile = path.resolve(process.cwd(), 'app.log');
let logStream: fs.WriteStream | null = null;

try {
  logStream = fs.createWriteStream(logFile, { flags: 'a' });
} catch (error) {
  console.error(`Failed to open log file ${logFile}`, error);
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
