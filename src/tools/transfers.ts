import { z } from "zod";
import { getClient } from "../client.js";
import type { TransferIntent, Money } from "../types/brighty.js";
import { randomUUID } from "crypto";

interface TransferResult {
  transactionId: string;
  transactionState: string;
  createdAt: string;
}

interface TransferIntentResponse {
  amount: Money;
  quote: {
    sourceAmount: Money;
    targetAmount: Money;
    fx?: {
      rate: {
        currencyPair: { base: string; counter: string };
        timestamp: string;
        bid: string;
        ask: string;
      };
      side: string;
      appliedMarkup: string;
      feeMarkup: string;
      availability: string;
    };
  };
  fees?: Array<{
    type: string;
    quote: { sourceAmount: Money; targetAmount: Money };
  }>;
  deliveryInfo?: { estimatedDeliveryDate: string };
  hash: string;
}

export const transferTools = {
  brighty_transfer_own: {
    description: "Transfer money between your own Brighty accounts. For cross-currency transfers, this will get a quote and execute atomically.",
    inputSchema: z.object({
      sourceAccountId: z.string().uuid().describe("Source account ID"),
      targetAccountId: z.string().uuid().describe("Target account ID"),
      amount: z.string().describe("Amount to transfer"),
      currency: z.string().describe("Currency of the amount (source currency)"),
      targetCurrency: z.string().optional().describe("Target currency (required for cross-currency transfers)"),
    }),
    handler: async (input: {
      sourceAccountId: string;
      targetAccountId: string;
      amount: string;
      currency: string;
      targetCurrency?: string;
    }) => {
      const sourceCurrency = input.currency;
      const targetCurrency = input.targetCurrency || input.currency;
      const isCrossCurrency = sourceCurrency !== targetCurrency;

      if (isCrossCurrency) {
        // For cross-currency transfers, get intent first then execute with quote
        const intent = await getClient().post<TransferIntentResponse>("/business/v1/transfers/own/intent", {
          sourceAccountId: input.sourceAccountId,
          targetAccountId: input.targetAccountId,
          amount: { amount: input.amount, currency: sourceCurrency },
          side: "SELL",
          sourceCurrency,
          targetCurrency,
        });

        // Execute transfer - forward entire intent response + account IDs
        // The hash is computed over the full intent (amount, quote, fees, deliveryInfo, hash)
        const result = await getClient().post<TransferResult>(
          "/business/v1/transfers/own",
          {
            ...intent,
            sourceAccountId: input.sourceAccountId,
            targetAccountId: input.targetAccountId,
          },
          { "Idempotency-Key": randomUUID() }
        );

        return {
          transfer: result,
          quote: {
            sourceAmount: intent.quote.sourceAmount,
            targetAmount: intent.quote.targetAmount,
            fees: intent.fees,
          },
        };
      } else {
        // Same currency transfer - still need intent for quote/hash
        const intent = await getClient().post<TransferIntentResponse>("/business/v1/transfers/own/intent", {
          sourceAccountId: input.sourceAccountId,
          targetAccountId: input.targetAccountId,
          amount: { amount: input.amount, currency: input.currency },
          side: "SELL",
          sourceCurrency,
          targetCurrency,
        });

        const result = await getClient().post<TransferResult>(
          "/business/v1/transfers/own",
          {
            ...intent,
            sourceAccountId: input.sourceAccountId,
            targetAccountId: input.targetAccountId,
          },
          { "Idempotency-Key": randomUUID() }
        );
        return { transfer: result };
      }
    },
  },

  brighty_transfer_intent: {
    description: "Calculate transfer details (exchange rate, fees) before executing a transfer between own accounts. For cross-currency transfers, you must specify side, sourceCurrency, and targetCurrency.",
    inputSchema: z.object({
      sourceAccountId: z.string().uuid().describe("Source account ID"),
      targetAccountId: z.string().uuid().describe("Target account ID"),
      amount: z.string().describe("Amount to transfer"),
      currency: z.string().describe("Currency of the amount"),
      side: z.enum(["SELL", "BUY"]).optional().describe("SELL = you specify source amount, BUY = you specify target amount"),
      sourceCurrency: z.string().optional().describe("Source account currency (required for cross-currency)"),
      targetCurrency: z.string().optional().describe("Target account currency (required for cross-currency)"),
    }),
    handler: async (input: {
      sourceAccountId: string;
      targetAccountId: string;
      amount: string;
      currency: string;
      side?: "SELL" | "BUY";
      sourceCurrency?: string;
      targetCurrency?: string;
    }) => {
      const isCrossCurrency = input.sourceCurrency && input.targetCurrency && input.sourceCurrency !== input.targetCurrency;

      const requestBody: Record<string, unknown> = {
        sourceAccountId: input.sourceAccountId,
        targetAccountId: input.targetAccountId,
        amount: { amount: input.amount, currency: input.currency },
      };

      if (isCrossCurrency) {
        requestBody.side = input.side || "SELL";
        requestBody.sourceCurrency = input.sourceCurrency;
        requestBody.targetCurrency = input.targetCurrency;
      }

      const intent = await getClient().post<TransferIntentResponse>("/business/v1/transfers/own/intent", requestBody);

      return {
        intent: {
          sourceAmount: intent.quote.sourceAmount,
          targetAmount: intent.quote.targetAmount,
          exchangeRate: intent.quote.fx?.rate,
          fees: intent.fees,
          deliveryInfo: intent.deliveryInfo,
          hash: intent.hash,
        },
      };
    },
  },
};
