import type { ProviderParameters } from "./shared";
import * as Constants from "../../../core/constants";

export default async function bLyrics(providerParameters: ProviderParameters): Promise<void> {
  // Fetch from the primary API if cache is empty or invalid
  const url = new URL(Constants.LYRICS_API_URL);
  url.searchParams.append("s", providerParameters.song);
  url.searchParams.append("a", providerParameters.artist);
  url.searchParams.append("d", String(providerParameters.duration));

  const response = await fetch(url.toString(), {
    signal: AbortSignal.any([providerParameters.signal, AbortSignal.timeout(10000)]),
  });

  if (!response.ok) {
    providerParameters.sourceMap["bLyrics"].filled = true;
    providerParameters.sourceMap["bLyrics"].lyricSourceResult = null;
  }

  const data = await response.json();
  // Validate API response structure
  if (!data || (!Array.isArray(data.lyrics) && !data.syncedLyrics)) {
    providerParameters.sourceMap["bLyrics"].filled = true;
    providerParameters.sourceMap["bLyrics"].lyricSourceResult = null;
  }

  data.source = "boidu.dev";
  data.sourceHref = "https://better-lyrics.boidu.dev";

  providerParameters.sourceMap["bLyrics"].filled = true;
  providerParameters.sourceMap["bLyrics"].lyricSourceResult = data;
}
