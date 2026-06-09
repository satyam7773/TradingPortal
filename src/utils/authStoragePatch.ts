const SESSION_ONLY_KEYS = new Set(['auth_token', 'refresh_token', 'userData'])

export const installSessionScopedAuthStorage = () => {
  if (typeof window === 'undefined' || (window as any).__AB_QUOTES_AUTH_STORAGE_PATCHED) {
    return
  }

  const storageProto = Storage.prototype
  const originalGetItem = storageProto.getItem
  const originalSetItem = storageProto.setItem
  const originalRemoveItem = storageProto.removeItem

  storageProto.getItem = function (key: string) {
    if (SESSION_ONLY_KEYS.has(key)) {
      return originalGetItem.call(sessionStorage, key)
    }

    return originalGetItem.call(this, key)
  }

  storageProto.setItem = function (key: string, value: string) {
    if (SESSION_ONLY_KEYS.has(key)) {
      originalSetItem.call(sessionStorage, key, value)
      return
    }

    return originalSetItem.call(this, key, value)
  }

  storageProto.removeItem = function (key: string) {
    if (SESSION_ONLY_KEYS.has(key)) {
      originalRemoveItem.call(sessionStorage, key)
      return
    }

    return originalRemoveItem.call(this, key)
  }

  ;(window as any).__AB_QUOTES_AUTH_STORAGE_PATCHED = true
}

installSessionScopedAuthStorage()
