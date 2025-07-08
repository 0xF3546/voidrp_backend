import { inject, injectable } from "tsyringe";
import { DiscordBot } from "../discord/Discord.js";
import Database from "../../utils/Database.js";

@injectable()
export class DiscordService {
  private discordBot: DiscordBot;

  constructor(@inject(DiscordBot) discordBot: DiscordBot, @inject(Database) private database: Database) {
    this.discordBot = discordBot;
  }

  async getUserById(id: string) {
    return this.discordBot.getUserById(id);
  }

  async setClientName(id: string, name: string) {
    return this.discordBot.setClientName(id, name);
  }

  async verifyUser(syncToken: string, id: string) {
    const result: any = await this.database.query("SELECT * FROM players WHERE syncToken = ?", [syncToken]);
    if (result.length === 0) {
      throw new Error("Invalid sync token");
    }
    return this.discordBot.verifyUser(syncToken, id, result[0].player_name);
  }
}