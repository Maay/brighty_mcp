import { z } from "zod";
import { getClient } from "../client.js";
import type { Card, CardDesign, Money } from "../types/brighty.js";
import { randomUUID } from "crypto";

interface CardProduct {
  id: string;
  name: string;
  formFactor: string;
  network: string;
  fees: Record<string, Money>;
}

interface CardOrderIntent {
  amount: Money;
  fees: Record<string, unknown>;
  remainingLimits: Record<string, number>;
  hash: string;
  holderNameValidity: {
    type: string;
    holderName: string;
  };
}

export const cardTools = {
  brighty_list_cards: {
    description: "List all cards held by the business.",
    inputSchema: z.object({}),
    handler: async () => {
      const cards = await getClient().get<Card[]>("/business/v1/cards");
      return { cards };
    },
  },

  brighty_get_card: {
    description: "Get detailed information about a specific card.",
    inputSchema: z.object({
      id: z.string().uuid().describe("Card ID"),
    }),
    handler: async (input: { id: string }) => {
      const card = await getClient().get<Card>(`/business/v1/cards/${input.id}`);
      return { card };
    },
  },

  brighty_order_card: {
    description: "Order a new virtual card for a business member. Automatically handles intent and order steps.",
    inputSchema: z.object({
      customerId: z.string().uuid().describe("Member/Customer ID who will hold the card"),
      cardName: z.string().describe("Card name/label"),
      sourceAccountId: z.string().uuid().describe("Account ID for card spending and fee payment"),
      cardDesignId: z.string().uuid().describe("Card design ID (use brighty_list_card_designs to get available designs)"),
      holderName: z.string().optional().describe("Card holder name (optional, uses member legal name if not specified)"),
    }),
    handler: async (input: {
      customerId: string;
      cardName: string;
      sourceAccountId: string;
      cardDesignId: string;
      holderName?: string;
    }) => {
      // Step 1: Get intent (fees and hash)
      const intent = await getClient().post<CardOrderIntent>("/business/v1/cards/order/intent", {
        customerId: input.customerId,
        cardDesignId: input.cardDesignId,
        holderName: input.holderName || null,
      });

      // Step 2: Order the card with fees and hash from intent
      const card = await getClient().post<Card>("/business/v1/cards/order", {
        customerId: input.customerId,
        cardDesignId: input.cardDesignId,
        sourceAccountId: input.sourceAccountId,
        fees: intent.fees,
        hash: intent.hash,
        holderName: input.holderName || null,
        cardName: input.cardName,
      }, { "Idempotency-Key": randomUUID() });

      return { card, issueFee: intent.amount };
    },
  },

  brighty_freeze_card: {
    description: "Freeze a card to temporarily disable all transactions.",
    inputSchema: z.object({
      id: z.string().uuid().describe("Card ID to freeze"),
    }),
    handler: async (input: { id: string }) => {
      await getClient().post<void>(`/business/v1/cards/${input.id}/freeze`);
      return { success: true, message: `Card ${input.id} frozen` };
    },
  },

  brighty_unfreeze_card: {
    description: "Unfreeze a previously frozen card.",
    inputSchema: z.object({
      id: z.string().uuid().describe("Card ID to unfreeze"),
    }),
    handler: async (input: { id: string }) => {
      await getClient().post<void>(`/business/v1/cards/${input.id}/unfreeze`);
      return { success: true, message: `Card ${input.id} unfrozen` };
    },
  },

  brighty_set_card_limits: {
    description: "Update spending limits on a card.",
    inputSchema: z.object({
      id: z.string().uuid().describe("Card ID"),
      dailyLimit: z.string().optional().describe("Daily spending limit amount"),
      monthlyLimit: z.string().optional().describe("Monthly spending limit amount"),
      currency: z.string().describe("Currency for the limits"),
    }),
    handler: async (input: {
      id: string;
      dailyLimit?: string;
      monthlyLimit?: string;
      currency: string;
    }) => {
      const limits: Record<string, Money> = {};
      if (input.dailyLimit) {
        limits.daily = { amount: input.dailyLimit, currency: input.currency };
      }
      if (input.monthlyLimit) {
        limits.monthly = { amount: input.monthlyLimit, currency: input.currency };
      }

      await getClient().put<void>(`/business/v1/cards/${input.id}/limits`, limits);
      return { success: true, message: `Card ${input.id} limits updated` };
    },
  },

  brighty_list_card_designs: {
    description: "List available card designs.",
    inputSchema: z.object({}),
    handler: async () => {
      const designs = await getClient().get<CardDesign[]>("/business/v1/cards/designs");
      return { designs };
    },
  },

  brighty_get_virtual_card_product: {
    description: "Get virtual card product conditions and fees.",
    inputSchema: z.object({}),
    handler: async () => {
      const product = await getClient().get<CardProduct>("/business/v1/cards/products/virtual");
      return { product };
    },
  },
};
