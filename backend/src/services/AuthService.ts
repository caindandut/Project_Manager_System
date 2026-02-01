import { OAuth2Client } from 'google-auth-library';
import { User, UserRole } from '../domain/entities/User';
import { Password } from '../domain/value-objects/Password';
import { IUserRepository } from '../domain/entities/repositories/IUserRepository';
import generateToken from '../utils/generateToken';


interface AuthResponse {
    user: {
        id: number;
        email: string;
        fullName: string;
        role: string;
        avatarPath: string | null;
    };
    token: string;
}

export class AuthService {
    private readonly googleClient: OAuth2Client;

    constructor(private readonly userRepository: IUserRepository) {
        this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }

    async register(email: string, passwordRaw: string, fullName: string): Promise<AuthResponse> {
        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('Email này đã được sử dụng');
        }

        const password = await Password.create(passwordRaw);

        const newUser = new User({
            id: 0,
            email,
            fullName,
            password,
            role: 'Employee' as any,
        });

        const savedUser = await this.userRepository.save(newUser);

        const token = generateToken(savedUser.id);

        return {
            user: {
                id: savedUser.id,
                email: savedUser.email,
                fullName: savedUser.fullName,
                role: savedUser.role,
                avatarPath: savedUser.avatarPath
            },
            token
        };
    }

    async login(email: string, passwordRaw: string): Promise<AuthResponse> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Email hoặc mật khẩu không đúng');
        }

        const isValid = await user.password.compare(passwordRaw);
        if (!isValid) {
            throw new Error('Email hoặc mật khẩu không đúng');
        }

        const token = generateToken(user.id);

        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                avatarPath: user.avatarPath
            },
            token
        };
    }

    async loginGoogle(idToken: string): Promise<AuthResponse> {
        const ticket = await this.googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID as string,
        });

        const payload = ticket.getPayload();
        if (!payload?.email || !payload.name || !payload.sub) {
            throw new Error('Token Google không hợp lệ');
        }

        const { email, name, picture, sub } = payload;

        let user = await this.userRepository.findByEmail(email);

        if (user) {
            await this.userRepository.updateGoogleProfile(user.id, sub, picture ?? null);
            const updated = await this.userRepository.findById(user.id);
            if (!updated) throw new Error('Lỗi Server');
            user = updated;
        } else {
            user = await this.userRepository.findByGoogleId(sub);
            if (user) {
                await this.userRepository.updateUserProfile(user.id, email, name, picture ?? null);
                const updated = await this.userRepository.findById(user.id);
                if (!updated) throw new Error('Lỗi Server');
                user = updated;
            } else {
                const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
                const password = await Password.create(randomPassword);
                const newUser = new User({
                    id: 0,
                    email,
                    fullName: name,
                    password,
                    role: UserRole.EMPLOYEE,
                    avatarPath: picture ?? null,
                    googleId: sub,
                });
                user = await this.userRepository.save(newUser);
            }
        }

        const token = generateToken(user.id);
        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                avatarPath: user.avatarPath
            },
            token
        };
    }
}