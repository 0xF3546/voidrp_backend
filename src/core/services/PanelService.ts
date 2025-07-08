import Database from "../../utils/Database.js";
import { inject, injectable } from "tsyringe";
import { AuthService } from "./AuthService.js";

@injectable()
export class PanelService {
    constructor(@inject(Database) private database: Database, @inject(AuthService) private authService: AuthService) {
    }

    getCharData = async (user: any) => {
        const data: any = await this.database.query("SELECT bargeld, bank, discordId, player_rank, firstname, lastname, visum, playtime_hours, level, exp, faction, faction_grade, isLeader FROM players WHERE id = ?", [user.id]);
        return data[0];
    }
}