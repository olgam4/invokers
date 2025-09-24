/**
 * @file storage.ts
 * @description Storage command implementations for localStorage and sessionStorage
 */

import type { InvokerManager } from '../core';
import { createInvokerError, ErrorSeverity } from '../index';

interface StorageItem {
  value: any;
  expires?: number;
}

function isExpired(item: StorageItem): boolean {
  return item.expires ? Date.now() > item.expires : false;
}

function getStorage(storageType: string): Storage {
  if (storageType !== 'local' && storageType !== 'session') {
    throw createInvokerError(
      `Invalid storage type: ${storageType}. Must be 'local' or 'session'`,
      ErrorSeverity.ERROR
    );
  }
  return storageType === 'local' ? localStorage : sessionStorage;
}

function parseStorageItem(rawValue: string | null): StorageItem | null {
  if (!rawValue) return null;

  try {
    const item: StorageItem = JSON.parse(rawValue);
    if (isExpired(item)) {
      return null; // Treat expired items as non-existent
    }
    return item;
  } catch {
    // If not JSON, treat as plain string
    return { value: rawValue };
  }
}

function stringifyStorageItem(value: any, expires?: number): string {
  const item: StorageItem = { value };
  if (expires) {
    item.expires = expires;
  }
  return JSON.stringify(item);
}

export function registerStorageCommands(manager: InvokerManager): void {
  manager.register('--storage', ({ targetElement, params }) => {
    try {
      const storageType = params[0];
      const action = params[1];
      const key = params[2];
      const value = params.slice(3).join(':');

      const storage = getStorage(storageType);

      switch (action) {
        case 'set': {
          if (!key) {
            throw createInvokerError('Storage set requires a key', ErrorSeverity.ERROR);
          }
          let actualValue = value;
          if (!actualValue && targetElement) {
            // If no value provided in command, get from target element
            if (targetElement instanceof HTMLInputElement) {
              if (targetElement.type === 'checkbox') {
                actualValue = targetElement.checked.toString();
              } else {
                actualValue = targetElement.value;
              }
            } else {
              actualValue = targetElement.textContent || '';
            }
          }
           let expires: number | undefined;
           if (actualValue.startsWith('expires:')) {
             const expiresValue = parseInt(actualValue.split(':')[1]);
             // If expires value is small (< year 2286), treat as relative milliseconds from now
             // Otherwise, treat as absolute timestamp
             expires = expiresValue < 1e10 ? Date.now() + expiresValue : expiresValue;
             actualValue = actualValue.split(':').slice(2).join(':');
           }
           const finalValue = actualValue;
          storage.setItem(key, stringifyStorageItem(finalValue, expires));
          break;
        }

        case 'get': {
          if (!key) {
            throw createInvokerError('Storage get requires a key', ErrorSeverity.ERROR);
          }
          const item = parseStorageItem(storage.getItem(key));
          if (targetElement) {
            targetElement.textContent = item ? item.value : '';
          }
          break;
        }

        case 'remove': {
          if (!key) {
            throw createInvokerError('Storage remove requires a key', ErrorSeverity.ERROR);
          }
          storage.removeItem(key);
          break;
        }

        case 'clear': {
          storage.clear();
          break;
        }

        case 'keys': {
          const keys = Object.keys(storage);
          if (targetElement) {
            targetElement.textContent = keys.join(', ');
          }
          break;
        }

        case 'has': {
          if (!key) {
            throw createInvokerError('Storage has requires a key', ErrorSeverity.ERROR);
          }
          const item = parseStorageItem(storage.getItem(key));
          const hasKey = item !== null;
          if (targetElement) {
            targetElement.textContent = hasKey ? 'true' : 'false';
          }
          break;
        }

        case 'size': {
          let size = 0;
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key) {
              const item = parseStorageItem(storage.getItem(key));
              if (item) size++;
            }
          }
          if (targetElement) {
            targetElement.textContent = size.toString();
          }
          break;
        }

        default:
          throw createInvokerError(`Unknown storage action: ${action}`, ErrorSeverity.ERROR);
      }
    } catch (error) {
      if (error instanceof Error && 'severity' in error) {
        throw error; // Re-throw InvokerError
      }
      throw createInvokerError(
        `Storage operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorSeverity.ERROR
      );
    }
  });
}