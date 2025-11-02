import { readFileSync } from "fs";
import type { Config } from "./src/types.js";
import {
  listDocuments,
  searchAllNotes,
  searchDocument,
  readDocument,
  readBlock,
} from "./src/tools.js";

// Load config
const config: Config = JSON.parse(readFileSync("./config.json", "utf-8"));

let passedTests = 0;
let failedTests = 0;

/**
 * Test runner helper
 */
async function runTest(
  name: string,
  testFn: () => Promise<any>
): Promise<void> {
  try {
    const result = await testFn();
    console.log(`✓ PASS: ${name}`);
    console.log("  Result:", JSON.stringify(result, null, 2).slice(0, 200));
    passedTests++;
  } catch (error) {
    console.log(`✗ FAIL: ${name}`);
    console.log(
      "  Error:",
      error instanceof Error ? error.message : String(error)
    );
    failedTests++;
  }
}

console.log("\n=== Craft MCP Wrapper - Test Suite ===");
console.log("\n--- Valid Inputs Tests ---");

// Test 1: List documents
await runTest("list_documents", async () => {
  const result = await listDocuments(config);
  if (result.count !== 2) {
    throw new Error(`Expected 2 documents, got ${result.count}`);
  }
  return result;
});

// Test 2: Search all notes
await runTest("search_all_notes", async () => {
  const result = await searchAllNotes(config, "test", false);
  if (!result || !result.results) {
    throw new Error("Expected results array");
  }
  return {
    totalResults: result.totalResults,
    documentsSearched: result.documentsSearched,
  };
});

// Test 3: Search specific document
await runTest("search_document", async () => {
  const result = await searchDocument(config, "Notes", "test", false);
  if (!result) {
    throw new Error("Expected search results");
  }
  return result;
});

// Test 4: Read document
await runTest("read_document", async () => {
  const result = await readDocument(config, "Notes", 2);
  if (!result) {
    throw new Error("Expected document data");
  }
  return { documentName: result.documentName, hasData: !!result.data };
});

console.log("\n--- Error Handling Tests ---");

// Test 5: Invalid document name
await runTest("search_document with invalid name", async () => {
  const result = await searchDocument(config, "NonExistent", "test");
  if (!result.error) {
    throw new Error("Expected error for invalid document");
  }
  return { error: result.error };
});

// Test 6: Read block (may fail if block doesn't exist)
await runTest("read_block (may fail gracefully)", async () => {
  const result = await readBlock(config, "Notes", "test-block-id");
  return {
    documentName: result.documentName,
    hasData: !!result.data,
    hasError: !!result.error,
  };
});

// Summary
console.log("\n=== Test Summary ===");
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`Total: ${passedTests + failedTests}`);

if (failedTests > 0) {
  process.exit(1);
}