import { User } from '../User';

export interface IUserRepository {
    findByEmail(email: string): Promise<User | null>;
    findById(id: number): Promise<User | null>;
    findByGoogleId(googleId: string): Promise<User | null>;

    save(user: User): Promise<User>;

    updateGoogleProfile(userId: number, googleId: string, avatarPath: string | null): Promise<void>;
    updateUserProfile(userId: number, email: string, fullName: string, avatarPath: string | null): Promise<void>;
}