import { z } from 'zod';

// Common validation schemas
export const commonSchemas = {
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  id: z.number().int().positive('ID must be a positive integer'),
  uuid: z.string().uuid(),
  url: z.string().url(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
};

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.number().int().min(1).max(100, 'Limit must be between 1 and 100').default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Date range schema
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'Start date must be before end date',
});

// User input validation schemas
export const userValidationSchemas = {
  create: z.object({
    name: commonSchemas.name,
    email: commonSchemas.email,
    password: commonSchemas.password,
    role: z.enum(['USER', 'ADMIN']).default('USER'),
  }),
  
  update: z.object({
    name: commonSchemas.name.optional(),
    email: commonSchemas.email.optional(),
    password: commonSchemas.password.optional(),
    role: z.enum(['USER', 'ADMIN']).optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  }),
  
  signIn: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required'),
  }),
};

// Validation helper functions
export class ValidationUtils {
  /**
   * Validate data against schema
   */
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new Error(`Validation failed: ${messages.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Safe validation that returns result with success flag
   */
  static safeParse<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: boolean;
    data?: T;
    error?: string;
  } {
    try {
      const result = schema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, error: messages.join(', ') };
      }
      return { success: false, error: 'Unknown validation error' };
    }
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    return commonSchemas.email.safeParse(email).success;
  }

  /**
   * Validate password strength
   */
  static isValidPassword(password: string): boolean {
    return commonSchemas.password.safeParse(password).success;
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replaceAll(/\s+/g, ' ');
  }

  /**
   * Validate and sanitize pagination params
   */
  static validatePagination(params: unknown) {
    return this.validate(paginationSchema, params);
  }
}
