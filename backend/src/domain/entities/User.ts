import { Password } from '../value-objects/Password';

export enum UserRole {
    ADMIN = 'Admin',
    DIRECTOR = 'Director',
    EMPLOYEE = 'Employee'
}

export interface UserProps {
    id: number;
    email: string;
    fullName: string;
    role: UserRole;
    password: Password;
    avatarPath?: string | null;
    googleId?: string | null;
}

export class User {
    private _id: number;
    private _email: string;
    private _fullName: string;
    private _role: UserRole;
    private _password: Password;
    private _avatarPath: string | null;
    private _googleId: string | null;

    constructor(props: UserProps) {
        this._id = props.id;
        this._email = props.email;
        this._fullName = props.fullName;
        this._role = props.role;
        this._password = props.password;
        this._avatarPath = props.avatarPath || null;
        this._googleId = props.googleId || null;
    }

    get id(): number { return this._id; }
    get email(): string { return this._email; }
    get fullName(): string { return this._fullName; }
    get role(): UserRole { return this._role; }
    get password(): Password { return this._password; }
    get avatarPath(): string | null { return this._avatarPath; }
    get googleId(): string | null { return this._googleId; }
}