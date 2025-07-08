import { UserModel } from "./entity/UserModel.js";
import mysql from 'mysql2';

class Database {
    private config = {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "voidroleplay",
        password: process.env.DB_PASS || "password",
        database: process.env.DB_NAME || "minecraft",
        port: Number(process.env.DB_PORT) || 3306,
        connectionLimit: 100,
        charset: "utf8mb4"
    }

    connection;

    constructor() {
        this.connection = mysql.createPool(this.config);

        this.connection.query("SELECT now() as time;", [], function (err, rows: any) {
            if (rows) {
                if (rows.length > 0) {
                    console.log('[INFO]\x1b[32m Datenbank Verbindung erstellt\x1b[0m.');
                } else console.log('[INFO] \x1b[31m Datenbank Verbindung fehlgeschlagen\x1b[0m.');
            } else console.log('[INFO]\x1b[31m Datenbank Verbindung fehlgeschlagen\x1b[0m.');
        });
    }

    query = async (sql: string, args: any = []) => {
        return new Promise((resolve, reject) => {
            this.connection.query(sql, args, (err, rows) => {
                if (err)
                    return reject(err);
                resolve(rows);
            });
        });
    }

    close = () => {
        return new Promise<void>((resolve, reject) => {
            this.connection.end(err => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }

    public userManager = new UserManager(this);
}

class UserManager {
    private database: Database;

    constructor(database: Database) {
        this.database = database;
    }

    public getPlayers = async (offset?: number, limit?: number): Promise<UserModel[]> => {
        let query = "SELECT * FROM players";
      
        if (typeof limit === 'number' && typeof offset === 'number') {
            query += ` LIMIT ${limit} OFFSET ${offset}`;
        }

        const users: any = await this.database.query(query);
        return users;
    }
    
}

export default Database;