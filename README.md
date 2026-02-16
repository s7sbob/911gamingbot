# 911GamingBot

911GamingBot is a self‑hosted Discord bot built with **TypeScript** and **discord.js v14** for the **911 Gaming Store** community.  It provides a modular, extensible architecture so that new features can be added easily without having to wade through a large monolithic file.  The bot implements several core features:

* A **ticket system** that opens a private support channel for a member, logs the conversation, generates an HTML transcript using `discord-html-transcripts` and delivers it to a configurable channel before deleting the ticket.
* A **verification system** that posts an embed with a **Verify** button; clicking the button automatically assigns the configured verification role.
* **Moderation commands** (`/ban`, `/kick`, `/mute`, `/unmute`) with automatic logging to a moderation‑log channel.  Discord’s timeout API is used for temporary mutes.
* An **advertising/posting system** that allows administrators to send announcements or advertisements to a designated channel with optional image and `@everyone` mention.
* A **music player** powered by **@discordjs/voice** and **play‑dl** with commands to play, pause, resume, skip, stop and view the queue.  The bot can join the caller’s voice channel and stream music from YouTube or Spotify.

> The [discord.js guide](https://discordjs.guide) emphasises that larger bots should use a command handler instead of a giant `if/else` chain: a command handler dynamically loads individual command files and executes them【560144540262624†L68-L83】.  This repository follows that best practice.  Likewise, interactive components such as buttons fire `interactionCreate` events that must be responded to within **three seconds**【221555324613394†L69-L90】, so component handling logic lives in a central event file.

## Prerequisites

* A Linux server running Ubuntu or Debian with **Node.js 18** or later and **npm** installed.
* A Discord application with a bot token and the **application.commands** scope enabled.
* A MongoDB database (optional) if you want to persist data; otherwise the bot uses in‑memory storage.

### Installing Node.js

On a Debian/Ubuntu VPS you can install Node.js from the official repository:

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
# Verify versions
node -v
npm -v
```

Alternatively you can use **nvm** to manage Node versions.  See the Node.js documentation for details.

## Deployment

1. **Clone the repository** and install dependencies:

   ```bash
   git clone <your-fork-url> 911gamingbot
   cd 911gamingbot
   npm install
   ```

2. **Configure environment variables.**  Copy `.env.example` to `.env` and edit the values:

   ```bash
   cp .env.example .env
   nano .env
   ```

   * `DISCORD_TOKEN` – your bot token from the Discord Developer Portal.
   * `MONGODB_URI` – your MongoDB connection string (leave empty to use in‑memory storage).
   * `BOT_AVATAR_URL` – URL of the logo to use as the bot’s avatar.
   * `VERIFICATION_ROLE_ID` – the ID of the role to assign when users verify.
   * `SUPPORT_ROLE_ID` – role allowed to view and handle tickets.
   * `TICKET_CATEGORY_ID` – category ID where ticket channels will be created.
   * `MODLOG_CHANNEL_ID` – channel ID where moderation actions are logged.
   * `AD_CHANNEL_ID` – channel ID where advertisements are posted.
   * `TRANSCRIPT_CHANNEL_ID` – channel ID that receives ticket transcripts.
   * `MUSIC_VOLUME` – default playback volume (0–100).

3. **Build the TypeScript source**:

   ```bash
   npm run build
   ```

4. **Run the bot**:

   ```bash
   npm start
   ```

   On the first start the bot will register all slash commands globally.  Once the bot logs in, it will set its avatar from the configured URL and print “Ready!” in the console.  The bot dynamically loads all command files and event handlers from the `src/commands` and `src/events` directories, in accordance with the recommended command handler pattern【560144540262624†L66-L83】.

## Running the bot with PM2 or systemd

To keep the bot running in the background and restart it automatically, you can use **pm2** or **systemd**.

### Using PM2

Install pm2 globally:

```bash
sudo npm install -g pm2
```

Start the bot and configure pm2 to restart it on reboot:

```bash
cd /path/to/911gamingbot
npm run build
pm2 start dist/index.js --name 911gamingbot
pm2 save
pm2 startup
```

### Using systemd

Create a service file at `/etc/systemd/system/911gamingbot.service` (modify paths as needed):

```ini
[Unit]
Description=911 Gaming Store Discord Bot
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/path/to/911gamingbot
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
EnvironmentFile=/path/to/911gamingbot/.env

[Install]
WantedBy=multi-user.target
```

Reload systemd and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable 911gamingbot
sudo systemctl start 911gamingbot
sudo systemctl status 911gamingbot
```

The service will start the bot on boot and restart it if it crashes.

## Usage

Once the bot is running and invited to your Discord server (make sure it has the `application.commands` scope and necessary permissions), you can use the following slash commands:

| Command                          | Permission                   | Description |
|----------------------------------|------------------------------|-------------|
| `/setupverify`                  | Admin                        | Post a verification panel with a **Verify** button. Users clicking the button receive the role specified in `VERIFICATION_ROLE_ID`. |
| `/ticket panel`                | Admin                        | Post a ticket creation panel with a button. Users click **Open Ticket** to create a private support channel. |
| `/ticket create [reason]`      | Everyone                     | Open a support ticket directly without using the panel. |
| `/ban <user> [reason]`         | Ban Members                  | Ban a user from the server and log the action. |
| `/kick <user> [reason]`        | Kick Members                 | Kick a user from the server and log the action. |
| `/mute <user> <minutes> [reason]` | Moderate Members           | Temporarily mute (timeout) a member for the specified number of minutes. |
| `/unmute <user>`               | Moderate Members             | Remove timeout from a member. |
| `/ad <title> <description> [image] [ping]` | Admin           | Post an advertisement embed to the designated ad channel with optional image and optional `@everyone` ping. |
| `/play <query>`                | — (must be in voice)         | Join your voice channel (or reuse the existing connection) and play a track from YouTube or Spotify.  Searches YouTube when a URL is not provided. |
| `/skip`                        | —                            | Skip the currently playing track. |
| `/stop`                        | —                            | Stop playback and clear the queue. |
| `/pause`                       | —                            | Pause playback. |
| `/resume`                      | —                            | Resume a paused track. |
| `/queue`                       | —                            | Show the current music queue. |

## Architecture and Extensibility

The bot’s file structure encourages modularity.  Commands live in the `src/commands` folder and are automatically loaded at runtime.  Each command exports an object with a `data` property—built using `SlashCommandBuilder`—and an async `execute` function.  Events live in `src/events` and follow a similar pattern.  This design is based on the command/event handler pattern recommended by the discord.js guide【560144540262624†L66-L82】.  To add a new command, create a new file under `src/commands/<category>` exporting the same interface and run `npm run build`.

When a user interacts with a message component such as a button, Discord emits an `interactionCreate` event.  The guide explains that every button click triggers this event and that you must respond within three seconds【221555324613394†L69-L90】; failing to do so results in an “interaction failed” message.  All component logic—verifying users, creating tickets, closing tickets—is therefore handled in the `src/events/interactionCreate.ts` file.

For ticket transcripts, the bot uses the `discord-html-transcripts` package.  According to the package documentation, it generates nicely formatted HTML transcripts, processes Discord markdown and embeds, and supports attachments【177577781666139†L313-L334】.  When a ticket is closed via the **Close Ticket** button, the bot calls `discordTranscripts.createTranscript()`, sends the resulting HTML file to the `TRANSCRIPT_CHANNEL_ID`, then deletes the ticket channel.

The music system relies on the `@discordjs/voice` library and `play‑dl` for streaming.  The Discord.js voice guide notes that an audio player can be created via `createAudioPlayer()` and can play audio resources across multiple voice connections【399465179947672†L23-L41】.  The bot creates one queue per guild and uses a single audio player to handle playback.  When the queue is empty the player transitions into the idle state; the next track is automatically processed when a song ends or a skip command is issued.

## Contributing and Customisation

Feel free to fork this repository and customise it for your own needs.  You can change the embed colours in `src/utils/embed.ts`, modify the moderation commands, or add entirely new modules (for example, giveaways, economy systems, etc.).  Because the command and event handlers automatically load files from their respective directories, adding new functionality is as simple as dropping a new file into the appropriate folder.

If you encounter any issues, please open an issue on your fork or consult the official discord.js guide and documentation.  Happy coding!