import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { PrismaClient } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

export class TestDataFactory {
  static readonly prisma = new PrismaClient();

  /**
   * Generate a unique email
   */
  static generateEmail(domain = 'test.com'): string {
    return `test-${nanoid(8)}@${domain}`;
  }

  /**
   * Generate a test user
   */
  static generateUser(
    overrides: Partial<{
      name: string;
      email: string;
      password: string;
      role: string;
    }> = {}
  ) {
    return {
      name: `Test User ${nanoid(4)}`,
      email: this.generateEmail(),
      password: 'password123',
      role: 'USER',
      ...overrides,
    };
  }

  /**
   * Create a test user in database
   */
  static async createUser(
    overrides: Parameters<typeof this.generateUser>[0] = {}
  ) {
    const userData = this.generateUser(overrides);
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    return this.prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
    });
  }

  /**
   * Create multiple test users
   */
  static async createUsers(
    count: number,
    overrides: Parameters<typeof this.generateUser>[0] = {}
  ) {
    const users = [];
    for (let i = 0; i < count; i++) {
      const user = await this.createUser(overrides);
      users.push(user);
    }
    return users;
  }

  /**
   * Generate JWT token for user
   */
  static generateToken(userId: number, email: string): string {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
  }

  /**
   * Create authenticated user with token
   */
  static async createAuthenticatedUser(
    overrides: Parameters<typeof this.generateUser>[0] = {}
  ) {
    const user = await this.createUser(overrides);
    const token = this.generateToken(user.id, user.email);

    return {
      user,
      token,
      authHeader: `Bearer ${token}`,
    };
  }

  /**
   * Clean up test data
   */
  static async cleanup() {
    // Delete in reverse order of dependencies
    await this.prisma.user.deleteMany();
  }

  /**
   * Reset database for tests
   */
  static async resetDatabase() {
    await this.cleanup();
  }
}
