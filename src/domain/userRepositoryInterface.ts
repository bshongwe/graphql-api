import { User } from '../domain/user.js';

export interface UserRepositoryInterface {
  findAll(): Promise<User[]>;
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(userData: { name: string; email: string; password: string; role?: string }): Promise<User>;
  update(id: number, userData: Partial<{ name: string; email: string; password: string; role: string }>): Promise<User>;
  delete(id: number): Promise<void>;
}
