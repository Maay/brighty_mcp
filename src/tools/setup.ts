import { z } from "zod";
import { saveApiKey, resetClient, getApiKey } from "../client.js";

export const setupTools = {
  brighty_setup: {
    description: "Configure Brighty API key. Use this to set up or update your Brighty API credentials. The key will be stored in ~/.brighty/config.json for persistent access.",
    inputSchema: z.object({
      apiKey: z.string().describe("Your Brighty API key from the Business dashboard"),
    }),
    handler: async (input: { apiKey: string }) => {
      saveApiKey(input.apiKey);
      resetClient(); // Reset client so next call uses new key
      return {
        success: true,
        message: "API key saved successfully to ~/.brighty/config.json. You can now use all Brighty tools.",
      };
    },
  },

  brighty_status: {
    description: "Check if Brighty API key is configured and test the connection.",
    inputSchema: z.object({}),
    handler: async () => {
      const apiKey = getApiKey();
      if (!apiKey) {
        return {
          configured: false,
          message: "API key not configured. Use brighty_setup to configure your API key.",
        };
      }

      // Mask the API key for display
      const maskedKey = apiKey.length > 10
        ? apiKey.substring(0, 6) + "..." + apiKey.substring(apiKey.length - 4)
        : "***";

      return {
        configured: true,
        maskedKey,
        message: "API key is configured. Ready to use Brighty tools.",
      };
    },
  },
};
