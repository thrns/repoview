import { isViewerAuthorizationFailure } from './client-authorization'

export type CachedViewerFile<T> = T | Promise<T>

/**
 * Private viewer content may be cached only behind a fresh authorization
 * check. The cache never exposes entries directly to navigation callers.
 */
export class ViewerFileCache<T> {
  private readonly entries = new Map<string, CachedViewerFile<T>>()

  has(key: string) {
    return this.entries.has(key)
  }

  seed(key: string, value: T) {
    if (!this.entries.has(key)) {
      this.entries.set(key, value)
    }
  }

  async navigate(
    key: string,
    authorize: () => Promise<void>,
    load: () => Promise<T>,
  ): Promise<T> {
    const cached = this.entries.get(key)
    if (cached !== undefined) {
      try {
        // Resolve before revalidating so an in-flight prefetch cannot outlive
        // the authorization check that protects its eventual display.
        const value = await cached
        await authorize()
        return value
      } catch (error) {
        if (isViewerAuthorizationFailure(error)) {
          this.clear()
        }
        throw error
      }
    }

    const request = load()
    this.entries.set(key, request)
    try {
      return await request
    } catch (error) {
      if (isViewerAuthorizationFailure(error)) {
        this.clear()
      } else if (this.entries.get(key) === request) {
        this.entries.delete(key)
      }
      throw error
    }
  }

  async prefetch(key: string, load: () => Promise<T>) {
    if (this.entries.has(key)) return

    const request = load()
    this.entries.set(key, request)
    try {
      await request
    } catch (error) {
      if (isViewerAuthorizationFailure(error)) {
        this.clear()
      } else if (this.entries.get(key) === request) {
        this.entries.delete(key)
      }
      throw error
    }
  }

  clear() {
    this.entries.clear()
  }
}
