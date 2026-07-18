import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow importing from monorepo packages
  transpilePackages: ['@keybridge/security', '@keybridge/validation'],

  // Never expose these to the browser
  serverRuntimeConfig: {
    ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    INTERNAL_API_TOKEN: process.env.INTERNAL_API_TOKEN,
  },

  // Safe to expose to the browser
  publicRuntimeConfig: {},
}

export default nextConfig
