import { z } from 'zod'

const baseServerEnvSchema = z.object({
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
  EMAIL_PROVIDER: z.enum(['smtp', 'resend', 'postmark']).default('smtp'),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email').optional(),
  OPERATOR_EMAIL: z.string().email('OPERATOR_EMAIL must be a valid email').optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  POSTMARK_SERVER_TOKEN: z.string().min(1).optional(),
  POSTMARK_MESSAGE_STREAM: z.string().min(1).default('outbound'),
  NOTIFICATION_DISPATCH_SECRET: z.string().min(32).optional(),
  CRON_SECRET: z.string().min(32).optional(),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
  SMTP_USER: z.string().email('SMTP_USER must be a valid email').optional(),
  SMTP_APP_PASSWORD: z.string().min(1).optional(),
  SMTP_FROM_NAME: z.string().min(1).default('RepoView'),
})

export const serverEnvSchema = baseServerEnvSchema.superRefine((env, context) => {
  if (env.EMAIL_PROVIDER === 'smtp') {
    if (!env.SMTP_USER) context.addIssue({ code: z.ZodIssueCode.custom, path: ['SMTP_USER'], message: 'SMTP_USER is required when EMAIL_PROVIDER is smtp' })
    if (!env.SMTP_APP_PASSWORD) context.addIssue({ code: z.ZodIssueCode.custom, path: ['SMTP_APP_PASSWORD'], message: 'SMTP_APP_PASSWORD is required when EMAIL_PROVIDER is smtp' })
  }
  if (env.EMAIL_PROVIDER === 'resend') {
    if (!env.RESEND_API_KEY) context.addIssue({ code: z.ZodIssueCode.custom, path: ['RESEND_API_KEY'], message: 'RESEND_API_KEY is required when EMAIL_PROVIDER is resend' })
    if (!env.EMAIL_FROM) context.addIssue({ code: z.ZodIssueCode.custom, path: ['EMAIL_FROM'], message: 'EMAIL_FROM is required when EMAIL_PROVIDER is resend' })
  }
  if (env.EMAIL_PROVIDER === 'postmark') {
    if (!env.POSTMARK_SERVER_TOKEN) context.addIssue({ code: z.ZodIssueCode.custom, path: ['POSTMARK_SERVER_TOKEN'], message: 'POSTMARK_SERVER_TOKEN is required when EMAIL_PROVIDER is postmark' })
    if (!env.EMAIL_FROM) context.addIssue({ code: z.ZodIssueCode.custom, path: ['EMAIL_FROM'], message: 'EMAIL_FROM is required when EMAIL_PROVIDER is postmark' })
  }
})

const rateLimitEnvSchema = baseServerEnvSchema.pick({ IP_HASH_SALT: true })
const supabaseAdminEnvSchema = baseServerEnvSchema.pick({ SUPABASE_SERVICE_ROLE_KEY: true })

export type ServerEnv = z.infer<typeof serverEnvSchema>
export type RateLimitEnv = z.infer<typeof rateLimitEnvSchema>
export type SupabaseAdminEnv = z.infer<typeof supabaseAdminEnvSchema>

function parseEnv<T extends z.ZodTypeAny>(schema: T, input: Record<string, string | undefined>, label: string): z.infer<T> {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new Error(`Invalid ${label} environment: ${result.error.issues.map((issue) => issue.message).join('; ')}`)
  }
  return result.data
}

export function parseServerEnv(input: Record<string, string | undefined> = process.env): ServerEnv {
  return parseEnv(serverEnvSchema, input, 'server')
}

export function parseRateLimitEnv(input: Record<string, string | undefined> = process.env): RateLimitEnv {
  return parseEnv(rateLimitEnvSchema, input, 'rate-limit')
}

export function parseSupabaseAdminEnv(input: Record<string, string | undefined> = process.env): SupabaseAdminEnv {
  return parseEnv(supabaseAdminEnvSchema, input, 'Supabase admin')
}
