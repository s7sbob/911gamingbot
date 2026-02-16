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

export class Track {
  public readonly title: string;
  public readonly url: string;
  public readonly requestedBy: string;
  public readonly duration: string | null;

  private readonly streamFunc: () => Promise<any>;

  constructor(info: {
    title: string;
    url: string;
    duration?: string | null;
    requestedBy: string;
    streamFunc: () => Promise<any>;
  }) {
    this.title = info.title;
    this.url = info.url;
    this.duration = info.duration ?? null;
    this.requestedBy = info.requestedBy;
    this.streamFunc = info.streamFunc;
  }

  async createAudioResource(volume: number = 50) {
    const resource = await this.streamFunc();
    if ('volume' in resource) {
      (resource as any).volume?.setVolume(volume / 100);
    }
    return resource;
  }

  static async from(query: string, requestedBy: string): Promise<Track> {
    let info: any = null;
    let title = query;
    let url = query;
    let duration: string | null = null;

    const isUrl = playdl.yt_validate(query) === 'video' || playdl.sp_validate(query) !== false;
    if (isUrl) {
      if (playdl.yt_validate(query) === 'video') {
        const videoInfo = await playdl.video_info(query);
        title = videoInfo.video_details.title || query;
        url = videoInfo.video_details.url;
        duration = videoInfo.video_details.durationRaw;
      } else {
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
      const results = await playdl.search(query, { source: { youtube: 'video' } });
      const firstResult = results[0];
      if (firstResult) {
        title = firstResult.title ?? query;
        url = firstResult.url;
        duration = firstResult.durationRaw;
      }
    }

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
      this.processQueue().catch((err) => console.error(err));
    });
  }

  async connect(channel: VoiceBasedChannel): Promise<void> {
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

  async enqueue(track: Track): Promise<void> {
    this.queue.push(track);
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  async skip(): Promise<boolean> {
    if (this.player.state.status !== AudioPlayerStatus.Idle) {
      this.player.stop(true);
      return true;
    }
    return false;
  }

  pause(): boolean {
    return this.player.pause();
  }

  resume(): boolean {
    return this.player.unpause();
  }

  stop(): void {
    this.queue = [];
    this.player.stop();
    this.connection?.destroy();
    this.connection = null;
  }

  getQueue(): Track[] {
    return [...this.queue];
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      while (this.queue.length > 0) {
        const next = this.queue.shift();
        if (!next) continue;
        const resource = await next.createAudioResource(this.volume);
        this.player.play(resource);
        await entersState(this.player, AudioPlayerStatus.Idle, 24 * 60 * 60 * 1000);
      }
    } finally {
      this.isProcessing = false;
    }
  }
}
