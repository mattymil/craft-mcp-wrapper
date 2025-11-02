import axios, { AxiosError } from "axios";
import type {
  Block,
  BlockFetchParams,
  BlocksResponse,
  SearchParams,
  SearchResponse,
  SearchResult,
} from "./types.js";

/**
 * Fetches blocks from a Craft document API
 *
 * @param apiEndpoint - The base URL of the Craft API
 * @param params - Optional parameters for filtering blocks
 * @returns Promise with blocks data or error
 */
export async function fetchBlocks(
  apiEndpoint: string,
  params?: BlockFetchParams
): Promise<BlocksResponse> {
  try {
    const url = `${apiEndpoint}/blocks`;
    const response = await axios.get<Block | Block[]>(url, {
      params: {
        id: params?.id,
        maxDepth: params?.maxDepth,
        fetchMetadata: params?.fetchMetadata,
      },
      timeout: 30000,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    return {
      success: false,
      error: axiosError.response?.data
        ? JSON.stringify(axiosError.response.data)
        : axiosError.message || "Unknown error occurred",
    };
  }
}

/**
 * Searches for blocks in a Craft document API
 *
 * @param apiEndpoint - The base URL of the Craft API
 * @param searchParams - Search parameters including pattern and options
 * @returns Promise with search results or error
 */
export async function searchBlocks(
  apiEndpoint: string,
  searchParams: SearchParams
): Promise<SearchResponse> {
  try {
    const url = `${apiEndpoint}/blocks/search`;
    const response = await axios.get<Block[]>(url, {
      params: {
        pattern: searchParams.pattern,
        caseSensitive: searchParams.caseSensitive,
        beforeBlockCount: searchParams.beforeBlockCount,
        afterBlockCount: searchParams.afterBlockCount,
      },
      timeout: 30000,
    });

    // Transform results to include proper structure
    const results: SearchResult[] = Array.isArray(response.data)
      ? response.data.map((block) => ({
          block,
        }))
      : [];

    return {
      success: true,
      results,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    return {
      success: false,
      error: axiosError.response?.data
        ? JSON.stringify(axiosError.response.data)
        : axiosError.message || "Unknown error occurred",
    };
  }
}