import { Session, SessionData } from 'express-session';

export type AppSession = Session & Partial<SessionData>;
