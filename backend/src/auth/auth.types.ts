export type JwtPayload = {
    sub: number;     
    email: string;
    role: string;    
};

export type AuthUser = {
    id: number;
    email: string;
    role: string;
};

export type AuthResponse = {
    accessToken: string;
    user: AuthUser;
};

export type RegisterInput = {
    email: string;
    password: string;
    role?: string; // defaults to "MERCHANT"
};

export type LoginInput = {
    email: string;
    password: string;
};
