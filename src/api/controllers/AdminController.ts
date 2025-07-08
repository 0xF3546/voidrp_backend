import checkAuth from "../../middlewares/checkAuth.js";
import { AdminService } from "../../core/services/AdminService.js";
import { AuthService } from "../../core/services/AuthService.js";
import { ValidationError } from "../../utils/error.js";
import { Router } from "express";
import { inject, injectable } from "tsyringe";

@injectable()
export class AdminController {
    public router: Router = Router();

    constructor(@inject(AuthService) private authService: AuthService, @inject(AdminService) private adminService: AdminService) {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get("/players", checkAuth(), async (req, res, next) => {
            try {
                const user = await this.authService.getUserFromRequest(req);
                if (!user || !this.authService.isUserAdmin(user)) {
                    console.log("Unauthorized access attempt by user:", user ? user.uuid : "unknown");
                    console.log("User permission level:", user ? user.player_permlevel : "unknown");
                    throw new ValidationError("Zugriff verweigert. Nur Administratoren können diese Aktion ausführen.");
                }
                const onlyOnline = req.query.onlyOnline === "true";
                const size = parseInt(req.query.size as string) || 10;
                const page = parseInt(req.query.page as string) || 1;
                const search = req.query.search as string || null;
                let players;
                if (onlyOnline) {
                    players = await this.adminService.getOnlinePlayers(search, size, page);
                } else {
                    players = await this.adminService.getPlayers(search, size, page);
                }
                res.json(players);
            } catch (err) {
                next(err);
            }
        });

        this.router.get("/players/:uuid", checkAuth(), async (req, res, next) => {
            try {
                const user = await this.authService.getUserFromRequest(req);
                if (!user || !this.authService.isUserAdmin(user)) {
                    console.log("Unauthorized access attempt by user:", user ? user.uuid : "unknown");
                    console.log("User permission level:", user ? user.player_permlevel : "unknown");
                    throw new ValidationError("Zugriff verweigert. Nur Administratoren können diese Aktion ausführen.");
                }
                const uuid = req.params.uuid;
                const player = await this.adminService.getPlayerByUUID(uuid);
                if (!player) {
                    return res.status(404).json({ message: "Spieler nicht gefunden" });
                }
                res.json(player);
            } catch (err) {
                next(err);
            }
        });

        this.router.get("/logs", checkAuth(), async (req, res, next) => {
            try {
                const user = await this.authService.getUserFromRequest(req);
                if (!user || !this.authService.isUserAdmin(user)) {
                    console.log("Unauthorized access attempt by user:", user ? user.uuid : "unknown");
                    console.log("User permission level:", user ? user.player_permlevel : "unknown");
                    throw new ValidationError("Zugriff verweigert. Nur Administratoren können diese Aktion ausführen.");
                }
                const logs = await this.adminService.getLogs();
                res.json(logs);
            } catch (err) {
                next(err);
            }
        });

        this.router.get("/factions", checkAuth(), async (req, res, next) => {
            try {
                const user = await this.authService.getUserFromRequest(req);
                if (!user || !this.authService.isUserAdmin(user)) {
                    console.log("Unauthorized access attempt by user:", user ? user.uuid : "unknown");
                    console.log("User permission level:", user ? user.player_permlevel : "unknown");
                    throw new ValidationError("Zugriff verweigert. Nur Administratoren können diese Aktion ausführen.");
                }
                const factions = await this.adminService.getFactions();
                res.json(factions);
            } catch (err) {
                next(err);
            }
        });

        this.router.get("/factions/:name", checkAuth(), async (req, res, next) => {
            try {
                const user = await this.authService.getUserFromRequest(req);
                if (!user || !this.authService.isUserAdmin(user)) {
                    console.log("Unauthorized access attempt by user:", user ? user.uuid : "unknown");
                    console.log("User permission level:", user ? user.player_permlevel : "unknown");
                    throw new ValidationError("Zugriff verweigert. Nur Administratoren können diese Aktion ausführen.");
                }
                const factionName = req.params.name;
                const faction = await this.adminService.getFactionByName(factionName);
                if (!faction) {
                    return res.status(404).json({ message: "Fraktion nicht gefunden" });
                }
                res.json(faction);
            } catch (err) {
                next(err);
            }
        });

        this.router.patch("/factions/:name", checkAuth(), async (req, res, next) => {
            try {
                const user = await this.authService.getUserFromRequest(req);
                if (!user || !this.authService.isUserAdmin(user)) {
                    console.log("Unauthorized access attempt by user:", user ? user.uuid : "unknown");
                    console.log("User permission level:", user ? user.player_permlevel : "unknown");
                    throw new ValidationError("Zugriff verweigert. Nur Administratoren können diese Aktion ausführen.");
                }
                const factionName = req.params.name;
                const updates = req.body;
                const updatedFaction = await this.adminService.updateFaction(factionName, updates);
                res.json(updatedFaction);
            } catch (err) {
                next(err);
            }
        });
    }
}