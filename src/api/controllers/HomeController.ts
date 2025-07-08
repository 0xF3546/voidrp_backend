import { Router } from "express";
import { injectable, inject } from "tsyringe";
import Database from "../../utils/Database.js";
import { emailService } from "../../utils/EmailService.js";
import { ValidationError } from "../../utils/error.js";

@injectable()
export class HomeController {
  public router: Router = Router();

  constructor(@inject(Database) private database: Database) {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post("/sendContact", async (req, res, next) => {
      try {
        const username = req.body.name;
        const email = req.body.email;
        const message = req.body.message;

        if (!username || !email || !message) {
          throw new ValidationError("Name, Email und Nachricht müssen angegeben werden.");
        }

        await emailService.sendAsync(
          "management@voidroleplay.de",
          "[System] Kontaktformular",
          `Hallo Team!<br><br>${username} hat eine Nachricht über das Kontaktformular gesendet.<br>Message: ${message}<br>Email: ${email}`
        );

        await emailService.sendAsync(
          email,
          "Kontaktformular eingegangen",
          `Hallo ${username}!<br><br>Wir haben deine Nachricht erhalten und kümmern uns so schnell wie möglich darum.`
        );

        return res.status(200).json({ message: "Nachricht erfolgreich gesendet." });
      } catch (err) {
        next(err);
      }
    });

    this.router.get("/team", async (req, res, next) => {
      try {
        const result = await this.database.query(
          "SELECT p.player_name, p.uuid, r.rang FROM players AS p LEFT JOIN ranks AS r ON p.player_permlevel = r.permlevel WHERE p.player_permlevel >= 40"
        );
        return res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    });

    this.router.get("/statistics", async (req, res, next) => {
      try {
        const count: any = await this.database.query("SELECT COUNT(*) AS count FROM players");
        const factionCount: any = await this.database.query("SELECT COUNT(*) AS count FROM factions WHERE isActive = true");
        const companyCount: any = await this.database.query("SELECT COUNT(*) AS count FROM companies");

        const stats = {
          registeredCount: count[0].count,
          factionCount: factionCount[0].count,
          companyCount: companyCount[0].count,
        };

        return res.status(200).json(stats);
      } catch (err) {
        next(err);
      }
    });

    this.router.get("/rules", async (req, res, next) => {
      try {
        const rules = await this.database.query("SELECT * FROM webRules");
        return res.status(200).json(rules);
      } catch (err) {
        next(err);
      }
    });

    this.router.get("/leaderboards", async (req, res) => {
      return res.status(200).json([
        { display: "Visum", url: "visum" },
        { display: "Level", url: "level" },
        { display: "Bekanntheit", url: "popularity" },
        { display: "Fischer", url: "fishing" },
        { display: "Holzfäller", url: "lumberjack" },
      ]);
    });

    this.router.get("/leaderboard/:type", async (req, res, next) => {
      try {
        const type = req.params.type.toLowerCase();
        let query: string;

        switch (type) {
          case "visum":
            query = "SELECT player_name, visum AS level, uuid FROM players ORDER BY visum DESC LIMIT 100;";
            break;
          case "level":
            query = "SELECT player_name, level, uuid FROM players ORDER BY level DESC LIMIT 100;";
            break;
          case "popularity":
            query =
              "SELECT p.player_name AS player_name, p.uuid AS uuid, pa.popularityLevel AS level FROM player_addonxp AS pa LEFT JOIN players AS p ON pa.uuid = p.uuid ORDER BY pa.popularityLevel DESC LIMIT 100;";
            break;
          case "fishing":
            query =
              "SELECT p.player_name AS player_name, p.uuid AS uuid, pa.fishingLevel AS level FROM player_addonxp AS pa LEFT JOIN players AS p ON pa.uuid = p.uuid ORDER BY pa.fishingLevel DESC LIMIT 100;";
            break;
          case "lumberjack":
            query =
              "SELECT p.player_name AS player_name, p.uuid AS uuid, pa.lumberjackLevel AS level FROM player_addonxp AS pa LEFT JOIN players AS p ON pa.uuid = p.uuid ORDER BY pa.lumberjackLevel DESC LIMIT 100;";
            break;
          default:
            return res.status(404).json({ message: "Unbekannter Leaderboard-Typ." });
        }

        const results = await this.database.query(query);
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    });

    this.router.get("/leaderboard-info/:type", async (req, res, next) => {
      try {
        const type = req.params.type.toLowerCase();
        let response = { type: "", display: "" };

        switch (type) {
          case "visum":
            response = { type: "Visum", display: "Visum" };
            break;
          case "level":
            response = { type: "Level", display: "Level" };
            break;
          case "popularity":
            response = { type: "Level", display: "Bekanntheit" };
            break;
          case "fishing":
            response = { type: "Level", display: "Fischer" };
            break;
          case "lumberjack":
            response = { type: "Level", display: "Holzfäller" };
            break;
          default:
            return res.status(404).json({ message: "Unbekannter Leaderboard-Typ." });
        }

        return res.status(200).json(response);
      } catch (err) {
        next(err);
      }
    });
  }
}
