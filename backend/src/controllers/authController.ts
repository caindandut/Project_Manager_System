import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { PrismaUserRepository } from '../infrastructure/repositories/PrismaUserRepository';

const userRepository = new PrismaUserRepository();
const authService = new AuthService(userRepository);


export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, full_name } = req.body; 
        
        const result = await authService.register(email, password, full_name);
        
        res.status(201).json(result);
    } catch (error) {
        next(error); 
    }
};

export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        const result = await authService.login(email, password);

        res.json(result);
    } catch (error) {
        res.status(401); 
        next(error);
    }
};

export const getMe = async (req: Request | any, res: Response) => {
    res.json(req.user);
};

export const loginGoogle = async (req: Request, res: Response) => {};
export const forgotPassword = async (req: Request, res: Response) => {};
export const resetPassword = async (req: Request, res: Response) => {};