// Previously this module attempted to write logs to a local `app.log` file when
// running in a Node.js environment. The file handling code has been removed to
// simplify logging and avoid filesystem dependencies in read‑only environments.
// Logs are now always written directly to the console.

// Keep the interface the same for modules that import `log` and `logError`,
// but simplify the implementation to just output to `console.log`.


function write(prefix: string, message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${prefix}] ${timestamp} ${message}`;
  console.log(line);
}

export function log(message: string) {
  write('INFO', message);
}

export function logError(message: string, error?: unknown) {
  const errStr = error ? (error instanceof Error ? error.stack || error.message : String(error)) : '';
  write('ERROR', `${message}${errStr ? ' - ' + errStr : ''}`);
}
