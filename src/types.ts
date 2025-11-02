import { z } from "zod";

/**
 * Configuration for a single Craft document
 */
export interface DocumentConfig {
  name: string;
  apiEndpoint: string;
}

/**
 * Root configuration structure
 */
export interface Config {
  documents: DocumentConfig[];
}

/**
 * Craft block structure
 */
export interface Block {
  id: string;
  type?: string;
  content?: any;
  blocks?: Block[];
  [key: string]: any;
}

/**
 * Parameters for fetching blocks
 */
export interface BlockFetchParams {
  id?: string;
  maxDepth?: number;
  fetchMetadata?: boolean;
}

/**
 * Parameters for searching blocks
 */
export interface SearchParams {
  pattern: string;
  caseSensitive?: boolean;
  beforeBlockCount?: number;
  afterBlockCount?: number;
}

/**
 * Response from blocks endpoint
 */
export interface BlocksResponse {
  success: boolean;
  data?: Block | Block[];
  error?: string;
}

/**
 * Search result with context
 */
export interface SearchResult {
  block: Block;
  documentName?: string;
  path?: string[];
}

/**
 * Response from search endpoint
 */
export interface SearchResponse {
  success: boolean;
  results?: SearchResult[];
  error?: string;
}

/**
 * Aggregated search results from multiple documents
 */
export interface AggregatedSearchResult {
  documentName: string;
  results?: SearchResult[];
  error?: string;
}

/**
 * Error structure for API responses
 */
export interface ApiError {
  message: string;
  statusCode?: number;
  documentName?: string;
}

// Zod Schemas for tool parameters

/**
 * Schema for search_all_notes tool parameters
 */
export const searchAllNotesSchema = z.object({
  query: z.string().describe("Search query pattern"),
  caseSensitive: z.boolean().optional().describe("Whether search is case-sensitive (default: false)"),
});

/**
 * Schema for search_document tool parameters
 */
export const searchDocumentSchema = z.object({
  documentName: z.string().describe("Name of the document to search"),
  query: z.string().describe("Search query pattern"),
  caseSensitive: z.boolean().optional().describe("Whether search is case-sensitive (default: false)"),
});

/**
 * Schema for read_document tool parameters
 */
export const readDocumentSchema = z.object({
  documentName: z.string().describe("Name of the document to read"),
  maxDepth: z.number().optional().describe("Maximum depth of block hierarchy to fetch"),
});

/**
 * Schema for read_block tool parameters
 */
export const readBlockSchema = z.object({
  documentName: z.string().describe("Name of the document containing the block"),
  blockId: z.string().describe("ID of the block to read"),
});