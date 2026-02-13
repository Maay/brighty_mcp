import { z } from "zod";
import { getClient } from "../client.js";
import type { Payout, PayoutTransfer, Money } from "../types/brighty.js";
import { randomUUID } from "crypto";

export const payoutTools = {
  brighty_list_payouts: {
    description: "List all payouts.",
    inputSchema: z.object({}),
    handler: async () => {
      const payouts = await getClient().get<Payout[]>("/business/v1/payouts");
      return { payouts };
    },
  },

  brighty_create_payout: {
    description: "Create a new payout batch.",
    inputSchema: z.object({
      name: z.string().describe("Payout name"),
      description: z.string().optional().describe("Payout description"),
    }),
    handler: async (input: { name: string; description?: string }) => {
      const payout = await getClient().post<Payout>("/business/v1/payouts", input);
      return { payout };
    },
  },

  brighty_get_payout: {
    description: "Get detailed information about a specific payout.",
    inputSchema: z.object({
      id: z.string().uuid().describe("Payout ID"),
      createdAt: z.string().optional().describe("Payout creation date (ISO 8601)"),
    }),
    handler: async (input: { id: string; createdAt?: string }) => {
      const params = input.createdAt ? `?createdAt=${input.createdAt}` : "";
      const payout = await getClient().get<Payout>(`/business/v1/payouts/${input.id}${params}`);
      return { payout };
    },
  },

  brighty_start_payout: {
    description: "Start processing a payout - initiates all transfers.",
    inputSchema: z.object({
      id: z.string().uuid().describe("Payout ID to start"),
      createdAt: z.string().optional().describe("Payout creation date (ISO 8601) - required by API"),
    }),
    handler: async (input: { id: string; createdAt?: string }) => {
      const params = input.createdAt ? `?createdAt=${encodeURIComponent(input.createdAt)}` : "";
      const payout = await getClient().post<Payout>(`/business/v1/payouts/${input.id}/start${params}`);
      return { payout };
    },
  },

  brighty_create_internal_transfer: {
    description: "Add an internal Brighty transfer to a payout. Recipient can be account ID (UUID) or Brighty tag (username).",
    inputSchema: z.object({
      payoutId: z.string().uuid().describe("Payout ID"),
      payoutCreatedAt: z.string().optional().describe("Payout creation date (ISO 8601) - required by API"),
      sourceAccountId: z.string().uuid().describe("Source account ID to send from"),
      recipientAccountId: z.string().optional().describe("Recipient Brighty account ID (UUID)"),
      recipientTag: z.string().optional().describe("Recipient Brighty tag (username)"),
      amount: z.string().describe("Transfer amount"),
      currency: z.string().describe("Currency (e.g., EUR, USD)"),
      reference: z.string().optional().describe("Payment reference"),
    }),
    handler: async (input: {
      payoutId: string;
      payoutCreatedAt?: string;
      sourceAccountId: string;
      recipientAccountId?: string;
      recipientTag?: string;
      amount: string;
      currency: string;
      reference?: string;
    }) => {
      const body: Record<string, unknown> = {
        sourceAccountId: input.sourceAccountId,
        amount: { amount: input.amount, currency: input.currency } as Money,
        receiverUsername: input.recipientTag || "",
      };
      if (input.recipientAccountId) {
        body.receiverAccountId = input.recipientAccountId;
      }
      if (input.reference) {
        body.comment = input.reference;
      }
      const params = input.payoutCreatedAt ? `?createdAt=${encodeURIComponent(input.payoutCreatedAt)}` : "";
      const transfer = await getClient().post<PayoutTransfer>(
        `/business/v1/payouts/${input.payoutId}/transfers/internal${params}`,
        body,
        { "Idempotency-Key": randomUUID() }
      );
      return { transfer };
    },
  },

  brighty_create_external_transfer: {
    description: "Add an external (fiat or crypto) transfer to a payout.",
    inputSchema: z.object({
      payoutId: z.string().uuid().describe("Payout ID"),
      payoutCreatedAt: z.string().optional().describe("Payout creation date (ISO 8601) - required by API"),
      sourceAccountId: z.string().uuid().describe("Source account ID to send from"),
      amount: z.string().describe("Transfer amount"),
      currency: z.string().describe("Currency (e.g., EUR, BTC, USDC)"),
      recipientName: z.string().describe("Recipient name (person name or business name)"),
      isBusinessRecipient: z.boolean().optional().describe("Set to true if recipient is a business/company (uses businessName instead of beneficiaryName)"),
      iban: z.string().optional().describe("IBAN for fiat transfers"),
      bic: z.string().optional().describe("BIC/SWIFT code for fiat transfers"),
      bankCountry: z.string().optional().describe("Bank country code (e.g., PL, GB) for fiat transfers"),
      beneficiaryCountry: z.string().optional().describe("Beneficiary country code (ISO 3166-1 alpha-2)"),
      beneficiaryCity: z.string().optional().describe("Beneficiary city"),
      beneficiaryZipCode: z.string().optional().describe("Beneficiary postal code"),
      beneficiaryStreet: z.string().optional().describe("Beneficiary street address"),
      cryptoAddress: z.string().optional().describe("Crypto address for crypto transfers"),
      cryptoNetwork: z.string().optional().describe("Crypto network (e.g., ERC20, TRC20, ARBITRUM)"),
      reference: z.string().optional().describe("Payment reference"),
    }),
    handler: async (input: {
      payoutId: string;
      payoutCreatedAt?: string;
      sourceAccountId: string;
      amount: string;
      currency: string;
      recipientName: string;
      isBusinessRecipient?: boolean;
      iban?: string;
      bic?: string;
      bankCountry?: string;
      beneficiaryCountry?: string;
      beneficiaryCity?: string;
      beneficiaryZipCode?: string;
      beneficiaryStreet?: string;
      cryptoAddress?: string;
      cryptoNetwork?: string;
      reference?: string;
    }) => {
      const beneficiary: Record<string, unknown> = {};

      if (input.isBusinessRecipient) {
        beneficiary.businessName = input.recipientName;
      } else {
        beneficiary.beneficiaryName = input.recipientName;
      }

      if (input.iban) {
        // Fiat SEPA transfer: no transferNetworkId, requires currency, type, bankCountry, beneficiaryAddress
        beneficiary.accountNumber = input.iban;
        beneficiary.currency = input.currency;
        beneficiary.type = input.isBusinessRecipient ? "BUSINESS" : "PERSON";
        if (input.bic) {
          beneficiary.routingNumber = input.bic;
        }
        if (input.bankCountry) {
          beneficiary.bankCountry = input.bankCountry;
        }
        if (input.beneficiaryCountry) {
          const addr: Record<string, string> = { country: input.beneficiaryCountry };
          if (input.beneficiaryCity) addr.city = input.beneficiaryCity;
          if (input.beneficiaryZipCode) addr.zipCode = input.beneficiaryZipCode;
          if (input.beneficiaryStreet) addr.streetLine1 = input.beneficiaryStreet;
          beneficiary.beneficiaryAddress = addr;
        }
      }
      if (input.cryptoAddress) {
        // Crypto transfer: requires transferNetworkId from CryptoTransferNetworkId enum
        beneficiary.accountNumber = input.cryptoAddress;
        beneficiary.transferNetworkId = input.cryptoNetwork;
        beneficiary.currency = input.currency;
      }

      const body: Record<string, unknown> = {
        sourceAccountId: input.sourceAccountId,
        amount: { amount: input.amount, currency: input.currency },
        beneficiary,
        reference: input.reference || null,
      };

      const params = input.payoutCreatedAt ? `?createdAt=${encodeURIComponent(input.payoutCreatedAt)}` : "";
      const transfer = await getClient().post<PayoutTransfer>(
        `/business/v1/payouts/${input.payoutId}/transfers/external${params}`,
        body,
        { "Idempotency-Key": randomUUID() }
      );
      return { transfer };
    },
  },
};
