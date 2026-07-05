import { defineMcp } from "@lovable.dev/mcp-js";
import verifyWarrantyTool from "./tools/verify-warranty";

export default defineMcp({
  name: "tajalmlwk-mcp",
  title: "Taj Al Mulook Warranty MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Taj Al Mulook car care warranty system. Use `verify_warranty` to look up a warranty certificate by its warranty number and read public status/details.",
  tools: [verifyWarrantyTool],
});
