import type { Context, Next } from 'hono';
import type { ApiResponse } from './types';

/**
 * CORS middleware
 */
export const corsMiddleware = async (c: Context, next: Next) => {
  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  await next();

  // Add CORS headers to all responses
  c.res.headers.set('Access-Control-Allow-Origin', '*');
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

/**
 * Logging middleware
 */
export const loggingMiddleware = async (c: Context, next: Next) => {
  const start = Date.now();
  const method = c.req.method;
  const url = c.req.url;
  
  console.log(`[WORKER] ${method} ${url} - Started`);
  
  await next();
  
  const duration = Date.now() - start;
  const status = c.res.status;
  
  console.log(`[WORKER] ${method} ${url} - ${status} (${duration}ms)`);
};

/**
 * Error handling middleware
 */
export const errorMiddleware = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    console.error('[WORKER] Unhandled error:', error);
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return c.json(errorResponse, 500);
  }
};

/**
 * Helper function to create standardized API responses
 */
export const createApiResponse = <T>(
  success: boolean,
  data?: T,
  error?: string,
  message?: string
): ApiResponse<T> => ({
  success,
  data,
  error,
  message,
});

/**
 * Helper function to send success response
 */
export const sendSuccess = <T>(c: Context, data?: T, message?: string) => {
  return c.json(createApiResponse(true, data, undefined, message));
};

/**
 * Helper function to send error response
 */
export const sendError = (c: Context, error: string, status: number = 500, message?: string) => {
  return c.json(createApiResponse(false, undefined, error, message), status as 200 | 201 | 400 | 404 | 500);
};