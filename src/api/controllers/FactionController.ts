import { Router } from "express";
import { injectable, inject } from "tsyringe";
import { ValidationError } from "../../utils/error.js";
import Database from "../../utils/Database.js";

@injectable()
export class FactionController {
  public router: Router = Router();

  constructor(@inject(Database) private database: Database) {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get("/", async (req, res, next) => {
      try {
        const query = `
          SELECT 
            id, 
            name,
            fullname,
            description,
            image
          FROM factions WHERE isActive = true;
        `;
        const factions = await this.database.query(query);
        return res.status(200).json(factions);
      } catch (err) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
      }
    });

    this.router.get("/:faction", async (req, res, next) => {
      try {
        const factionName = req.params.faction.toLowerCase();

        const factionQuery = `
          SELECT 
            id, 
            fullname,
            maxMember,
            description,
            image
          FROM factions
          WHERE LOWER(name) = LOWER(?);
        `;

        const faction: any = await this.database.query(factionQuery, [factionName]);

        if (!faction || faction.length === 0) {
          throw new ValidationError("Faction not found.");
        }

        const playersQuery = `
          SELECT
            player_name,
            uuid,
            faction_grade,
            isLeader
          FROM players
          WHERE LOWER(faction) = LOWER(?)
          ORDER BY faction_grade DESC
        `;
        const players = await this.database.query(playersQuery, [factionName]);

        const gangZones = await this.database.query("SELECT zone FROM gangwar WHERE LOWER(owner) = ?", [factionName]);

        const result = {
          faction: faction[0],
          member: players,
          gangwarZones: gangZones
        };

        return res.status(200).json(result);
      } catch (err) {
        console.error(err);
        if (err instanceof ValidationError) {
          return res.status(404).json({ message: err.message });
        }
        return res.status(500).send("Internal Server Error");
      }
    });
  }
}
