// src/controllers/DiscordController.ts
import { Router } from "express";
import { DiscordService } from "../../core/services/DiscordService.js";
import { inject, injectable } from "tsyringe";
import Database from "../../utils/Database.js";

@injectable()
export class DiscordController {
  public router: Router = Router();
  private verifies = [];

  constructor(
    @inject(DiscordService) private discordService: DiscordService,
    @inject(Database) private database: Database
  ) {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post("/verify", async (req, res) => {
      const { token, id } = req.body;
      await this.discordService.verifyUser(token, id);
      return res.status(200).send();
    });

    this.router.post("/reloaduser", async (req, res) => {
      await this.reloadUser(req.body.id);
      return res.status(200).send();
    });

    this.router.post("/unlink", async (req, res) => {
      if (await this.unlink(req.body.id)) {
        return res.status(200).send();
      }
      return res.status(404).send();
    });
  }

  private async updateUserUidByUUID(uuid: string, id: string) {
    console.log(uuid);
    await this.database.query("UPDATE players SET discordId = ? WHERE uuid = ?", [id, uuid]);
    await this.reloadUser(id);
  }

  private async reloadUser(id: string) {
    const client = await this.discordService.getUserById(id);
    const result: any = await this.database.query("SELECT * FROM players WHERE discordId = ?", [id]);
    const user: any = result[0];
    if (user) {
      await this.discordService.setClientName(client.id, user.player_name);
    }
  }

  private async unlink(uid: string): Promise<boolean> {
    return true;
  }
}

export const generateRandomCode = () => {
  // Implement your random code generation logic
};