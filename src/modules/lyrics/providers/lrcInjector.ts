import { parseLRC, parsePlainLyrics } from "@modules/lyrics/providers/lrcUtils";
import { processLyrics } from "@modules/lyrics/injectLyrics";
import { AppState } from "@core/appState";

/**
  Injects local .lrc or plain text into the app pipeline.
  lrcText: The content of the .lrc file.
*/
export async function injectLocalLrc(lrcText: string): Promise<void> {

  // TODO: fill lyrics details cuz idk how to do this
  const duration = 0;
  const song = "";
  const artist = "";
  const album = "";
  const videoId = "";

  const isTimed = /^\s*(?:\[|<)?\d{1,2}:\d{2}(?:[.:]\d+)?/m.test(lrcText);

  const lyricsArray = isTimed ? parseLRC(lrcText, duration) : parsePlainLyrics(lrcText);

  if (!lyricsArray || lyricsArray.length === 0) {
    throw new Error("Parsed lyrics are empty");
  }

  const hasTimed = lyricsArray.some(l => l.startTimeMs > 0);

  const meta = {
    lyrics: lyricsArray,
    source: "Local .lrc",
    sourceHref: "",
    musicVideoSynced: hasTimed,
    cacheAllowed: false,
    song,
    artist,
    album,
    duration,
    videoId,
    segmentMap: null,
  } as any;

  processLyrics(meta, false);
}