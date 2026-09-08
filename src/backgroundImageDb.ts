// A user-picked background image is stored here as a Blob rather than as a
// base64 data URL in localStorage: localStorage has to hold the whole thing
// as UTF-16 text under a shared ~5MB quota, which is what forced the old 3MB
// upload cap. IndexedDB stores the bytes directly and its quota is typically
// hundreds of MB or more, so a full-resolution photo fits comfortably.

import { useState, useEffect } from 'react'

const DB_NAME = 'myhomepage.background'
const STORE = 'images'
// Single fixed key: only one device-picked background is ever kept at a time.
const KEY = 'current'

// Stored in `Settings.backgroundImage` in place of a real URL to mean "show
// the blob in IndexedDB" — see the field's doc comment in types.ts.
export const DEVICE_BACKGROUND_IMAGE = 'device:background-image'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

export async function getBackgroundImageBlob(): Promise<Blob | null> {
  const result = await withStore('readonly', (store) => store.get(KEY))
  return result instanceof Blob ? result : null
}

export async function setBackgroundImageBlob(blob: Blob): Promise<void> {
  await withStore('readwrite', (store) => store.put(blob, KEY))
}

export async function clearBackgroundImageBlob(): Promise<void> {
  await withStore('readwrite', (store) => store.delete(KEY))
}

/**
 * Resolve a `Settings.backgroundImage` value into something a `<div
 * style={{backgroundImage}}>` can use directly: an http(s) URL is returned
 * as-is, and the device sentinel resolves to a fresh object URL pointing at
 * the IndexedDB blob (or '' if none is stored, e.g. it was cleared in
 * another tab).
 *
 * Exposed as a hook because the object URL must be revoked when it's no
 * longer displayed — otherwise the blob it pins stays alive for the page's
 * lifetime.
 */
export function useResolvedBackgroundImage(backgroundImage: string): string {
  const [resolved, setResolved] = useState('')

  useEffect(() => {
    if (backgroundImage !== DEVICE_BACKGROUND_IMAGE) {
      setResolved(backgroundImage)
      return
    }

    let objectUrl = ''
    let cancelled = false
    getBackgroundImageBlob().then((blob) => {
      if (cancelled) return
      if (blob) {
        objectUrl = URL.createObjectURL(blob)
        setResolved(objectUrl)
      } else {
        setResolved('')
      }
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [backgroundImage])

  return resolved
}
