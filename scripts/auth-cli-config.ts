import { DataType, newDb } from "pg-mem"
import { betterAuth } from "better-auth"
import { admin } from "better-auth/plugins/admin"
import { magicLink } from "better-auth/plugins/magic-link"
import { passkey } from "@better-auth/passkey"

const memory = newDb()
memory.public.registerOperator({
  operator: "!~",
  left: DataType.text,
  right: DataType.text,
  returns: DataType.bool,
  implementation: (value, pattern) => !new RegExp(pattern).test(value),
})
memory.public.registerFunction({ name: "has_schema_privilege", args: [DataType.text, DataType.text], returns: DataType.bool, implementation: () => true })
memory.public.registerFunction({ name: "col_description", args: [DataType.integer, DataType.integer], returns: DataType.text, allowNullArguments: true, implementation: () => null })
memory.public.registerFunction({ name: "pg_get_serial_sequence", args: [DataType.text, DataType.text], returns: DataType.text, allowNullArguments: true, implementation: () => null })
memory.public.registerFunction({ name: "quote_ident", args: [DataType.text], returns: DataType.text, implementation: (value) => `"${value.replaceAll('"', '""')}"` })
const adapter = memory.adapters.createPg()

export const auth = betterAuth({
  database: new adapter.Pool(),
  secret: "schema-generation-only-secret-1234567890",
  advanced: { database: { generateId: "uuid" } },
  rateLimit: { enabled: true, storage: "database" },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: true,
  },
  plugins: [
    admin(),
    magicLink({ disableSignUp: true, sendMagicLink: async () => undefined }),
    passkey({ rpID: "localhost", rpName: "Gym Joan", origin: "http://localhost:3000" }),
  ],
})
