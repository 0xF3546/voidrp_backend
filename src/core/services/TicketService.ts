import Database from "../../utils/Database.js";
import { inject, injectable } from "tsyringe";
import { AuthService } from "./AuthService.js";

@injectable()
export class TicketService {
    constructor(@inject(Database) private database: Database, @inject(AuthService) private authService: AuthService) {
    }

    getCategories = async () => {
        var result = await this.database.query("SELECT * FROM web_ticket_categorys");
        return result;
    }

    getTicketsByUserId = async (userId: number, showClosed: boolean, size: number = 10, page: number = 1) => {
        var tickets: any = await this.database.query(`SELECT * FROM web_tickets WHERE creator = ? AND ${!showClosed && "closed = false"} ORDER BY created DESC LIMIT ${size} OFFSET ${page} `, [userId]);
        var ticketCount: any = await this.database.query("SELECT COUNT(*) as count FROM web_tickets WHERE creator = ? AND " + (showClosed ? "1" : "closed = false"), [userId]);
        var categories: any = await this.getCategories();
        const user = await this.authService.findByIdAsync(userId);

        tickets.forEach((ticket: any) => {
            let category = categories.find((x: any) => x.id == ticket.category);
            ticket.category = {
                type: category.name,
                typeColor: {
                    background: category.background,
                    font: category.font
                }
            }
            ticket.creatorName = `${user?.player_name}`
        });
        var response = {
            tickets: tickets,
            total: ticketCount[0].count,
            page: page,
            size: size
        }
        return response;
    }

    getTicketById = async (user: any, id: number) => {
        var response: any = await this.database.query("SELECT t.*, c.player_name FROM web_tickets AS t LEFT JOIN players AS c ON c.id = t.creator WHERE t.id = ?", [id]);

        if (!response.length) {
            return null;
        }

        var ticket = response[0];

        ticket.creatorName = ticket.player_name
        ticket.creatorId = ticket.creator;

        var categories: any = await this.getCategories();
        var category = categories.find((x: any) => x.id === ticket.category);
        if (!category) {
            return null;
        }

        ticket.category = {
            type: category.name,
            typeColor: {
                background: category.background,
                font: category.font
            }
        };

        user = await this.applyRankToUser(user);
        if (user) {
            ticket.isEditor = user.isPermittedEditor;
        }

        var messages: any = await this.database.query(
            `SELECT tm.*, c.id as charId, c.player_name, r.rang, r.hexColor AS color 
                 FROM web_ticket_messages AS tm 
                 LEFT JOIN players AS c ON tm.creator = c.id 
                 LEFT JOIN ranks AS r ON r.rang = c.player_rank 
                 WHERE tm.ticket = ?`,
            [ticket.id]
        );

        ticket.messages = messages.map((msg: any) => ({
            sender: {
                id: msg.charId,
                name: `${msg.player_name}`,
                rank: {
                    color: msg.color,
                    name: msg.rang
                }
            },
            message: {
                text: msg.message,
                send: msg.send,
                id: msg.id
            }
        }));

        if (ticket.closed == 1) {
            var closer: any = await this.database.query("SELECT player_name FROM players WHERE id = ?", [ticket.closedBy])
            if (closer.length) {
                ticket.closerName = `${closer[0].player_name}`;
            }
        }
        return ticket;
    }

    getByRank = async (rank: string, size: number = 10, page: number = 1) => {
        var categories: any = await this.getCategories();
        var response: any = await this.database.query(
            `SELECT t.*, c.player_name 
                    FROM web_tickets AS t 
                    LEFT JOIN players AS c ON c.id = t.creator WHERE t.closed = false
                    ORDER BY created DESC
                    LIMIT ? OFFSET ?`,
            [size, (page - 1) * size]
        );

        var tickets = response.map((r: any) => {
            var category = categories.find((x: any) => x.id === r.category);
            return {
                id: r.id,
                title: r.title,
                creatorId: r.creator,
                creatorName: `${r.firstname} ${r.lastname}`,
                created: r.created,
                category: {
                    type: category.name,
                    typeColor: {
                        background: category.background,
                        font: category.font
                    }
                }
            };
        });

        return tickets;
    }

    sendMessage = async (ticketId: number, userId: number, message: string) => {
        this.database.query("INSERT INTO web_ticket_messages (ticket, creator, message) VALUES (?, ?, ?)", [ticketId, userId, message]);
    }

    closeTicket = async (ticketId: number, userId: number) => {
        const ticket: any = await this.database.query("SELECT * FROM web_tickets WHERE id = ?", [ticketId]);
        if (!ticket.length) {
            throw new Error("Ticket not found");
        }
        await this.database.query("UPDATE web_tickets SET closed = 1, closedBy = ?, closedAt = NOW() WHERE id = ?", [userId, ticketId]);
    }

    createTicket = async (userId: number, title: string, category: number, message: string) => {
        const ticketId: any = await this.database.query("INSERT INTO web_tickets (creator, title, category, message) VALUES (?, ?, ?, ?)", [userId, title, category, message]);
        return ticketId.insertId;
    }

    removeMessage = async (messageId: number) => {
        await this.database.query("DELETE FROM web_ticket_messages WHERE id = ?", [messageId]);
    }


    editMessage = async (messageId: number, message: string) => {
        await this.database.query("UPDATE web_ticket_messages SET message = ?, edited = true WHERE id = ?", [message, messageId]);
    }

    isPermittedForTicket = async (userId: number, ticketId: number) => {
        const ticket: any = await this.database.query("SELECT * FROM web_tickets WHERE id = ?", [ticketId]);
        if (!ticket.length) {
            console.error("Ticket not found for ID:", ticketId);
            throw new Error("Ticket not found");
        }
        let user: any = await this.authService.findByIdAsync(userId);
        if (!user) {
            throw new Error("User not found");
        }
        if (ticket[0].creator == userId) {
            return true;
        }
        user = await this.applyRankToUser(user);
        if (!user) {
            throw new Error("User rank not found");
        }
        if (user.isPermittedEditor) {
            return true;
        }
    }


    private applyRankToUser = async (user: any) => {
        var response: any = await this.database.query("SELECT r.rang AS name, r.isWebTicketPermitted AS isWebTicketPermitted, r.hexColor AS color FROM ranks AS r LEFT JOIN players AS a ON a.player_rank = r.rang WHERE a.id = ?", [user.id]);
        if (!response.length) return false;
        user.rank = {
            name: response[0].name,
            color: response[0].color
        }

        user.isPermittedEditor = response[0].isWebTicketPermitted == 1;

        return user;
    }

    searchTickets = async (query: string, size: number = 10, page: number = 1) => {
        const searchQuery = `%${query}%`;
        const tickets: any = await this.database.query(
            `SELECT t.*, c.player_name 
                     FROM web_tickets AS t 
                     LEFT JOIN players AS c ON c.id = t.creator 
                     WHERE t.title LIKE ? OR t.message LIKE ? 
                     LIMIT ? OFFSET ?`,
            [searchQuery, searchQuery, size, (page - 1) * size]
        );

        const categories: any = await this.getCategories();

        tickets.forEach((ticket: any) => {
            let category = categories.find((x: any) => x.id == ticket.category);
            ticket.category = {
                type: category.name,
                typeColor: {
                    background: category.background,
                    font: category.font
                }
            }
        });

        return tickets;
    }
}