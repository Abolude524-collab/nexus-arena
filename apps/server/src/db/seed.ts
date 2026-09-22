import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

export async function seedAdminUser(): Promise<void> {
  try {
    const adminEmail = 'admin@nexus.com';
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('AdminPassword123!', 10);
      await prisma.user.create({
        data: {
          username: 'Admin',
          email: adminEmail,
          passwordHash,
          avatar: 'avatar_crown',
          role: 'ADMIN',
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
      console.log('👑 Admin user initialized successfully: admin@nexus.com / AdminPassword123!');
    }
  } catch (err) {
    console.error('[Seed] Failed to seed admin user:', err);
  }
}
