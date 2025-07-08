import { Router } from "express";
import { DiscordController } from "./DiscordController.js";
import { container } from "tsyringe";
import { AuthController } from "./AuthController.js";
import { TicketController } from "./TicketController.js";
import { HomeController } from "./HomeController.js";
import { FactionController } from "./FactionController.js";
import { AdminController } from "./AdminController.js";
import { PanelController } from "./PanelController.js";

const router: Router = Router();

const discordController = container.resolve(DiscordController);
const authController = container.resolve(AuthController);
const ticketController = container.resolve(TicketController);
const homeController = container.resolve(HomeController);
const factionController = container.resolve(FactionController);
const adminController = container.resolve(AdminController);
const panelController = container.resolve(PanelController);

router.use("/", homeController.router);
router.use("/auth", authController.router);
router.use("/tickets", ticketController.router);
router.use("/faction", factionController.router);
router.use("/panel", panelController.router);
//router.use("/teamspeak", TeamSpeakRouter);
router.use("/discord", discordController.router);
router.use("/admin", adminController.router);

export const MainRouter: Router = router;