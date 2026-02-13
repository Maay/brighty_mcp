import { z } from "zod";
import { getClient } from "../client.js";
import type { Account, AccountAddress } from "../types/brighty.js";

export const accountTools = {
  brighty_list_accounts: {
    description: "List all accounts. Optionally filter by type (CURRENT/SAVING) or holderId.",
    inputSchema: z.object({
      type: z.enum(["CURRENT", "SAVING"]).optional().describe("Filter by account type"),
      holderId: z.string().uuid().optional().describe("Filter by holder ID"),
    }),
    handler: async (input: { type?: "CURRENT" | "SAVING"; holderId?: string }) => {
      const params = new URLSearchParams();
      if (input.type) params.set("type", input.type);
      if (input.holderId) params.set("holderId", input.holderId);
      const query = params.toString() ? `?${params.toString()}` : "";
      const accounts = await getClient().get<Account[]>(`/business/v1/accounts${query}`);
      return { accounts };
    },
  },

  brighty_get_account: {
    description: "Get detailed information about a specific account by ID.",
    inputSchema: z.object({
      id: z.string().uuid().describe("Account ID"),
    }),
    handler: async (input: { id: string }) => {
      const account = await getClient().get<Account>(`/business/v1/accounts/${input.id}`);
      return { account };
    },
  },

  brighty_create_account: {
    description: "Create a new business account.",
    inputSchema: z.object({
      name: z.string().describe("Account name"),
      type: z.enum(["CURRENT", "SAVING"]).describe("Account type"),
      currency: z.string().describe("Account currency (e.g., EUR, USD)"),
      holderId: z.string().uuid().optional().describe("Holder ID (optional)"),
    }),
    handler: async (input: { name: string; type: "CURRENT" | "SAVING"; currency: string; holderId?: string }) => {
      const account = await getClient().post<Account>("/business/v1/accounts", input);
      return { account };
    },
  },

  brighty_terminate_account: {
    description: "Close/terminate an account. Account must have zero balance.",
    inputSchema: z.object({
      id: z.string().uuid().describe("Account ID to terminate"),
    }),
    handler: async (input: { id: string }) => {
      await getClient().post<void>(`/business/v1/accounts/${input.id}/terminate`);
      return { success: true, message: `Account ${input.id} terminated` };
    },
  },

  brighty_get_account_addresses: {
    description: "Get routing and crypto addresses for an account.",
    inputSchema: z.object({
      id: z.string().uuid().describe("Account ID"),
    }),
    handler: async (input: { id: string }) => {
      const addresses = await getClient().get<AccountAddress[]>(`/business/v1/accounts/${input.id}/addresses`);
      return { addresses };
    },
  },
};
