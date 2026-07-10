import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyWarrantiesTool from "./tools/list-my-warranties";
import verifyWarrantyTool from "./tools/verify-warranty";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "taj-al-moluk-mcp",
  title: "Taj Al Moluk Warranty MCP",
  version: "0.1.0",
  instructions:
    "Tools for Taj Al Moluk. Use `list_my_warranties` to see the signed-in customer's warranties, and `verify_warranty` to look up a warranty by its number.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMyWarrantiesTool, verifyWarrantyTool],
});
