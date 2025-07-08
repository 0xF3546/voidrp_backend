import checkAuth from "../../middlewares/checkAuth.js";
import { AuthService } from "../../core/services/AuthService.js";
import { ValidationError } from "../../utils/error.js";
import { Router } from "express";
import { inject, injectable } from "tsyringe";
import { TicketService } from "../../core/services/TicketService.js";

@injectable()
export class TicketController {
  public router: Router = Router();

  constructor(@inject(AuthService) private authService: AuthService, @inject(TicketService) private ticketService: TicketService) {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get("/", checkAuth(), async (req, res, next) => {
      try {
        const user = await this.authService.getUserFromRequest(req);
        if (!user) {
          throw new ValidationError("You must be logged in to view your tickets.");
        }
        const showClosed = req.query.showClosed === "true";
        const size = parseInt(req.query.size as string) || 10;
        const page = parseInt(req.query.page as string) || 1;

        const tickets = await this.ticketService.getTicketsByUserId(user.id, showClosed, size, page);
        return res.status(200).json(tickets);
      } catch (err) {
        next(err);
      }
    });

    this.router.get("/categories", checkAuth(), async (req, res, next) => {
      const categories = await this.ticketService.getCategories();
      return res.status(200).json(categories);
    });

    this.router.get("/:id", checkAuth(), async (req, res, next) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          throw new ValidationError("Invalid ticket ID.");
        }
        const user = await this.authService.getUserFromRequest(req);
        const ticket = await this.ticketService.getTicketById(user, id);
        if (!ticket) {
          return res.status(404).json({ message: "Ticket not found." });
        }
        if (!user) {
          throw new ValidationError("You must be logged in to view this ticket.");
        }
        if (!this.ticketService.isPermittedForTicket(user.id, id)) {
          return res.status(403).json({ message: "You do not have permission to view this ticket." });
        }
        return res.status(200).json(ticket);
      } catch (err) {
        next(err);
      }
    });

    this.router.post("/", checkAuth(), async (req, res, next) => {
      try {
        const user = await this.authService.getUserFromRequest(req);
        if (!user) {
          throw new ValidationError("You must be logged in to create a ticket.");
        }
        const { title, message, category } = req.body;
        if (!title || !message || !category) {
          throw new ValidationError("Title, description, and category are required.");
        }
        const ticket = await this.ticketService.createTicket(user.id, title, category, message);
        return res.status(201).json({id: ticket});
      } catch (err) {
        next(err);
      }
    });

    this.router.post("/:id/close", checkAuth(), async (req, res, next) => {
      try {
        const user = await this.authService.getUserFromRequest(req);
        if (!user) {
          throw new ValidationError("You must be logged in to close a ticket.");
        }
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          throw new ValidationError("Invalid ticket ID.");
        }
        const ticket = await this.ticketService.getTicketById(user, id);
        if (!ticket) {
          return res.status(404).json({ message: "Ticket not found." });
        }
        if (!this.ticketService.isPermittedForTicket(user.id, id)) {
          return res.status(403).json({ message: "You do not have permission to close this ticket." });
        }
        await this.ticketService.closeTicket(id, user.id);
        return res.status(200).json({ message: "Ticket closed successfully." });
      } catch (err) {
        next(err);
      }
    });

    this.router.post("/:id/message", checkAuth(), async (req, res, next) => {
      try {
        const user = await this.authService.getUserFromRequest(req);
        if (!user) {
          throw new ValidationError("You must be logged in to send a message.");
        }
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          throw new ValidationError("Invalid ticket ID.");
        }
        const { message } = req.body;
        if (!message) {
          throw new ValidationError("Message cannot be empty.");
        }
        if (!this.ticketService.isPermittedForTicket(user.id, id)) {
          return res.status(403).json({ message: "You do not have permission to send a message to this ticket." });
        }
        await this.ticketService.sendMessage(id, user.id, message);
        return res.status(200).json({ message: "Message sent successfully." });
      } catch (err) {
        next(err);
      }
    });

    this.router.delete("/:id/message/:messageId", checkAuth(), async (req, res, next) => {
      try {
        const user = await this.authService.getUserFromRequest(req);
        if (!user) {
          throw new ValidationError("You must be logged in to delete a message.");
        }
        const id = parseInt(req.params.id);
        const messageId = parseInt(req.params.messageId);
        if (isNaN(id) || isNaN(messageId)) {
          throw new ValidationError("Invalid ticket or message ID.");
        }
        if (!this.ticketService.isPermittedForTicket(user.id, id)) {
          return res.status(403).json({ message: "You do not have permission to delete this message." });
        }
        await this.ticketService.removeMessage(messageId);
        return res.status(200).json({ message: "Message deleted successfully." });
      } catch (err) {
        next(err);
      }
    });

    this.router.put("/:id/message/:messageId", checkAuth(), async (req, res, next) => {
      try {
        const user = await this.authService.getUserFromRequest(req);
        if (!user) {
          throw new ValidationError("You must be logged in to edit a message.");
        }
        const id = parseInt(req.params.id);
        const messageId = parseInt(req.params.messageId);
        if (isNaN(id) || isNaN(messageId)) {
          throw new ValidationError("Invalid ticket or message ID.");
        }
        const { message } = req.body;
        if (!message) {
          throw new ValidationError("Message cannot be empty.");
        }
        if (!this.ticketService.isPermittedForTicket(user.id, id)) {
          return res.status(403).json({ message: "You do not have permission to edit this message." });
        }
        await this.ticketService.editMessage(messageId, message);
        return res.status(200).json({ message: "Message edited successfully." });
      } catch (err) {
        next(err);
      }
    });

    this.router.get("/search", checkAuth(), async (req, res, next) => {
      try {
        const user = await this.authService.getUserFromRequest(req);
        if (!user) {
          throw new ValidationError("You must be logged in to search tickets.");
        }
        const query = req.query.q as string;
        if (!query) {
          throw new ValidationError("Search query cannot be empty.");
        }
        const tickets = await this.ticketService.searchTickets(query, user.id);
        return res.status(200).json(tickets);
      } catch (err) {
        next(err);
      }
    });
  }
}