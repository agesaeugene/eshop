import { Response } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

export const authCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' as const : 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const setCookie = (res: Response, name: string, value: string) => {
    res.cookie(name, value, authCookieOptions);
};