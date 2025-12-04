import { UserService } from "../../application/userService.js";
import { AuthService } from "../../application/authService.js";
import { createLoaders } from "../dataloaders.js";

interface Context {
  authService: AuthService;
  userService: UserService;
  currentUser?: any;
  loaders: ReturnType<typeof createLoaders>;
}

export const userResolver = {
  Query: {
    users: async (_: any, __: any, context: Context) => {
      // example of authorization: only admins can list all users
      if (!context.currentUser || context.currentUser.role !== "ADMIN") {
        throw new Error("Unauthorized");
      }
      const users = await context.userService.findAll();
      return users.map(user => user.toPublic());
    },
    me: async (_: any, __: any, context: Context) => {
      if (!context.currentUser?.id) return null;
      
      // Option 1: Use DataLoader for potential caching/batching benefits
      const user = await context.loaders.userLoader.load(context.currentUser.id);
      if (!user) return null;
      
      // Convert Prisma result to domain model and return public data
      const { password, ...publicData } = user;
      return publicData;
      
      // Option 2: Use service layer (uncomment if you prefer domain model approach)
      // const user = await context.userService.findById(context.currentUser.id);
      // return user.toPublic();
    }
  },
  Mutation: {
    signUp: async (_: any, { name, email, password }: any, context: Context) => {
      const result = await context.authService.signUp({ name, email, password });
      return { token: result.token, user: result.user };
    },
    signIn: async (_: any, { email, password }: any, context: Context) => {
      const result = await context.authService.signIn({ email, password });
      return { token: result.token, user: result.user };
    }
  }
};