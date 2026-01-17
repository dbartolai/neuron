import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Get the API base URL
 * Defaults to localhost:8000 in development, api.ceria.io in production
 * Can be overridden with NEXT_PUBLIC_API_URL environment variable
 */
export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use environment variable or default based on hostname
    const envUrl = process.env.NEXT_PUBLIC_API_URL
    if (envUrl) return envUrl
    
    // Check if we're on production domain
    if (window.location.hostname === 'neuron.ceria.io' || window.location.hostname === 'api.ceria.io') {
      return 'https://api.ceria.io'
    }
    return 'http://localhost:8000'
  }
  
  // Server-side: use environment variable or default based on NODE_ENV
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl) return envUrl
  
  return process.env.NODE_ENV === 'production' ? 'https://api.ceria.io' : 'http://localhost:8000'
}

/**
 * Get the frontend base URL
 * Defaults to localhost:3000 in development, neuron.ceria.io in production
 * Can be overridden with NEXT_PUBLIC_FRONTEND_URL environment variable
 */
export function getFrontendUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use environment variable or default based on hostname
    const envUrl = process.env.NEXT_PUBLIC_FRONTEND_URL
    if (envUrl) return envUrl
    
    // Check if we're on production domain
    if (window.location.hostname === 'neuron.ceria.io') {
      return 'https://neuron.ceria.io'
    }
    return 'http://localhost:3000'
  }
  
  // Server-side: use environment variable or default based on NODE_ENV
  const envUrl = process.env.NEXT_PUBLIC_FRONTEND_URL
  if (envUrl) return envUrl
  
  return process.env.NODE_ENV === 'production' ? 'https://neuron.ceria.io' : 'http://localhost:3000'
}
