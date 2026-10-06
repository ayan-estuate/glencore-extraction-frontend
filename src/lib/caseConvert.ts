/**
 * The backend (Python/FastAPI + Pydantic) serializes JSON with snake_case field
 * names (job_id, original_filename, ...). The rest of this frontend is written
 * against camelCase (jobId, originalFilename, ...). Rather than touching every
 * consumer, these converters run once at the axios boundary in apiClient.ts.
 */

function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function camelToSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function convertKeys(value: unknown, convertKey: (key: string) => string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => convertKeys(item, convertKey));
  }
  if (value !== null && typeof value === "object" && value.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[convertKey(key)] = convertKeys(val, convertKey);
    }
    return result;
  }
  return value;
}

export function keysToCamel<T = unknown>(value: unknown): T {
  return convertKeys(value, snakeToCamelKey) as T;
}

export function keysToSnake<T = unknown>(value: unknown): T {
  return convertKeys(value, camelToSnakeKey) as T;
}
