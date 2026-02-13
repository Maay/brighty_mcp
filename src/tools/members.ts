import { z } from "zod";
import { getClient } from "../client.js";
import type { Member } from "../types/brighty.js";

export const memberTools = {
  brighty_list_members: {
    description: "List all members of the business.",
    inputSchema: z.object({}),
    handler: async () => {
      const members = await getClient().get<Member[]>("/business/v1/members");
      return { members };
    },
  },

  brighty_add_members: {
    description: "Add new members to the business by email.",
    inputSchema: z.object({
      emails: z.array(z.string().email()).describe("List of email addresses to invite"),
      role: z.enum(["ADMIN", "MEMBER"]).describe("Role for the new members"),
    }),
    handler: async (input: { emails: string[]; role: "ADMIN" | "MEMBER" }) => {
      const result = await getClient().post<{ invited: string[]; failed: string[] }>(
        "/business/v1/members",
        {
          invitations: input.emails.map((email) => ({ email, role: input.role })),
        }
      );
      return result;
    },
  },

  brighty_remove_members: {
    description: "Remove members from the business.",
    inputSchema: z.object({
      memberIds: z.array(z.string().uuid()).describe("List of member IDs to remove"),
    }),
    handler: async (input: { memberIds: string[] }) => {
      await getClient().post<void>("/business/v1/members/remove", {
        memberIds: input.memberIds,
      });
      return { success: true, message: `Removed ${input.memberIds.length} member(s)` };
    },
  },
};
