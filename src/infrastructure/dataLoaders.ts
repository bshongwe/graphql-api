import DataLoader from "dataloader";
import { User } from "../domain/user.js";
import { UserRepository } from "../infrastructure/userRepository.js";

/**
 * DataLoaders for batch loading and caching
 * Prevents N+1 query problems in GraphQL resolvers
 */
export class DataLoaders {
  public readonly userLoader: DataLoader<number, User | null>;

  constructor(private readonly userRepository: UserRepository) {
    this.userLoader = new DataLoader<number, User | null>(async (ids: readonly number[]) => {
      const users = await this.userRepository.findByIds(ids as number[]);
      const userMap = new Map(users.map((user: User) => [user.id!, user]));
      
      // Return users in the same order as requested IDs
      return ids.map(id => userMap.get(id) || null);
    });
  }

  // Method to clear cache if needed
  clearAll(): void {
    this.userLoader.clearAll();
  }
}
