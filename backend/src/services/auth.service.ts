import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import {
  registerSchema,
  loginSchema,
  RegisterInput,
  LoginInput,
  AuthResponse,
  UserDTO,
} from '../shared/index.js';

const JWT_SECRET = process.env['JWT_SECRET'] || 'nexus-arena-super-secret-jwt-key-2026';
const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
}

export class AuthService {
  static formatUserDTO(user: {
    id: string;
    username: string;
    email: string;
    avatar: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }): UserDTO {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  }

  static async register(input: RegisterInput): Promise<AuthResponse> {
    const validated = registerSchema.parse(input);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: validated.username }, { email: validated.email }],
      },
    });

    if (existingUser) {
      if (existingUser.username === validated.username) {
        throw new Error('Username is already taken');
      }
      throw new Error('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);
    const avatar = `avatar_${Math.floor(Math.random() * 6) + 1}`;

    const user = await prisma.user.create({
      data: {
        username: validated.username,
        email: validated.email,
        passwordHash,
        avatar,
        role: 'USER',
        stats: {
          create: {
            gamesPlayed: 0,
            wins: 0,
            totalScore: 0,
            xp: 0,
          },
        },
      },
    });

    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const token = this.generateToken(payload);
    return {
      token,
      user: this.formatUserDTO(user),
    };
  }

  static async login(input: LoginInput): Promise<AuthResponse> {
    const validated = loginSchema.parse(input);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const token = this.generateToken(payload);
    return {
      token,
      user: this.formatUserDTO(user),
    };
  }

  static async getCurrentUser(userId: string): Promise<UserDTO> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return this.formatUserDTO(user);
  }
}
