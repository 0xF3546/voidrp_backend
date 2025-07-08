import { inject, injectable } from "tsyringe";
import Database from "../../utils/Database.js";
import { AuthService } from "./AuthService.js";
import { ResponseListModel } from "../../types/ResponseListModel.js";

@injectable()
export class AdminService {
    constructor(@inject(Database) private database: Database, @inject(AuthService) private authService: AuthService) {
    }

    async getPlayers(search: string | null, size: number = 10, page: number = 1) {
        const hasSearch = !!search;
        const query = `
            SELECT 
                p.id, 
                p.player_name, 
                p.uuid, 
                p.player_permlevel
            FROM players AS p
            ${hasSearch ? "WHERE p.player_name LIKE ?" : ""}
            ORDER BY p.player_name ASC
            LIMIT ? OFFSET ?;
        `;
        const params = hasSearch ? [`%${search}%`, size, (page - 1) * size] : [size, (page - 1) * size];
        const players: any = await this.database.query(query, params);
        const totalPlayers: any = await this.database.query("SELECT COUNT(*) AS count FROM players");
        var response: ResponseListModel<any> = {
            items: players,
            total: totalPlayers[0].count,
            page: page,
            size: size
        }
        return response;
    }

    async getOnlinePlayers(search: string | null, size: number = 10, page: number = 1) {
        const hasSearch = !!search;
        const query = `
            SELECT
                po.joinedAt,
                p.player_name,
                p.uuid,
                p.player_permlevel
            FROM players_online AS po
            INNER JOIN players AS p ON po.uuid = p.uuid
            ${hasSearch ? "WHERE p.player_name LIKE ?" : ""}
            ORDER BY p.player_name ASC
            LIMIT ? OFFSET ?;
        `;
        const params = hasSearch ? [`%${search}%`, size, (page - 1) * size] : [size, (page - 1) * size];
        const players: any = await this.database.query(query, params);
        const totalPlayers: any = await this.database.query("SELECT COUNT(*) AS count FROM players_online");
        var response: ResponseListModel<any> = {
            items: players,
            total: totalPlayers[0].count,
            page: page,
            size: size
        }
        return response;
    }

    async getPlayerByUUID(uuid: string): Promise<any> {
        const query = `
        SELECT 
            p.id, 
            p.player_name, 
            p.uuid, 
            p.player_permlevel,
            p.firstjoin,
            p.lastlogin,
            p.bargeld,
            p.bank,
            p.firstname,
            p.lastname,
            p.gender,
            p.birthday,
            p.visum,
            p.playtime_minutes,
            p.playtime_hours,
            p.faction,
            p.faction_grade,
            p.isLeader,
            p.exp,
            p.level,
            p.isDead,
            p.houseSlot,
            p.secondaryTeam,
            p.coins,
            p.votes,
            p.crypto,
            p.gwd,
            p.zd,
            p.inventorySize,
            p.loyaltyBonus,
            p.loginStreak,
            p.healthInsurance,
            p.discordId,

            pl.license AS license_license,
            pl.received AS license_received,

            pii.item AS inventory_item,
            pii.amount AS inventory_amount,

            pw.weapon AS weapon_weapon,
            pw.ammo AS weapon_ammo,
            pw.current_ammo AS weapon_current_ammo,

            pv.type AS vehicle_type,
            pv.id AS vehicle_id,

            n.uuid AS note_uuid,
            n.note AS note_note,
            n.entryAdded AS note_entryAdded

        FROM players AS p
        LEFT JOIN player_licenses AS pl ON p.uuid = pl.uuid
        LEFT JOIN player_inventory_items AS pii ON p.uuid = pii.uuid
        LEFT JOIN player_vehicles AS pv ON p.uuid = pv.uuid
        LEFT JOIN player_weapons AS pw ON p.uuid = pw.uuid
        LEFT JOIN notes AS n ON p.uuid = n.target
        WHERE p.uuid = ?;
    `;

        const rows: any = await this.database.query(query, [uuid]);
        if (!rows || rows.length === 0) {
            return null;
        }

        const firstRow = rows[0];

        const player: any = {
            id: firstRow.id,
            player_name: firstRow.player_name,
            uuid: firstRow.uuid,
            player_permlevel: firstRow.player_permlevel,
            firstjoin: firstRow.firstjoin,
            lastlogin: firstRow.lastlogin,
            bargeld: firstRow.bargeld,
            bank: firstRow.bank,
            firstname: firstRow.firstname,
            lastname: firstRow.lastname,
            gender: firstRow.gender,
            birthday: firstRow.birthday,
            visum: firstRow.visum,
            playtime_minutes: firstRow.playtime_minutes,
            playtime_hours: firstRow.playtime_hours,
            faction: firstRow.faction,
            faction_grade: firstRow.faction_grade,
            isLeader: !!firstRow.isLeader,
            exp: firstRow.exp,
            level: firstRow.level,
            isDead: !!firstRow.isDead,
            houseSlot: firstRow.houseSlot,
            secondaryTeam: firstRow.secondaryTeam,
            coins: firstRow.coins,
            votes: firstRow.votes,
            crypto: firstRow.crypto,
            gwd: firstRow.gwd,
            zd: firstRow.zd,
            inventorySize: firstRow.inventorySize,
            loyaltyBonus: firstRow.loyaltyBonus,
            loginStreak: firstRow.loginStreak,
            healthInsurance: !!firstRow.healthInsurance,
            discordId: firstRow.discordId,
            license: [],
            inventory: [],
            vehicles: [],
            weapons: [],
            notes: []
        };

        const licenseSet = new Set<string>();
        const inventorySet = new Set<string>();
        const weaponSet = new Set<string>();
        const vehicleSet = new Set<number>();
        const noteSet = new Set<string>();

        for (const row of rows) {
            // License (key: license|received)
            if (row.license_license && row.license_received) {
                const key = `${row.license_license}|${row.license_received}`;
                if (!licenseSet.has(key)) {
                    licenseSet.add(key);
                    player.license!.push({
                        license: row.license_license,
                        received: row.license_received
                    });
                }
            }

            // Inventory
            if (row.inventory_item && row.inventory_amount !== null) {
                const key = row.inventory_item;
                if (!inventorySet.has(key)) {
                    inventorySet.add(key);
                    player.inventory!.push({
                        item: row.inventory_item,
                        amount: row.inventory_amount
                    });
                }
            }

            // Weapons
            if (
                row.weapon_weapon &&
                row.weapon_ammo !== null &&
                row.weapon_current_ammo !== null
            ) {
                const key = row.weapon_weapon;
                if (!weaponSet.has(key)) {
                    weaponSet.add(key);
                    player.weapons!.push({
                        weapon: row.weapon_weapon,
                        ammo: row.weapon_ammo,
                        current_ammo: row.weapon_current_ammo
                    });
                }
            }

            // Vehicles
            if (row.vehicle_type && row.vehicle_id !== null) {
                const id = row.vehicle_id;
                if (!vehicleSet.has(id)) {
                    vehicleSet.add(id);
                    player.vehicles!.push({
                        type: row.vehicle_type,
                        id: id
                    });
                }
            }

            // Notes
            if (row.note_uuid && row.note_note && row.note_entryAdded) {
                const uuid = row.note_uuid;
                if (!noteSet.has(uuid)) {
                    noteSet.add(uuid);
                    player.notes!.push({
                        uuid: uuid,
                        note: row.note_note,
                        entryAdded: row.note_entryAdded
                    });
                }
            }
        }


        return player;
    }



    async getBannedPlayers(search: string | null, size: number = 10, page: number = 1) {
        const hasSearch = !!search;
        const query = `
            SELECT
                pb.date,
                pb.reason,
                pb.isPermanent,
                p.player_name,
                p.uuid
            FROM player_bans AS pb
            INNER JOIN players AS p ON pb.uuid = p.uuid
            ${hasSearch ? "WHERE p.player_name LIKE ?" : ""}
            ORDER BY p.player_name ASC
            LIMIT ? OFFSET ?;
        `;
        const params = hasSearch ? [`%${search}%`, size, (page - 1) * size] : [size, (page - 1) * size];
        const bans: any = await this.database.query(query, params);
        const totalBans: any = await this.database.query("SELECT COUNT(*) AS count FROM player_bans");
        var response: ResponseListModel<any> = {
            items: bans,
            total: totalBans[0].count,
            page: page,
            size: size
        }
        return response;
    }

    getLogs = async () => {
        const commandLogEntries: any = await this.database.query("SELECT COUNT(*) AS count FROM command_logs");
        const chatLogEntries: any = await this.database.query("SELECT COUNT(*) AS count FROM chat_logs");
        const geldLogEntries: any = await this.database.query("SELECT COUNT(*) AS count FROM money_logs");
        const bankLogEntries: any = await this.database.query("SELECT COUNT(*) AS count FROM bank_logs");
        return [
            {
                name: "Command Logs",
                type: "command",
                entries: commandLogEntries[0].count
            },
            {
                name: "Chat Logs",
                type: "chat",
                entries: chatLogEntries[0].count
            },
            {
                name: "Money Logs",
                type: "money",
                entries: geldLogEntries[0].count
            },
            {
                name: "Bank Logs",
                type: "bank",
                entries: bankLogEntries[0].count
            }
        ]
    }

    getFactions = async () => {
        const factions: any = await this.database.query("SELECT name, fullname FROM factions");
        for (const faction of factions) {
            faction.members = await this.database.query("SELECT COUNT(*) AS count FROM players WHERE faction = ?", [faction.fullname]);
            faction.members = faction.members[0].count;
        }
        return factions;
    }

    getFactionByName = async (name: string) => {
        const query = `
            SELECT 
                name,
                fullname,
                bank,
                maxMember,
                hasBlacklist,
                hasLaboratory,
                doGangwar,
                isActive,
                isBadFrak,
                motd,
                equipPoints,
                type,
                description,
                image
            FROM factions
            WHERE LOWER(name) = ?;
        `;
        const result: any = await this.database.query(query, [name.toLowerCase()]);
        const membersQuery = `
            SELECT player_name, uuid, isLeader, faction_grade
            FROM players
            WHERE faction = ?;
        `;
        const members: any = await this.database.query(membersQuery, [result[0].name]);
        result[0].members = members;
        if (result.length === 0) {
            return null;
        }
        return result[0];
    }

    updateFaction = async (name: string, data: any) => {
        const query = `
            UPDATE factions
            SET 
                maxMember = ?,
                hasBlacklist = ?,
                hasLaboratory = ?,
                doGangwar = ?,
                isActive = ?,
                isBadFrak = ?,
                description = ?,
                image = ?
            WHERE LOWER(name) = ?;
        `;
        const params = [
            data.maxMember,
            data.hasBlacklist ? 1 : 0,
            data.hasLaboratory ? 1 : 0,
            data.doGangwar ? 1 : 0,
            data.isActive ? 1 : 0,
            data.isBadFrak ? 1 : 0,
            data.description || "",
            data.image || "",
            name.toLowerCase()
        ];
        await this.database.query(query, params);
    }
}