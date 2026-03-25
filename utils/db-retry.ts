export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 100
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isDeadlock = error instanceof Error &&
        error.message.includes('Deadlock found');

      if (isDeadlock && attempt < maxRetries) {
        console.warn(`Deadlock détecté, retry ${attempt}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, delayMs * attempt));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries atteint');
}
