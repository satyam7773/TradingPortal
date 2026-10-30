import { TokenManager } from '../services/apiClient'

/**
 * Enhanced fetch wrapper that automatically adds Bearer token to all requests
 * Drop-in replacement for fetch() with automatic authentication
 * 
 * Usage:
 *   const response = await authFetch(url, { method: 'POST', ... })
 *   // Token is automatically added to Authorization header
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get token from TokenManager
  const token = TokenManager.getToken()

  // Clone options to avoid mutating original
  const finalOptions = { ...options }

  // Initialize headers if not present
  if (!finalOptions.headers) {
    finalOptions.headers = {}
  }

  // Convert headers to object if it's Headers instance
  const headers = new Map<string, string>()
  if (finalOptions.headers instanceof Headers) {
    finalOptions.headers.forEach((value, key) => {
      headers.set(key, value)
    })
  } else if (typeof finalOptions.headers === 'object') {
    Object.entries(finalOptions.headers).forEach(([key, value]) => {
      headers.set(key, String(value))
    })
  }

  // Add Bearer token if available
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // Ensure Content-Type is set for POST/PUT/PATCH requests
  // BUT: Don't set it for FormData - let browser handle it automatically with multipart/form-data
  if (
    (finalOptions.method === 'POST' ||
      finalOptions.method === 'PUT' ||
      finalOptions.method === 'PATCH') &&
    !headers.has('Content-Type') &&
    !(finalOptions.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json')
  }

  // Convert map back to object for fetch
  finalOptions.headers = Object.fromEntries(headers)

  console.log(`🔐 authFetch [${finalOptions.method || 'GET'}] ${url}`, {
    hasToken: !!token,
    headers: Object.fromEntries(
      Object.entries(finalOptions.headers as Record<string, string>).map(
        ([k, v]) => [k, k === 'Authorization' ? '***' : v]
      )
    ),
  })

  // Make the fetch request
  const response = await fetch(url, finalOptions)

  // Log response status
  if (!response.ok) {
    console.warn(
      `⚠️ authFetch response not ok: ${response.status} ${response.statusText}`
    )
  }

  return response
}

/**
 * Convenience method for POST requests with automatic token
 */
export async function authFetchPost(
  url: string,
  data: any,
  options: Omit<RequestInit, 'method' | 'body'> = {}
): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Convenience method for PUT requests with automatic token
 */
export async function authFetchPut(
  url: string,
  data: any,
  options: Omit<RequestInit, 'method' | 'body'> = {}
): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Convenience method for DELETE requests with automatic token
 */
export async function authFetchDelete(
  url: string,
  options: Omit<RequestInit, 'method'> = {}
): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: 'DELETE',
  })
}

/**
 * CENTRALIZED ERROR HANDLER for all authFetch responses
 * 
 * Checks for:
 * 1. 403 status code + responseMessage → Display responseMessage (permission denied)
 * 2. Any error status + responseMessage → Display responseMessage
 * 3. Otherwise → Display generic error or fallback message
 * 
 * Usage in components:
 *   const { status, data, error } = await handleAuthResponse(response)
 *   if (error) {
 *     showError(error)  // Shows responseMessage if available, else default
 *   } else {
 *     // use data
 *   }
 */
export async function handleAuthResponse(response: Response): Promise<{
  status: number
  data: any
  error?: string
}> {
  let data: any = null
  
  try {
    data = await response.json()
  } catch {
    // If response is not JSON, use statusText
    data = {}
  }

  // Priority 1: Check for 403 Forbidden with responseMessage (investor permission denied)
  if (response.status === 403 && data?.responseMessage) {
    return {
      status: response.status,
      data,
      error: data.responseMessage,
    }
  }

  // Priority 2: Check for any error status with responseMessage
  if (!response.ok && data?.responseMessage) {
    return {
      status: response.status,
      data,
      error: data.responseMessage,
    }
  }

  // Priority 3: Check for error status with 'message' field (fallback)
  if (!response.ok && data?.message) {
    return {
      status: response.status,
      data,
      error: data.message,
    }
  }

  // Priority 4: If not ok but no message, use statusText
  if (!response.ok) {
    return {
      status: response.status,
      data,
      error: response.statusText || 'An error occurred',
    }
  }

  // Success case
  return {
    status: response.status,
    data,
  }
}

export default authFetch
