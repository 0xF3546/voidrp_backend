import { AuthService } from "../../core/services/AuthService.js";
import { ValidationError } from "../../utils/error.js";
import { Router } from "express";
import { inject, injectable } from "tsyringe";

@injectable()
export class AuthController {
  public router: Router = Router();

    constructor(@inject(AuthService) private authService: AuthService) {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post("/login", async (req, res, next) => {
            try {
                    let { user, password } = req.body;
                    user = user.trim();
                
                    if (password.includes(" ")) {
                      throw new ValidationError("password cannot have spaces");
                    } else if (password.length < 8) {
                      throw new ValidationError("password should be at least 8 characters long");
                    }
                
                    user = await this.authService.findByNameAsync(user);
                    if (!user || !(password == user.password)) {
                      throw new ValidationError("incorrect username or password");
                    }
                
                    const token = await this.authService.signInAsync(user, password);
                    res.json({
                      token,
                      user: {
                        uuid: user.uuid,
                        name: user.player_name,
                        permission: user.player_permlevel,
                        isAdmin: this.authService.isUserAdmin(user)
                      },
                    });
                  } catch (err) {
                    next(err);
                  }
        });
    }
}