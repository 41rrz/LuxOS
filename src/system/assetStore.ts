const DB_NAME = 'luxos-desktop-storage'
const STORE_NAME = 'assets'
const DB_VERSION = 1
const ASSET_EVENT = 'luxos:asset-change'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened.'))
  })
}

export async function putAsset(key: string, value: string) {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Asset could not be stored.'))
  })
  db.close()
  window.dispatchEvent(new CustomEvent(ASSET_EVENT, { detail: key }))
}

export async function getAsset(key: string): Promise<string | null> {
  const db = await openDb()
  const result = await new Promise<string | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(key)
    request.onsuccess = () => resolve(request.result as string | undefined)
    request.onerror = () => reject(request.error ?? new Error('Asset could not be read.'))
  })
  db.close()
  return result ?? null
}

export async function deleteAsset(key: string) {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Asset could not be deleted.'))
  })
  db.close()
  window.dispatchEvent(new CustomEvent(ASSET_EVENT, { detail: key }))
}

export async function clearAssets() {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Assets could not be cleared.'))
  })
  db.close()
  window.dispatchEvent(new CustomEvent(ASSET_EVENT))
}

export function subscribeAssets(callback: (key?: string) => void) {
  const handler = (event: Event) => callback((event as CustomEvent<string | undefined>).detail)
  window.addEventListener(ASSET_EVENT, handler)
  return () => window.removeEventListener(ASSET_EVENT, handler)
}
