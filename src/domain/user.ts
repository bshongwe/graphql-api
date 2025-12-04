export type Role = "USER" | "ADMIN";

export class User {
  constructor(
    public id: number | null,
    public name: string,
    public email: string,
    public password: string,
    public role: Role = "USER"
  ) {}

  static fromPrisma(row: any): User {
    return new User(row.id, row.name, row.email, row.password, row.role as Role);
  }

  // Method to return user without password for API responses
  toPublic(): { id: number | null; name: string; email: string; role: Role } {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
    };
  }

  // Method to check if user is admin
  isAdmin(): boolean {
    return this.role === "ADMIN";
  }

  // Method to validate email format
  isValidEmail(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }
}