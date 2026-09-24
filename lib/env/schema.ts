import { z } from 'zod'

export const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  GITHUB_APP_ID: z.coerce.number().int().positive('GITHUB_APP_ID must be a positive integer'),
  GITHUB_APP_SLUG: z.string().trim().min(1, 'GITHUB_APP_SLUG is required'),
  GITHUB_APP_CLIENT_ID: z.string().trim().min(1, 'GITHUB_APP_CLIENT_ID is required'),
  GITHUB_APP_CLIENT_SECRET: z.string().min(1, 'GITHUB_APP_CLIENT_SECRET is required'),
  GITHUB_APP_PRIVATE_KEY: z.string().min(1, 'GITHUB_APP_PRIVATE_KEY is required').transform((value) => value.replace(/\\n/g, '\n').trim()),
  GITHUB_WEBHOOK_SECRET: z.string().min(32, 'GITHUB_WEBHOOK_SECRET must be at least 32 characters'),
  SHARE_TOKEN_PEPPER: z.string().min(32, 'SHARE_TOKEN_PEPPER must be at least 32 characters'),
  SESSION_TOKEN_PEPPER: z.string().min(32, 'SESSION_TOKEN_PEPPER must be at least 32 characters'),
  IP_HASH_SALT: z.string().min(32, 'IP_HASH_SALT must be at least 32 characters'),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
  SMTP_USER: z.string().email('SMTP_USER must be a valid email'),
  SMTP_APP_PASSWORD: z.string().min(1, 'SMTP_APP_PASSWORD is required'),
  SMTP_FROM_NAME: z.string().min(1).default('RepoView'),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

export function parseServerEnv(input: Record<string, string | undefined> = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse(input)
  if (!result.success) {
    throw new Error(`Invalid server environment: ${result.error.issues.map((issue) => issue.message).join('; ')}`)
  }
  return result.data
}
