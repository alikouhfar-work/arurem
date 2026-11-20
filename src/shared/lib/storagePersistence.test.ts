import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  readPersistentStorage,
  requestPersistentStorage,
} from '@/shared/lib/storagePersistence';

const stubStorage = (value: Partial<StorageManager> | undefined) => {
  vi.stubGlobal('navigator', { ...navigator, storage: value });
};

describe('storagePersistence', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports unsupported when the API is absent, as in Safari', async () => {
    stubStorage(undefined);
    expect(await requestPersistentStorage()).toBe('unsupported');
    expect(await readPersistentStorage()).toBe('unsupported');
  });

  it('reports granted when the browser agrees', async () => {
    stubStorage({ persist: () => Promise.resolve(true) });
    expect(await requestPersistentStorage()).toBe('granted');
  });

  it('reports denied when the browser declines', async () => {
    stubStorage({ persist: () => Promise.resolve(false) });
    expect(await requestPersistentStorage()).toBe('denied');
  });

  it('reports denied when the request throws instead of propagating', async () => {
    stubStorage({ persist: () => Promise.reject(new Error('blocked')) });
    expect(await requestPersistentStorage()).toBe('denied');
  });

  it('reads a standing grant without prompting', async () => {
    stubStorage({ persisted: () => Promise.resolve(true) });
    expect(await readPersistentStorage()).toBe('granted');
  });

  it('reports unknown when nothing has been granted yet', async () => {
    stubStorage({ persisted: () => Promise.resolve(false) });
    expect(await readPersistentStorage()).toBe('unknown');
  });
});
