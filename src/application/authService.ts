import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserService } from './userService.js';
import { User } from '../domain/user.js';
import { AuthenticationError, ConflictError, ValidationError } from '../utils/errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class AuthService {
  constructor(private readonly userService: UserService) {}

  async signUp({ name, email, password }: { name: string; email: string; password: string }) {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user (UserService will handle validation and duplicate check)
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
      user: user.toPublic(),
    };
  }

  async signIn({ email, password }: { email: string; password: string }) {
    // Find user
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: user.toPublic(),
    };
  }

  async getUserFromToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
      const user = await this.userService.findById(decoded.userId);
      return user ? user.toPublic() : null;
    } catch {
      return null;
    }
  }
}
