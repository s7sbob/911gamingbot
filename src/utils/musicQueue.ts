import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  NoSubscriberBehavior,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { Guild, GuildMember, VoiceBasedChannel, GuildVoiceChannelResolvable } from 'discord.js';
import * as playdl from 'play-dl';

/**
 * Represents an individual track in the queue. Contains metadata and a factory
 * function to create an audio resource when needed.
 */
export class Track {
  public readonly title: string;
  public readonly url: string;
  public readonly requestedBy: string;
  public readonly duration: string | null;

  private readonly streamFunc: () => Promise<ReturnType<typeof createAudioResource>>;

  constructor(info: {
    title: string;
    url: string;
    duration?: string | null;
    requestedBy: string;
    streamFunc: () => Promise<ReturnType<typeof createAudioResource>>;
  }) {
    this.title = info.title;
    this.url = info.url;
    this.duration = info.duration ?? null;
    this.requestedBy = info.requestedBy;
    this.streamFunc = info.streamFunc;
  }

  /**
   * Convert this track into an audio resource. When called, this will call
   * through to the underlying factory and return a ready-to-play resource.
   */
  async createAudioResource(volume: number = 50) {
    const resource = await this.streamFunc();
    // Set volume if resource has a volume control; otherwise ignore.
    // play-dl returns streams that are already volume adjustable via inline call.
    if ('volume' in resource) {
      // @ts-ignore
      resource.volume?.setVolume(volume / 100);
    }
    return resource;
  }

  /**
   * Utility to search for a track using play-dl. Accepts either a URL or search
   * string and returns a Track instance ready to be enqueued.
   */
  static async from(query: string, requestedBy: string): Promise<Track> {
    let info: playdl.Playlist | playdl.SearchResult | null = null;
    let title = query;
    let url = query;
    let duration: string | null = null;

    // Determine if the query is a valid URL; if not, search YouTube.
    const isUrl = playdl.yt_validate(query) === 'video' || playdl.sp_validate(query) !== false;
    if (isUrl) {
      // fetch video/track details
      if (playdl.yt_validate(query) === 'video') {
        const videoInfo = await playdl.video_info(query);
        title = videoInfo.video_details.title || query;
        url = videoInfo.video_details.url;
        duration = videoInfo.video_details.durationRaw;
      } else {
        // Spotify track; convert to YouTube equivalent via search
        const spotifyInfo = await playdl.spotify(query);
        const firstTrack = Array.isArray(spotifyInfo) ? spotifyInfo[0] : spotifyInfo;
        if (firstTrack) {
          title = firstTrack.name + ' - ' + firstTrack.artists?.[0]?.name;
          duration = null;
          const results = await playdl.search(`${title}`, { source: { youtube: 'video' } });
          const firstResult = results[0];
          if (firstResult) {
            url = firstResult.url;
            duration = firstResult.durationRaw;
          }
        }
      }
    } else {
      // Search YouTube for query
      const results = await playdl.search(query, { source: { youtube: 'video' } });
      const firstResult = results[0];
      if (firstResult) {
        title = firstResult.title ?? query;
        url = firstResult.url;
        duration = firstResult.durationRaw;
      }
    }

    // stream function to create the audio resource using play-dl
    const streamFunc = async () => {
      const stream = await playdl.stream(url, { quality: 2 });
      return createAudioResource(stream.stream, {
        inputType: stream.type,
        metadata: { title, url },
      });
    };

    return new Track({ title, url, duration, requestedBy, streamFunc });
  }
}

/**
 * Handles connecting to a voice channel, maintaining a queue of tracks, and
 * managing playback using an AudioPlayer. Each guild has its own queue
 * instance.
 */
export class MusicQueue {
  private guild: Guild;
  private player: AudioPlayer;
  private connection: VoiceConnection | null = null;
  private queue: Track[] = [];
  private isProcessing = false;
  private volume: number;

  constructor(guild: Guild, volume: number = 50) {
    this.guild = guild;
    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });
    this.volume = volume;
    this.player.on('error', (error) => {
      console.error('Audio player error:', error);
      this.processQueue().catch((err) => console.error(err));
    });
    this.player.on(AudioPlayerStatus.Idle, () => {
      // When the player becomes idle, play the next track
      this.processQueue().catch((err) => console.error(err));
    });
  }

  /**
   * Connect to the given voice channel. If already connected to another
   * channel, the connection will be destroyed and replaced.
   */
  async connect(channel: VoiceBasedChannel): Promise<void> {
    // Destroy existing connection
    if (this.connection) {
      this.connection.destroy();
    }
    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });
    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
      this.connection.subscribe(this.player);
    } catch (err) {
      this.connection.destroy();
      throw err;
    }
  }

  /**
   * Add a track to the queue and start playback if nothing is currently
   * processing.
   */
  async enqueue(track: Track): Promise<void> {
    this.queue.push(track);
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Skip the current track and proceed to the next one in the queue.
   */
  async skip(): Promise<boolean> {
    if (this.player.state.status !== AudioPlayerStatus.Idle) {
      this.player.stop(true);
      return true;
    }
    return false;
  }

  /**
   * Pause playback.
   */
  pause(): boolean {
    return this.player.pause();
  }

  /**
   * Resume playback.
   */
  resume(): boolean {
    return this.player.unpause();
  }

  /**
   * Stop playback and clear the queue.
   */
  stop(): void {
    this.queue = [];
    this.player.stop();
    this.connection?.destroy();
    this.connection = null;
  }

  /**
   * Returns a copy of the current queue, including the track currently
   * being played (if any).
   */
  getQueue(): Track[] {
    return [...this.queue];
  }

  /**
   * Process the next track in the queue. If there are no tracks left, the
   * player will be idle until a new track is enqueued. This method sets
   * `isProcessing` to prevent concurrent execution.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      while (this.queue.length > 0) {
        const next = this.queue.shift();
        if (!next) continue;
        const resource = await next.createAudioResource(this.volume);
        this.player.play(resource);
        // Wait until the resource has finished playing or an error occurs.
        await entersState(this.player, AudioPlayerStatus.Idle, 24 * 60 * 60 * 1000);
      }
    } finally {
      this.isProcessing = false;
    }
  }
}