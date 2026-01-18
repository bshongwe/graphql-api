export interface PaginationInput {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class PaginationUtils {
  /**
   * Calculate pagination offset
   */
  static calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Calculate total pages
   */
  static calculateTotalPages(total: number, limit: number): number {
    return Math.ceil(total / limit);
  }

  /**
   * Create pagination metadata
   */
  static createMeta(
    page: number,
    limit: number,
    total: number
  ): PaginationMeta {
    const totalPages = this.calculateTotalPages(total, limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Create paginated result
   */
  static createResult<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): PaginationResult<T> {
    return {
      data,
      pagination: this.createMeta(page, limit, total),
    };
  }

  /**
   * Validate pagination parameters
   */
  static validateParams(page: number, limit: number): void {
    if (page < 1) {
      throw new Error('Page must be at least 1');
    }
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }
  }

  /**
   * Get default pagination
   */
  static getDefaults(): PaginationInput {
    return {
      page: 1,
      limit: 20,
      sortOrder: 'asc',
    };
  }
}

// Cursor-based pagination for real-time data
export interface CursorPaginationInput {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface CursorPaginationResult<T> {
  edges: Array<{
    node: T;
    cursor: string;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  totalCount: number;
}

export class CursorPaginationUtils {
  /**
   * Encode cursor
   */
  static encodeCursor(value: string | number): string {
    return Buffer.from(value.toString()).toString('base64');
  }

  /**
   * Decode cursor
   */
  static decodeCursor(cursor: string): string {
    return Buffer.from(cursor, 'base64').toString();
  }

  /**
   * Create cursor pagination result
   */
  static createResult<T>(
    items: (T & { id: string | number })[],
    totalCount: number,
    first?: number,
    after?: string,
    _last?: number,
    _before?: string
  ): CursorPaginationResult<T> {
    const edges = items.map(item => ({
      node: item,
      cursor: this.encodeCursor(item.id),
    }));

    const startCursor = edges.length > 0 ? edges[0]?.cursor : undefined;
    const endCursor = edges.length > 0 ? edges.at(-1)?.cursor : undefined;

    return {
      edges,
      pageInfo: {
        hasNextPage: first ? edges.length === first : false,
        hasPreviousPage: Boolean(after),
        ...(startCursor && { startCursor }),
        ...(endCursor && { endCursor }),
      },
      totalCount,
    };
  }
}
