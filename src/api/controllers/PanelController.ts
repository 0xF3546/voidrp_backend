import { Router } from "express";
import { injectable, inject } from "tsyringe";
import { ValidationError } from "../../utils/error.js";
import { PanelService } from "../../core/services/PanelService.js";
import { AuthService } from "../../core/services/AuthService.js";
import checkAuth from "../../middlewares/checkAuth.js";

@injectable()
export class PanelController {
  public router: Router = Router();

  constructor(@inject(PanelService) private panelService: PanelService, @inject(AuthService) private authService: AuthService) {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get("/", checkAuth(), async (req, res, next) => {
      try {
        const user = await this.authService.getUserFromRequest(req);
        if (!user) {
            throw new ValidationError("User not found");
        }
        const charData = await this.panelService.getCharData(user);
        return res.status(200).json(charData);
      } catch (err) {
        next(err);
      }
    });
  }
}
