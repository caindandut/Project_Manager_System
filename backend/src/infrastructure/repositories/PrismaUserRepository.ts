import { PrismaClient } from '@prisma/client';
import { IUserRepository } from '../../domain/entities/repositories/IUserRepository';
import { User, UserRole } from '../../domain/entities/User';
import { Password } from '../../domain/value-objects/Password';

const prisma = new PrismaClient();

export class PrismaUserRepository implements IUserRepository {
    
    private toDomain(prismaUser: any): User {
        return new User({
            id: prismaUser.id,
            email: prismaUser.email,
            fullName: prismaUser.full_name,
            role: prismaUser.role as UserRole,
            password: Password.fromHash(prismaUser.password),
            avatarPath: prismaUser.avatar_path,
            googleId: prismaUser.google_id
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        return this.toDomain(user);
    }

    async findById(id: number): Promise<User | null> {
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return null;
        return this.toDomain(user);
    }

    async findByGoogleId(googleId: string): Promise<User | null> {
        const user = await prisma.user.findUnique({ where: { google_id: googleId } });
        if (!user) return null;
        return this.toDomain(user);
    }

    async save(user: User): Promise<User> {
        const savedUser = await prisma.user.create({
            data: {
                email: user.email,
                full_name: user.fullName,
                password: user.password.value,
                role: user.role,
                avatar_path: user.avatarPath ?? undefined,
                google_id: user.googleId ?? undefined,
            },
        });
        return this.toDomain(savedUser);
    }

    async updateGoogleProfile(userId: number, googleId: string, avatarPath: string | null): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: {
                google_id: googleId,
                avatar_path: avatarPath,
            },
        });
    }

    async updateUserProfile(userId: number, email: string, fullName: string, avatarPath: string | null): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: {
                email,
                full_name: fullName,
                avatar_path: avatarPath,
            },
        });
    }
}