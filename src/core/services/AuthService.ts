import Database from "../../utils/Database.js";
import { UserModel } from "../../utils/entity/UserModel.js";
import { PasswordHasher } from "../../utils/PasswordHasher.js";
import { inject, injectable } from "tsyringe";
import jwt from "jsonwebtoken";

@injectable()
export class AuthService {
    public static secretKey: string = "eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTcwMjAyNTc4MSwiaWF0IjoxNzAyMDI1NzgxfQ.MDOcxUk5eMYjIaWZxw2ZRbEBlVsJXbshZVVi5qPktFY";

    constructor(@inject(Database) private database: Database) {
    }

    async getUserFromRequest(req: any): Promise<UserModel | null> {
        if (!req.userId) {
            return null;
        }
        const userId = req.userId;
        const user: UserModel | null = await this.findByIdAsync(userId);
        if (!user) {
            return null;
        }
        return user;    
    }

    async updateAsync(User: UserModel): Promise<boolean> {
        if (await this.database.userManager.save(User)) {
            return true;
        } else {
            return false;
        }
    }

    createAsync = async (user: UserModel): Promise<boolean> => {
        if (await this.database.userManager.create(user)) {
            return true;
        } else {
            return false;
        }
    }

    async signInAsync(user: UserModel, password: string): Promise<string | null> {
        const isPasswordEqual = (password === user.password);
        //const isPasswordEqual = await PasswordHasher.isPasswordEqual(password, user.password);
        if (isPasswordEqual) {

            const id = user.id;
            const token = jwt.sign({ id }, AuthService.secretKey);
            await this.database.query("UPDATE players SET lastWebLogin = NOW() WHERE id = ?", [user.id]);
            return token;
        } else {
            return null;
        }
    }

    async findByIdAsync(id: number): Promise<UserModel | null> {
        const users: UserModel[] = await this.database.userManager.getPlayers();
        const user = users.find((u: UserModel) => u.id === id);
        return user || null;
    }


    async findByNameAsync(name: string): Promise<UserModel | null> {
        const users: UserModel[] = await this.database.userManager.getPlayers();
        const user = users.find((u: UserModel) => u.player_name.toLowerCase() === name.toLowerCase());
        return user || null;
    }

    async findByEmailAsync(email: string): Promise<UserModel | null> {
        const users: UserModel[] = await this.database.userManager.getPlayers();
        const user = users.find((u: UserModel) => u.email === email);
        return user || null;
    }

    async findByEmailOrNameAsync(value: string): Promise<UserModel | null> {
        const users: UserModel[] = await this.database.userManager.getPlayers();
        const user = users.find((u: UserModel) => u.player_name === value || u.email === value);
        return user || null;
    }

    verifyUserToken = async (token: any): Promise<string | null> => {
        return new Promise((resolve) => {
            jwt.verify(JSON.parse(token), AuthService.secretKey, (err: any, decoded: any) => {
                if (err) {
                    resolve(null);
                } else {
                    resolve(decoded.id);
                }
            });
        });
    };

    getUserDataByToken = async (token: any): Promise<any> => {
        if (!token) {
            return null;
        }

        const username = await this.verifyUserToken(token);
        if (username === null) {
            return null;
        }

        const user: any = await this.findByNameAsync(username);

        return user;
    };

    setEmail = async (user: UserModel, email: string) => {
        await this.database.query("UPDATE Users SET email = ? WHERE id = ?", [email, user.id]);
    }

    setPassword = async (user: UserModel, password: string) => {
        await this.database.query("UPDATE Users SET password = ? WHERE id = ?", [await PasswordHasher.hashPassword(password), user.id]);
    }

    isUserAdmin = (user: UserModel): boolean => {
        return user.player_permlevel >= 60;
    }
}