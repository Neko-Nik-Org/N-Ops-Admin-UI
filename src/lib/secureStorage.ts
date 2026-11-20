/*
 * Copyright (C) 2026 Neko Nik <nikhil@nekonik.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * version 3 along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 */
/**
 * Encrypted localStorage. Every value the app saves is stored as AES-GCM ciphertext
 * (`enc:v1:<base64 of iv + ciphertext>`), never as readable text.
 *
 * The key is made by the browser's Web Crypto as non-extractable and kept in IndexedDB: it can be
 * used to encrypt and decrypt on this origin, but its bytes can't be read out, not even by this
 * code. So a copy of the storage (devtools, a disk image, a browser-profile backup, an extension
 * reading localStorage) shows nothing useful. It does not protect against script running inside the
 * app itself (XSS), which can call decrypt like the app does. That is true of any in-browser scheme.
 *
 * Web Crypto is asynchronous but the app reads storage synchronously, so `initSecureStorage()` runs
 * once before the first render and decrypts everything into memory. After that, reads come from
 * memory and writes update memory at once, then reach localStorage encrypted a moment later.
 */

import { createJSONStorage } from 'jotai/utils'

const PREFIX = 'enc:v1:'
/** Only the app's own keys are managed; anything else in localStorage is left alone. */
const isAppKey = (key: string) => key.startsWith('nops')

const DB_NAME = 'nops-secure-storage'
const DB_STORE = 'keys'
const KEY_ID = 'local-storage'

let cryptoKey: CryptoKey | null = null
const cache = new Map<string, string>()
/** Bumped on every write, so a slow encryption can't overwrite a newer value (or a removal). */
const versions = new Map<string, number>()
const listeners = new Map<string, Set<(value: string | null) => void>>()

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0))

const newKey = () =>
  crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']) as Promise<CryptoKey>

/** Opens (or creates) the key database; null when IndexedDB is unavailable (e.g. some private modes). */
const openDb = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    try {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })

const idb = <T>(db: IDBDatabase, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> =>
  new Promise((resolve, reject) => {
    const request = run(db.transaction(DB_STORE, mode).objectStore(DB_STORE))
    request.onsuccess = () => resolve(request.result as T)
    request.onerror = () => reject(request.error)
  })

/**
 * This browser's storage key, created on first use. Without IndexedDB the key only lives for this
 * page load, so saved values can't be read after a reload: the app then starts from its defaults.
 */
const loadKey = async (): Promise<CryptoKey> => {
  const db = await openDb()
  if (!db) return newKey()
  try {
    const existing = await idb<CryptoKey | undefined>(db, 'readonly', (s) => s.get(KEY_ID))
    if (existing) return existing
    const key = await newKey()
    try {
      // `add` fails if another tab saved its key first; then everyone uses that one
      await idb(db, 'readwrite', (s) => s.add(key, KEY_ID))
      return key
    } catch {
      return (await idb<CryptoKey | undefined>(db, 'readonly', (s) => s.get(KEY_ID))) ?? key
    }
  } catch {
    return newKey()
  } finally {
    db.close()
  }
}

const encrypt = async (value: string): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey!, new TextEncoder().encode(value)))
  const out = new Uint8Array(iv.length + data.length)
  out.set(iv)
  out.set(data, iv.length)
  return PREFIX + toBase64(out)
}

/** The plain text of a stored value; null if it can't be decrypted (other key, tampered, corrupt). */
const decrypt = async (stored: string): Promise<string | null> => {
  try {
    const bytes = fromBase64(stored.slice(PREFIX.length))
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, cryptoKey!, bytes.slice(12))
    return new TextDecoder().decode(plain)
  } catch {
    return null
  }
}

const persist = (key: string, value: string | null) => {
  const version = (versions.get(key) ?? 0) + 1
  versions.set(key, version)
  try {
    if (value === null) return localStorage.removeItem(key)
  } catch {
    return
  }
  if (!cryptoKey) return
  void encrypt(value).then((cipher) => {
    if (versions.get(key) !== version) return // a newer write or a removal came first
    try {
      localStorage.setItem(key, cipher)
    } catch {
      // storage full or blocked: the value just won't survive a reload
    }
  })
}

const notify = (key: string, value: string | null) => listeners.get(key)?.forEach((callback) => callback(value))

/** Reads a value saved by another tab (it arrives encrypted through the `storage` event). */
const onOtherTab = (event: StorageEvent) => {
  const { key, newValue } = event
  if (event.storageArea !== localStorage || !key || !isAppKey(key)) return
  if (newValue === null) {
    cache.delete(key)
    return notify(key, null)
  }
  if (!newValue.startsWith(PREFIX)) return
  void decrypt(newValue).then((plain) => {
    if (plain === null) return
    cache.set(key, plain)
    notify(key, plain)
  })
}

let ready: Promise<void> | null = null

/**
 * Loads the key and decrypts every saved value into memory. Call once before rendering; later calls
 * return the same promise. Values saved by older versions as plain text are encrypted on the way.
 */
export const initSecureStorage = (): Promise<void> =>
  (ready ??= (async () => {
    try {
      cryptoKey = await loadKey()
    } catch {
      cryptoKey = null // no Web Crypto: nothing is saved, the app runs on defaults
    }
    let keys: string[] = []
    try {
      keys = Object.keys(localStorage).filter(isAppKey)
    } catch {
      return
    }
    await Promise.all(
      keys.map(async (key) => {
        const stored = localStorage.getItem(key)
        if (stored === null) return
        if (!stored.startsWith(PREFIX)) {
          // saved before encryption existed: keep it, and store it encrypted from now on
          cache.set(key, stored)
          return persist(key, stored)
        }
        const plain = cryptoKey ? await decrypt(stored) : null
        if (plain === null)
          localStorage.removeItem(key) // unreadable (key gone): start fresh
        else cache.set(key, plain)
      }),
    )
    window.addEventListener('storage', onOtherTab)
  })())

/**
 * Storage with the localStorage API (synchronous), backed by memory and encrypted localStorage.
 * Also implements jotai's `subscribe`, so atoms follow changes made in other tabs.
 */
export const secureStorage = {
  getItem: (key: string): string | null => cache.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    cache.set(key, value)
    persist(key, value)
  },
  removeItem: (key: string): void => {
    cache.delete(key)
    persist(key, null)
  },
  subscribe: (key: string, callback: (value: string | null) => void) => {
    const set = listeners.get(key) ?? new Set()
    set.add(callback)
    listeners.set(key, set)
    return () => set.delete(callback)
  },
}

/** jotai storage for `atomWithStorage`: JSON values kept in secureStorage. */
export const secureJSONStorage = <T>() => createJSONStorage<T>(() => secureStorage)

/** Tests only: forget everything in memory, so the next init reads localStorage afresh. */
export const resetSecureStorageForTests = () => {
  cache.clear()
  versions.clear()
  listeners.clear()
  if (typeof window !== 'undefined') window.removeEventListener('storage', onOtherTab)
  ready = null
  cryptoKey = null
}
