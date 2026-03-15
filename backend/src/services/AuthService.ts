import { OAuth2Client } from 'google-auth-library';
import { IUserRepository } from '../domain/entities/repositories/IUserRepository';
import generateToken from '../utils/generateToken';
import { prisma } from '../lib/prisma';

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

    async register(_email: string, _passwordRaw: string, _fullName: string): Promise<AuthResponse> {
        throw new Error(
            'Đăng ký tự do đã bị tắt. Chỉ quản trị viên mới có thể thêm thành viên. Vui lòng sử dụng link mời trong email để tạo tài khoản.'
        );
    }

    async login(email: string, passwordRaw: string): Promise<AuthResponse> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Tài khoản chưa được cấp. Vui lòng liên hệ quản trị viên để nhận lời mời tham gia hệ thống.');
        }

        const rawUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { status: true },
        });
        if (rawUser?.status === 'Pending') {
            throw new Error('Vui lòng hoàn tất thiết lập tài khoản qua link trong email mời trước khi đăng nhập.');
        }
        if (rawUser?.status === 'Inactive') {
            throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
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
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
            throw new Error('Cấu hình Google OAuth chưa đúng. Vui lòng liên hệ quản trị viên.');
        }
        const ticket = await this.googleClient.verifyIdToken({
            idToken,
            audience: clientId,
        });

        const payload = ticket.getPayload();
        if (!payload?.email || !payload.sub) {
            throw new Error('Token Google không hợp lệ');
        }

        const email = payload.email;
        const name = payload.name ?? email.split('@')[0] ?? 'User';
        const picture = payload.picture ?? null;
        const sub = payload.sub;

        let user = await this.userRepository.findByEmail(email);

        if (user) {
            const rawUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { status: true },
            });
            if (rawUser?.status === 'Inactive') {
                throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
            }
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    avatar_path: picture ?? user.avatarPath ?? null,
                    google_id: sub,
                    authProvider: 'google',
                    status: 'Active',
                    inviteToken: null,
                    inviteExpires: null,
                },
            });
            const updated = await this.userRepository.findById(user.id);
            if (!updated) throw new Error('Lỗi Server');
            user = updated;
        } else {
            user = await this.userRepository.findByGoogleId(sub);
            if (user) {
                const rawUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { status: true },
                });
                if (rawUser?.status === 'Inactive') {
                    throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
                }
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        email,
                        full_name: name,
                        avatar_path: picture ?? null,
                        authProvider: 'google',
                        status: 'Active',
                        inviteToken: null,
                        inviteExpires: null,
                    },
                });
                const updated = await this.userRepository.findById(user.id);
                if (!updated) throw new Error('Lỗi Server');
                user = updated;
            } else {
                // Chỉ cho phép đăng nhập Google nếu email đã được Admin mời (có trong hệ thống)
                throw new Error(
                    'Tài khoản chưa được cấp. Vui lòng liên hệ quản trị viên để nhận lời mời tham gia hệ thống.'
                );
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