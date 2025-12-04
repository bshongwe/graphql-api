import { PrismaClient } from '@prisma/client';
import { User } from '../domain/user.js';
import { UserRepositoryInterface } from '../domain/userRepositoryInterface.js';

export class UserRepository implements UserRepositoryInterface {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany();
    return users.map(user => User.fromPrisma(user));
  }

  async findById(id: number): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    
    return user ? User.fromPrisma(user) : null;
  }

  async findByIds(ids: number[]): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: ids
        }
      }
    });
    
    return users.map(user => User.fromPrisma(user));
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    
    return user ? User.fromPrisma(user) : null;
  }

  async create(userData: { name: string; email: string; password: string; role?: string }): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role || 'USER',
      },
    });
    
    return User.fromPrisma(user);
  }

  async update(id: number, userData: Partial<{ name: string; email: string; password: string; role: string }>): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: userData,
    });
    
    return User.fromPrisma(user);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }
}