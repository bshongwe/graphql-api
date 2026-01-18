import { User } from '../domain/user.js';
import { UserRepositoryInterface } from '../domain/userRepositoryInterface.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../utils/errorHandler.js';

export class UserService {
  constructor(private readonly userRepository: UserRepositoryInterface) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<User> {
    // Validate email format
    const tempUser = new User(
      null,
      data.name,
      data.email,
      data.password,
      data.role as any
    );
    if (!tempUser.isValidEmail()) {
      throw new ValidationError('Invalid email format');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('User already exists with this email');
    }

    return this.userRepository.create(data);
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      email: string;
      password: string;
      role: string;
    }>
  ): Promise<User> {
    // Validate email format if email is being updated
    if (data.email) {
      const tempUser = new User(null, '', data.email, '', 'USER');
      if (!tempUser.isValidEmail()) {
        throw new ValidationError('Invalid email format');
      }
    }

    return this.userRepository.update(id, data);
  }

  async delete(id: number): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.userRepository.delete(id);
  }
}
