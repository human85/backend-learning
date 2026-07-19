import { Session, SessionData } from 'express-session';

export type AppSession = Session & Partial<SessionData>;

export type AuthenticatedSession = AppSession & { userId: number };
