/**
 * Crypto utilities
 */

import { createHash, randomBytes } from 'crypto';

export function generateId(length: number = 16): string {
  return randomBytes(length).toString('hex');
}

export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function generateUUID(): string {
  // Simple UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
