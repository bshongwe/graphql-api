import { UserService } from "../../application/userService.js";
import { AuthService } from "../../application/authService.js";

interface Context {
  prisma: any;
  authService: AuthService;
  userService: UserService;
  currentUser?: any;
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
      if (!context.currentUser || !context.currentUser.id) return null;
      const user = await context.userService.findById(context.currentUser.id);
      return user.toPublic();
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