import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { UserService } from './userService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class AuthService {
  private userService: UserService;

  constructor(private prisma: PrismaClient) {
    this.userService = new UserService(prisma);
  }

  async signUp({ name, email, password }: { name: string; email: string; password: string }) {
    // Check if user already exists
    const existingUser = await this.userService.findByEmail(email);

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await this.userService.create({
      name,
      email,
      password: hashedPassword,
      role: 'USER',
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async signIn({ email, password }: { email: string; password: string }) {
    // Find user
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getUserFromToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
      const user = await this.userService.findById(decoded.userId);
      return user;
    } catch {
      return null;
    }
  }
}
