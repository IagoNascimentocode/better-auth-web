// lib/auth.ts (client)
import { createAuthClient } from "better-auth/client";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const auth = createAuthClient({
  baseURL: "http://localhost:3333",
  plugins: [
    inferAdditionalFields({
      user: {
        phone: { type: "string" },
      },
    }),
  ],
});
