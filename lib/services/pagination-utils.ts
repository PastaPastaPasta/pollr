/**
 * Pagination utilities for Dash Platform document queries.
 *
 * The SDK's startAfter cursor-based pagination requires:
 * - An orderBy clause on the query
 * - The last document's $id as the startAfter value
 *
 * This utility handles automatic pagination through complete result sets.
 */

import { normalizeSDKResponse } from './sdk-helpers';

export interface PaginateOptions {
  /** Maximum results to return (safety limit). Default: 1000 */
  maxResults?: number;
  /** Page size per query. Default: 100 */
  pageSize?: number;
}

export interface PaginateFetchResult<T> {
  documents: T[];
  /** True if we hit maxResults before exhausting all documents */
  reachedLimit: boolean;
}

// Use any for SDK type since EvoSDK has complex generic typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SDK = any;

/**
 * Map over items with a bounded number of requests in flight.
 *
 * Platform queries fan out to DAPI nodes, so issuing one per feed item at once invites rate
 * limiting and head-of-line stalls. Callers cap concurrency with this instead of `Promise.all`.
 * Results keep the input order; a rejection propagates like `Promise.all`.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workerCount = Math.min(Math.max(limit, 1), items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    for (let index = cursor++; index < items.length; index = cursor++) {
      results[index] = await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function paginateFetchAll<T>(
  sdk: SDK,
  queryBuilder: (startAfter?: string) => Record<string, unknown>,
  transformFn: (doc: Record<string, unknown>) => T,
  options: PaginateOptions = {}
): Promise<PaginateFetchResult<T>> {
  const { maxResults = 1000, pageSize = 100 } = options;

  const allDocuments: T[] = [];
  let startAfter: string | undefined = undefined;
  let reachedLimit = false;

  while (allDocuments.length < maxResults) {
    const query = queryBuilder(startAfter);
    query.limit = pageSize;
    if (startAfter) {
      query.startAfter = startAfter;
    }

    const response = await sdk.documents.query(query);
    const documents = normalizeSDKResponse(response);

    // Transform and collect documents
    allDocuments.push(...documents.map(transformFn));

    // Check if we've reached the end (fewer documents than requested)
    if (documents.length < pageSize) {
      break;
    }

    // Check if we've hit the safety limit
    if (allDocuments.length >= maxResults) {
      reachedLimit = true;
      break;
    }

    // Get cursor for next page
    const lastDoc = documents[documents.length - 1];
    if (!lastDoc.$id) break;
    startAfter = lastDoc.$id as string;
  }

  return { documents: allDocuments, reachedLimit };
}
