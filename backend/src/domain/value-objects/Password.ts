import bcrypt from 'bcryptjs';

export class Password {
    private constructor(private readonly _hashedValue: string) { }

    get value(): string {
        return this._hashedValue;
    }

    static async create(plainText: string): Promise<Password> {
        if (plainText.length < 8) {
            throw new Error("Mật khẩu phải có ít nhất 8 ký tự");
        }
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(plainText, salt);
        return new Password(hashed);
    }

    static fromHash(hashedValue: string): Password {
        return new Password(hashedValue);
    }

    async compare(plainText: string): Promise<boolean> {
        return await bcrypt.compare(plainText, this._hashedValue);
    }
}