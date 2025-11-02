import type { Config, DocumentConfig, AggregatedSearchResult } from "./types.js";
import { fetchBlocks, searchBlocks } from "./craft-api.js";

/**
 * List all configured Craft documents
 *
 * @param config - Application configuration containing document definitions
 * @returns Array of document names and endpoints
 */
export async function listDocuments(config: Config) {
  const documents = config.documents.map((doc) => ({
    name: doc.name,
    apiEndpoint: doc.apiEndpoint,
  }));

  return {
    documents,
    count: documents.length,
  };
}

/**
 * Search across all configured Craft documents
 *
 * @param config - Application configuration
 * @param query - Search query pattern
 * @param caseSensitive - Whether search should be case-sensitive
 * @returns Aggregated search results from all documents
 */
export async function searchAllNotes(
  config: Config,
  query: string,
  caseSensitive?: boolean
) {
  const searchPromises = config.documents.map(async (doc) => {
    const result = await searchBlocks(doc.apiEndpoint, {
      pattern: query,
      caseSensitive: caseSensitive ?? false,
    });

    if (result.success && result.results) {
      return {
        documentName: doc.name,
        results: result.results.map((r) => ({
          ...r,
          documentName: doc.name,
        })),
      };
    } else {
      return {
        documentName: doc.name,
        error: result.error || "Unknown error",
      };
    }
  });

  const results = await Promise.allSettled(searchPromises);

  const aggregated: AggregatedSearchResult[] = results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      return {
        documentName: config.documents[index].name,
        error: result.reason?.message || "Promise rejected",
      };
    }
  });

  // Count total results and errors
  const totalResults = aggregated.reduce(
    (sum, doc) => sum + (doc.results?.length || 0),
    0
  );
  const errors = aggregated.filter((doc) => doc.error);

  return {
    query,
    caseSensitive: caseSensitive ?? false,
    totalResults,
    documentsSearched: config.documents.length,
    results: aggregated,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Search within a specific Craft document
 *
 * @param config - Application configuration
 * @param documentName - Name of document to search
 * @param query - Search query pattern
 * @param caseSensitive - Whether search should be case-sensitive
 * @returns Search results from the specified document
 */
export async function searchDocument(
  config: Config,
  documentName: string,
  query: string,
  caseSensitive?: boolean
) {
  const doc = config.documents.find((d) => d.name === documentName);

  if (!doc) {
    return {
      error: `Document "${documentName}" not found`,
      availableDocuments: config.documents.map((d) => d.name),
    };
  }

  const result = await searchBlocks(doc.apiEndpoint, {
    pattern: query,
    caseSensitive: caseSensitive ?? false,
  });

  if (result.success && result.results) {
    return {
      documentName: doc.name,
      query,
      caseSensitive: caseSensitive ?? false,
      resultCount: result.results.length,
      results: result.results.map((r) => ({
        ...r,
        documentName: doc.name,
      })),
    };
  } else {
    return {
      documentName: doc.name,
      error: result.error || "Unknown error",
    };
  }
}

/**
 * Read the entire structure of a Craft document
 *
 * @param config - Application configuration
 * @param documentName - Name of document to read
 * @param maxDepth - Optional maximum depth of block hierarchy
 * @returns Complete document structure
 */
export async function readDocument(
  config: Config,
  documentName: string,
  maxDepth?: number
) {
  const doc = config.documents.find((d) => d.name === documentName);

  if (!doc) {
    return {
      error: `Document "${documentName}" not found`,
      availableDocuments: config.documents.map((d) => d.name),
    };
  }

  const result = await fetchBlocks(doc.apiEndpoint, {
    maxDepth: maxDepth,
    fetchMetadata: true,
  });

  if (result.success && result.data) {
    return {
      documentName: doc.name,
      maxDepth: maxDepth,
      data: result.data,
    };
  } else {
    return {
      documentName: doc.name,
      error: result.error || "Unknown error",
    };
  }
}

/**
 * Read a specific block from a Craft document
 *
 * @param config - Application configuration
 * @param documentName - Name of document containing the block
 * @param blockId - ID of the block to read
 * @returns Block data
 */
export async function readBlock(
  config: Config,
  documentName: string,
  blockId: string
) {
  const doc = config.documents.find((d) => d.name === documentName);

  if (!doc) {
    return {
      error: `Document "${documentName}" not found`,
      availableDocuments: config.documents.map((d) => d.name),
    };
  }

  const result = await fetchBlocks(doc.apiEndpoint, {
    id: blockId,
    fetchMetadata: true,
  });

  if (result.success && result.data) {
    return {
      documentName: doc.name,
      blockId,
      data: result.data,
    };
  } else {
    return {
      documentName: doc.name,
      blockId,
      error: result.error || "Unknown error",
    };
  }
}