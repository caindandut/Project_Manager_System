import { User } from '../domain/entities/User';
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

    constructor(private readonly userRepository: IUserRepository) {}

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
}