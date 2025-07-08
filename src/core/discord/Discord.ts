import { ActionRowBuilder, ActivityType, ButtonBuilder, ButtonStyle, Client, CommandInteraction, EmbedBuilder, GatewayIntentBits, GuildMember, Message, MessageComponentInteraction, REST, Routes } from 'discord.js';
import { database } from '../../index.js';
import axios from 'axios';
import { config } from './config/config.js';

interface ICommand {
    name: string;
    description?: string;
    action?: (interaction: CommandInteraction) => void;
    options?: any[];
}

export class Command {
    public name: string;
    protected _description: string;
    protected _action?: (interaction: CommandInteraction) => void;
    protected _options?: any[];

    constructor(name: string, description: string, action?: (interaction: CommandInteraction) => void, options?: any[]) {
        this.name = name;
        this._description = description;
        this._action = action;
        this._options = options;
    }

    get description() {
        return this._description;
    }

    get action() {
        return this._action;
    }

    get options() {
        return this._options;
    }
}

export class DiscordBot {
    private client: Client;
    private verifications: any = [];
    private commands: Command[] = []
    private interval = setInterval(() => {
        this.updatePresence();
        
    }, 30000)

    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages
            ]
        });

        this.client.once('ready', async () => {
            new FFAStats(this);
            new HelpCommand(this);
            new PlayersCommand(this);
            new SelfCommand(this);

            console.log('Bot ist online!');
            await this.registerCommands();
            this.updatePresence();
        });

        this.client.on('messageCreate', this.onMessage);
        this.client.on('interactionCreate', this.onInteraction);
        this.client.on('guildMemberAdd', this.onGuildJoin)

        this.client.login(config.token);
    }

    public updatePresence = async () => {
        const [mcStatusRes] = await Promise.all([
            axios.get("https://api.mcsrvstat.us/2/voidroleplay.de")
        ]);

        const online = mcStatusRes.data?.players?.online ?? 0;
        this.client.user?.setPresence({
            activities: [{ name: `mit ${online} Spieler${online !== 1 ? 'n' : '' }`, type: ActivityType.Playing }],
            status: 'online'
        })
    }

    private onMessage = (message: Message) => {
        console.log("Registered message: " + message);
        if (message.author.bot) return;

        if (message.content === '!ping') {
            message.reply('Pong!');
        }
    }

    private onInteraction = async (interaction: any) => {
        if (!interaction.isChatInputCommand()) return;
        var inter: CommandInteraction = interaction;

        const { commandName } = interaction;

        this.onCommand(commandName, inter);
    }

    private onGuildJoin = async (member: GuildMember) => {
        try {
            const roleId = '1292182262825357383';
            const role = member.guild.roles.cache.get(roleId);

            if (role) {
                await member.roles.add(role);
                console.log(`Rolle ${role.name} wurde ${member.user.username} zugewiesen.`);
                if (!(await this.isLinked(member.id))) {
                    member.send(`Hey <@${member.id}>! Du bist noch nicht verifiziert - nutze "/discord link ${member.id}" auf dem Minecraft-Server (voidroleplay.de) um dich zu verlinken.`)
                }
            } else {
                console.error(`Rolle mit ID ${roleId} wurde nicht gefunden.`);
            }
        } catch (error) {
            console.error(`Fehler beim Zuweisen der Rolle: ${error}`);
        }
    }

    private isLinked = async (id: string) => {
        const result: any = await database.query("SELECT COUNT(*) AS count FROM players WHERE discordId = ?", [id]);
        return result[0]?.count > 0;
    }

    private async registerCommands() {
        // Ensure that the commands are correctly formatted
        const commands = this.commands.map(cmd => ({
            name: cmd.name,
            description: cmd.description,
            options: cmd.options || []
        }));

        const rest = new REST({ version: '10' }).setToken(config.token);

        try {
            console.log('Started refreshing application (/) commands.');

            await rest.put(
                Routes.applicationCommands(config.clientId),
                { body: commands },
            );

            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    }


    public sendPrivateMessage = async (
        clientId: string,
        title: string,
        message: string,
        color: any = 0x7289da,
        components?: any // optional für Buttons
    ) => {
        try {
            const user = await this.getUserById(clientId);
            if (user) {
                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(message)
                    .setColor(color)
                    .setFooter({
                        text: 'Void Roleplay - Reallife & Roleplay',
                        iconURL: 'https://voidroleplay.de/static/media/logo.fdc91f11e4c60e47760d.png'
                    });

                console.log(`Nachricht an ${user.username} gesendet.`);

                const payload: any = {
                    embeds: [embed]
                };

                if (components) {
                    payload.components = components;
                }

                return await user.send(payload);
            } else {
                console.log('Benutzer nicht gefunden.');
            }
        } catch (error) {
            console.error('Fehler beim Senden der Nachricht:', error);
        }
    };


    public verifyUser = async (
        syncToken: string,
        id: string,
        player_name: string
    ): Promise<boolean> => {
        console.log(`Verifiziere Benutzer: (${id}) für Spieler: ${player_name}`);
        try {
            const user = await this.client.users.fetch(id);
            if (!user) {
                console.log(`Benutzer mit ID ${id} nicht gefunden.`);
                return false;
            }
            console.log(`Benutzer gefunden: ${user.tag} (${user.id})`);

            this.verifications.push({ uuid: id, user });

            const acceptButton = new ButtonBuilder()
                .setCustomId(`verify_accept_${id}`)
                .setLabel("Annehmen")
                .setEmoji("✅")
                .setStyle(ButtonStyle.Success);
            const declineButton = new ButtonBuilder()
                .setCustomId(`verify_decline_${id}`)
                .setLabel("Ablehnen")
                .setEmoji("❌")
                .setStyle(ButtonStyle.Danger);

            const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                acceptButton,
                declineButton
            );

            const message = await this.sendPrivateMessage(
                user.id,
                "Verifikation",
                `${player_name} möchte sich mit deinem Discord Account verbinden. Bitte bestätige oder lehne die Anfrage ab.`,
                0x7289da,
                [actionRow]
            );

            if (!message) {
                console.log(`Fehler beim Senden der DM an ${user.tag}`);
                return false;
            }

            const filter = (interaction: MessageComponentInteraction) =>
                interaction.customId.startsWith("verify_") && interaction.user.id === user.id;
            const collector = message.createMessageComponentCollector({
                filter,
                time: 60000,
            });

            if (!collector) {
                console.log("Collector konnte nicht erstellt werden.");
                return false;
            }

            collector.on("collect", async (interaction: MessageComponentInteraction) => {
                await interaction.deferUpdate();

                if (interaction.customId === `verify_accept_${id}`) {
                    await this.handleApproval(syncToken, user, player_name);
                    await interaction.followUp({
                        content: "Verifikation bestätigt!",
                        ephemeral: true,
                    });
                } else if (interaction.customId === `verify_decline_${id}`) {
                    await this.handleRejection(syncToken, user, player_name);
                    await interaction.followUp({
                        content: "Verifikation abgelehnt.",
                        ephemeral: true,
                    });
                }
                collector.stop();
            });

            collector.on("end", (collected, reason) => {
                if (reason === "time") {
                    this.handleTimeout(id, user);
                    this.sendPrivateMessage(
                        user.id,
                        "Verifikation abgelaufen",
                        "Die Verifikationsanfrage ist abgelaufen. Bitte versuche es erneut."
                    );
                }
            });

            return true;
        } catch (error) {
            console.error(`Fehler bei der Verifizierung des Benutzers ${id}:`, error);
            return false;
        }
    };

    private async handleApproval(syncToken: string, user: any, player_name: string) {
        console.log(`User ${user.tag} hat die Verbindung für ${player_name} bestätigt.`);
        database.query("UPDATE players SET discordId = ? WHERE syncToken = ?", [user.id, syncToken])
    }

    private async handleRejection(syncToken: string, user: any, player_name: string) {
        this.removeToken(syncToken);
    }
    private async removeToken(syncToken: string) {
        database.query("UPDATE players SET syncToken = NULL WHERE syncToken = ?", [syncToken]);
    }

    private async handleTimeout(syncToken: string, user: any) {
        this.removeToken(syncToken);
    }

    public getUserById = async (clientId: string) => {
        return await this.client.users.fetch(clientId);
    }

    public setClientName = async (clientId: string, name: string) => {
        const user = this.getUserById(clientId);
        (await user).username = name;
    }

    private onCommand = (commandName: string, interaction: CommandInteraction) => {
        const command = this.commands.find(cmd => cmd.name === commandName);
        if (command && command.action) {
            command.action(interaction);
        } else {
            console.log(`Command not found: ${commandName}`);
        }
    }

    public addCommand(command: Command) {
        this.commands.push(command);
    }
}

class HelpCommand extends Command {
    constructor(discordBot: DiscordBot) {
        super("help", "Erhalte eine Übersicht zu wichtigen Befehlen");

        this._action = async (interaction: any) => {
            try {
                const embed = new EmbedBuilder()
                    .setTitle("📘 Hilfe & Befehlsübersicht")
                    .setDescription("Hier ist eine Übersicht der verfügbaren Slash-Befehle:")
                    .addFields(
                        { name: "/self", value: "Zeigt deine eigenen Daten an", inline: false },
                        { name: "/players", value: "Zeigt die Anzahl aller Spieler & Minecraft-Online-Spieler", inline: false },
                        { name: "/ffastats [player]", value: "Zeigt FFA-Statistiken eines Spielers", inline: false },
                        { name: "/help", value: "Zeigt diese Übersicht", inline: false }
                    )
                    .setColor("Aqua")
                    .setFooter({
                        text: 'Void Roleplay - Reallife & Roleplay',
                        iconURL: 'https://voidroleplay.de/static/media/logo.fdc91f11e4c60e47760d.png'
                    });

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } catch (error) {
                console.error("Fehler beim Ausführen von /help:", error);

                if (!interaction.replied && !interaction.deferred) {
                    try {
                        await interaction.reply({
                            content: "❌ Fehler beim Anzeigen der Hilfe.",
                            ephemeral: true
                        });
                    } catch (replyError) {
                        console.error("Fehler beim Antworten:", replyError);
                    }
                }
            }
        };

        discordBot.addCommand(this);
    }
}


class PlayersCommand extends Command {
    constructor(discordBot: DiscordBot) {
        super("players", "Erhalte die Anzahl aller Spieler online.");

        this._action = async (interaction) => {
            try {
                await interaction.deferReply(); // Sofort antworten

                const [countResRaw, mcStatusRes] = await Promise.all([
                    database.query("SELECT COUNT(*) AS count FROM players"),
                    axios.get("https://api.mcsrvstat.us/2/voidroleplay.de")
                ]);

                const countRes = countResRaw as { count: number }[];
                const count = countRes[0].count;
                const online = mcStatusRes.data?.players?.online ?? 0;

                const embed = new EmbedBuilder()
                    .setTitle("Spielerstatistik")
                    .setDescription(`Es sind ${online} Minecraft-Spieler online & ${count} registriert`)
                    .setColor("Aqua")
                    .setFooter({ text: 'Void Roleplay - Minecraft', iconURL: 'https://voidroleplay.de/static/media/logo.fdc91f11e4c60e47760d.png' });

                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                console.error("Fehler beim Abrufen der Spielerzahlen:", error);

                // Versuche, eine Antwort zu schicken, wenn möglich
                if (interaction.deferred || interaction.replied) {
                    try {
                        await interaction.editReply("Fehler beim Laden der Minecraft-Spieleranzahl.");
                    } catch (editError) {
                        console.error("Fehler beim Editieren der Fehlermeldung:", editError);
                    }
                } else {
                    try {
                        await interaction.reply("Fehler beim Laden der Minecraft-Spieleranzahl.");
                    } catch (replyError) {
                        console.error("Fehler beim Antworten auf Interaction:", replyError);
                    }
                }
            }
        };
        discordBot.addCommand(this);
    }
}

class FFAStats extends Command {
    constructor(discordBot: DiscordBot) {
        super(
            "ffastats",
            "Erhalte die FFA-Stats eines Spielers",
            async (interaction: any) => {
                try {
                    const playerName = interaction.options.getString('player');

                    if (!playerName) {
                        await interaction.reply({
                            content: "❌ Kein Spielername angegeben.",
                            ephemeral: true
                        });
                        return;
                    }

                    const statsResult: any = await database.query(
                        `
                        SELECT
                            COALESCE(SUM(CASE WHEN s.statsType = 'ALL_TIME' THEN s.kills ELSE 0 END), 0) AS all_time_kills,
                            COALESCE(SUM(CASE WHEN s.statsType = 'ALL_TIME' THEN s.deaths ELSE 0 END), 0) AS all_time_deaths,
                            COALESCE(SUM(CASE WHEN s.statsType = 'WEEKLY' THEN s.kills ELSE 0 END), 0) AS weekly_kills,
                            COALESCE(SUM(CASE WHEN s.statsType = 'WEEKLY' THEN s.deaths ELSE 0 END), 0) AS weekly_deaths,
                            COALESCE(SUM(CASE WHEN s.statsType = 'MONTHLY' THEN s.kills ELSE 0 END), 0) AS monthly_kills,
                            COALESCE(SUM(CASE WHEN s.statsType = 'MONTHLY' THEN s.deaths ELSE 0 END), 0) AS monthly_deaths
                        FROM
                            player_ffa_stats s
                        INNER JOIN
                            players p ON s.uuid = p.uuid
                        WHERE
                            p.player_name = ?
                        GROUP BY
                            p.uuid;
                        `,
                        [playerName]
                    );

                    let embed: EmbedBuilder;

                    if (!statsResult || statsResult.length === 0) {
                        embed = new EmbedBuilder()
                            .setTitle(`${playerName}'s FFA-Statistiken`)
                            .setDescription("📭 Der Spieler hat keine Statistiken!")
                            .setColor('Red')
                            .setFooter({
                                text: 'Void Roleplay - Reallife & Roleplay',
                                iconURL: 'https://voidroleplay.de/static/media/logo.fdc91f11e4c60e47760d.png'
                            });
                    } else {
                        const stats = statsResult[0];

                        const safeKD = (kills: number, deaths: number): string =>
                            deaths === 0 ? `${kills}.00` : (kills / deaths).toFixed(2);

                        embed = new EmbedBuilder()
                            .setTitle(`${playerName}'s FFA-Statistiken`)
                            .addFields(
                                { name: 'All Time Kills', value: `${stats.all_time_kills}`, inline: true },
                                { name: 'All Time Deaths', value: `${stats.all_time_deaths}`, inline: true },
                                { name: 'All Time K/D', value: safeKD(stats.all_time_kills, stats.all_time_deaths), inline: true },

                                { name: 'Weekly Kills', value: `${stats.weekly_kills}`, inline: true },
                                { name: 'Weekly Deaths', value: `${stats.weekly_deaths}`, inline: true },
                                { name: 'Weekly K/D', value: safeKD(stats.weekly_kills, stats.weekly_deaths), inline: true },

                                { name: 'Monthly Kills', value: `${stats.monthly_kills}`, inline: true },
                                { name: 'Monthly Deaths', value: `${stats.monthly_deaths}`, inline: true },
                                { name: 'Monthly K/D', value: safeKD(stats.monthly_kills, stats.monthly_deaths), inline: true }
                            )
                            .setColor('Orange')
                            .setFooter({
                                text: 'Void Roleplay - Reallife & Roleplay',
                                iconURL: 'https://voidroleplay.de/static/media/logo.fdc91f11e4c60e47760d.png'
                            });
                    }

                    await interaction.reply({ embeds: [embed] });
                } catch (error) {
                    console.error("Fehler bei /ffastats:", error);

                    if (!interaction.replied && !interaction.deferred) {
                        try {
                            await interaction.reply({
                                content: "❌ Beim Laden der FFA-Statistiken ist ein Fehler aufgetreten.",
                                ephemeral: true
                            });
                        } catch (replyError) {
                            console.error("Fehler beim Antworten auf Interaction:", replyError);
                        }
                    }
                }
            },
            [
                {
                    name: 'player',
                    type: 3, // STRING
                    description: 'Der Name des Spielers',
                    required: true
                }
            ]
        );

        discordBot.addCommand(this);
    }
}


class SelfCommand extends Command {
    constructor(discordBot: DiscordBot) {
        super("self", "Erhalte deine eigenen Daten", async (interaction: any) => {
            try {
                const result: any = await database.query("SELECT * FROM players WHERE discordId = ?", [interaction.user.id]);

                if (!result || result.length === 0) {
                    await interaction.reply({
                        content: "Du bist nicht verifiziert! Bitte verifiziere dich zuerst.",
                        ephemeral: true
                    });
                    return;
                }

                const player = result[0];
                const user = interaction.user;

                const embed = new EmbedBuilder()
                    .setTitle("Deine Verknüpfung")
                    .setDescription(
                        `**Minecraft-Name:** ${player.player_name}\n**ID:** ${player.id}`
                    )
                    .setColor("Aqua")
                    .setFooter({
                        text: 'Void Roleplay - Reallife & Roleplay',
                        iconURL: 'https://voidroleplay.de/static/media/logo.fdc91f11e4c60e47760d.png'
                    });

                await interaction.reply({ embeds: [embed], ephemeral: true }); // Optional: Ephemeral für Privatsphäre

            } catch (error) {
                console.error("Fehler im /self-Befehl:", error);
                if (!interaction.replied && !interaction.deferred) {
                    try {
                        await interaction.reply({
                            content: "Ein Fehler ist aufgetreten beim Abrufen deiner Daten.",
                            ephemeral: true
                        });
                    } catch (replyError) {
                        console.error("Fehler beim Antworten:", replyError);
                    }
                }
            }
        });

        discordBot.addCommand(this);
    }
}