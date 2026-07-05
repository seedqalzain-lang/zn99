import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "verify_warranty",
  title: "Verify warranty",
  description:
    "Look up a Taj Al Mulook warranty by its warranty number (e.g. TM-YYYY-XXXXXX) and return public details: status, activation and expiry dates, vehicle brand, film type, and branch.",
  inputSchema: {
    warranty_number: z
      .string()
      .trim()
      .min(3)
      .max(64)
      .describe("The warranty number printed on the certificate."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ warranty_number }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return { content: [{ type: "text", text: "Server misconfigured: Supabase env missing." }], isError: true };
    }
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.rpc("verify_warranty_public", { _num: warranty_number });
    if (error) {
      return { content: [{ type: "text", text: `Lookup failed: ${error.message}` }], isError: true };
    }
    const rows = (data ?? []) as unknown[];
    if (rows.length === 0) {
      return {
        content: [{ type: "text", text: `No warranty found for number "${warranty_number}".` }],
        structuredContent: { found: false, warranty: null },
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(rows[0], null, 2) }],
      structuredContent: { found: true, warranty: rows[0] },
    };
  },
});
