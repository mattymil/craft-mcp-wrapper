import type { Config, DocumentConfig, AggregatedSearchResult, ResponseMetadata } from "./types.js";
import { fetchBlocks, searchBlocks } from "./craft-api.js";

/**
 * Calculate the size of a JSON response in bytes
 *
 * @param data - Data to measure
 * @returns Size in bytes
 */
export function calculateResponseSize(data: any): number {
  return Buffer.byteLength(JSON.stringify(data), 'utf8');
}

/**
 * Truncate a response to fit within a size limit
 *
 * @param data - Data to potentially truncate
 * @param maxSize - Maximum size in bytes
 * @returns Truncated data and metadata
 */
export function truncateResponse(
  data: any,
  maxSize: number
): { data: any; metadata: ResponseMetadata } {
  const originalSize = calculateResponseSize(data);

  if (originalSize <= maxSize) {
    return {
      data,
      metadata: {
        size: originalSize,
        truncated: false,
      },
    };
  }

  // Log truncation warning to stderr
  console.error(
    `[WARN] Response truncated: ${originalSize} bytes exceeds limit of ${maxSize} bytes`
  );

  // Smart truncation: preserve structure but reduce content
  const truncated = truncateObject(data, maxSize);
  const truncatedSize = calculateResponseSize(truncated);

  return {
    data: {
      ...truncated,
      _metadata: {
        truncated: true,
        originalSize,
        truncatedSize,
        message: "Response was truncated due to size limits. Use more specific queries or increase MAX_RESPONSE_SIZE.",
      },
    },
    metadata: {
      size: truncatedSize,
      truncated: true,
      originalSize,
    },
  };
}

/**
 * Recursively truncate an object to fit within size constraints
 *
 * @param obj - Object to truncate
 * @param targetSize - Target size in bytes
 * @returns Truncated object
 */
function truncateObject(obj: any, targetSize: number): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    // For arrays, keep first few items and indicate truncation
    const truncatedArray = [];
    let currentSize = 2; // Account for []

    for (let i = 0; i < obj.length; i++) {
      const itemSize = calculateResponseSize(obj[i]);
      if (currentSize + itemSize > targetSize * 0.9) {
        // Use 90% of target to leave room for metadata
        truncatedArray.push({
          _truncated: `... ${obj.length - i} more items truncated`,
        });
        break;
      }
      truncatedArray.push(obj[i]);
      currentSize += itemSize;
    }

    return truncatedArray;
  }

  // For objects, preserve top-level structure
  const truncatedObj: any = {};
  let currentSize = 2; // Account for {}

  for (const [key, value] of Object.entries(obj)) {
    const pairSize = calculateResponseSize({ [key]: value });

    if (currentSize + pairSize > targetSize * 0.9) {
      truncatedObj._remaining = "... additional fields truncated";
      break;
    }

    // Recursively truncate nested structures
    if (Array.isArray(value) && value.length > 10) {
      truncatedObj[key] = truncateObject(value, targetSize / 4);
    } else if (typeof value === 'string' && value.length > 1000) {
      truncatedObj[key] = value.substring(0, 1000) + "... (truncated)";
    } else {
      truncatedObj[key] = value;
    }

    currentSize += pairSize;
  }

  return truncatedObj;
}

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