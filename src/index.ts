import "reflect-metadata";
import express, { NextFunction, Request, Response } from "express";
import session from "express-session";
import UserManager from "./utils/UserManager.js";
import Database from "./utils/Database.js";
import { MainRouter } from "./api/controllers/index.js";
import cors from 'cors';
import { CustomError } from "./utils/error.js";
import { containerSetup } from "./container.js";

const app = express();
const port = 3001;

const debug = true;

export const sendDebug = (message: string) => {
    if (debug) {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        console.log(`[DEBUG]\x1b[33m ${hours}:${minutes}:${seconds} | ${message}\x1b[0m.`)
    };
};

app.use(cors({
    origin: ['https://voidroleplay.de', 'http://localhost:5173'],
    credentials: true,
}));

app.use(express.json());

app.use(session({
    secret: 'your secret key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

try {
  await containerSetup();
  console.log('Container Setup erfolgreich');
} catch (e) {
  console.error('Fehler im containerSetup:', e);
}


app.use(MainRouter);

app.use((err: CustomError | unknown, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof CustomError) {
        res.status(err.statusCode).json({ error: err.message });
    } else {
        console.error(err);
        res.status(500).json({ error: "internal server error" });
    }
});

export const database: Database = new Database();
export const userManager: UserManager = new UserManager(database);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

declare global {
    namespace Express {
        export interface Request {
            userId?: number;
        }
    }
}
