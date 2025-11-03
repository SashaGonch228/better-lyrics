import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getLyrics, getMatchingSong, getSongAlbum, setupRequestSniffer } from '../requestSniffer';
import type { LyricsInfo, SegmentMap } from '../requestSniffer';

describe('RequestSniffer Module', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getLyrics', () => {
    it('should return cached lyrics immediately if available', async () => {
      setupRequestSniffer();

      const mockLyricsResponse = {
        contents: {
          sectionListRenderer: {
            contents: [{
              musicDescriptionShelfRenderer: {
                description: {
                  runs: [{ text: 'Test lyrics content' }]
                },
                footer: {
                  runs: [{ text: 'Source: Test' }]
                }
              }
            }]
          }
        }
      };

      const browseEvent = new CustomEvent('blyrics-send-response', {
        detail: {
          url: 'https://music.youtube.com/youtubei/v1/browse',
          requestJson: { browseId: 'test-browse-id' },
          responseJson: mockLyricsResponse
        }
      });

      const nextEvent = new CustomEvent('blyrics-send-response', {
        detail: {
          url: 'https://music.youtube.com/youtubei/v1/next',
          requestJson: { videoId: 'test-video-id' },
          responseJson: {
            contents: {
              singleColumnMusicWatchNextResultsRenderer: {
                tabbedRenderer: {
                  watchNextTabbedResultsRenderer: {
                    tabs: [
                      {},
                      {
                        tabRenderer: {
                          unselectable: false,
                          endpoint: {
                            browseEndpoint: {
                              browseId: 'test-browse-id'
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      });

      document.dispatchEvent(nextEvent);
      document.dispatchEvent(browseEvent);

      const result = await getLyrics('test-video-id');

      expect(result.hasLyrics).toBe(true);
      expect(result.lyrics).toBe('Test lyrics content');
      expect(result.sourceText).toBe('Source: Test');
    });

    it('should wait and retry for lyrics if not immediately available', async () => {
      setupRequestSniffer();

      const lyricsPromise = getLyrics('pending-video-id', 5);

      jest.advanceTimersByTime(100);

      const mockLyricsResponse = {
        contents: {
          sectionListRenderer: {
            contents: [{
              musicDescriptionShelfRenderer: {
                description: {
                  runs: [{ text: 'Delayed lyrics' }]
                },
                footer: {
                  runs: [{ text: 'Source: Delayed' }]
                }
              }
            }]
          }
        }
      };

      const nextEvent = new CustomEvent('blyrics-send-response', {
        detail: {
          url: 'https://music.youtube.com/youtubei/v1/next',
          requestJson: { videoId: 'pending-video-id' },
          responseJson: {
            contents: {
              singleColumnMusicWatchNextResultsRenderer: {
                tabbedRenderer: {
                  watchNextTabbedResultsRenderer: {
                    tabs: [
                      {},
                      {
                        tabRenderer: {
                          unselectable: false,
                          endpoint: {
                            browseEndpoint: {
                              browseId: 'delayed-browse-id'
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      });

      const browseEvent = new CustomEvent('blyrics-send-response', {
        detail: {
          url: 'https://music.youtube.com/youtubei/v1/browse',
          requestJson: { browseId: 'delayed-browse-id' },
          responseJson: mockLyricsResponse
        }
      });

      document.dispatchEvent(nextEvent);
      document.dispatchEvent(browseEvent);

      jest.advanceTimersByTime(100);

      const result = await lyricsPromise;

      expect(result.hasLyrics).toBe(true);
      expect(result.lyrics).toBe('Delayed lyrics');
    });

    it('should return no lyrics after max retries', async () => {
      const lyricsPromise = getLyrics('non-existent-video', 2);

      jest.advanceTimersByTime(100);

      const result = await lyricsPromise;

      expect(result.hasLyrics).toBe(false);
      expect(result.lyrics).toBe('');
    });

    it('should handle videos marked as having no lyrics', async () => {
      setupRequestSniffer();

      const nextEvent = new CustomEvent('blyrics-send-response', {
        detail: {
          url: 'https://music.youtube.com/youtubei/v1/next',
          requestJson: { videoId: 'no-lyrics-video' },
          responseJson: {
            contents: {
              singleColumnMusicWatchNextResultsRenderer: {
                tabbedRenderer: {
                  watchNextTabbedResultsRenderer: {
                    tabs: [
                      {},
                      {
                        tabRenderer: {
                          unselectable: true
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      });

      document.dispatchEvent(nextEvent);

      const result = await getLyrics('no-lyrics-video');

      expect(result.hasLyrics).toBe(false);
    });
  });

  describe('getMatchingSong', () => {
    it('should return counterpart info when available', async () => {
      setupRequestSniffer();

      const nextEvent = new CustomEvent('blyrics-send-response', {
        detail: {
          url: 'https://music.youtube.com/youtubei/v1/next',
          requestJson: { videoId: 'primary-video' },
          responseJson: {
            contents: {
              singleColumnMusicWatchNextResultsRenderer: {
                tabbedRenderer: {
                  watchNextTabbedResultsRenderer: {
                    tabs: [
                      {
                        tabRenderer: {
                          content: {
                            musicQueueRenderer: {
                              content: {
                                playlistPanelRenderer: {
                                  contents: [{
                                    playlistPanelVideoWrapperRenderer: {
                                      primaryRenderer: {
                                        playlistPanelVideoRenderer: {
                                          videoId: 'primary-video'
                                        }
                                      },
                                      counterpart: [{
                                        counterpartRenderer: {
                                          playlistPanelVideoRenderer: {
                                            videoId: 'counterpart-video'
                                          }
                                        },
                                        segmentMap: {
                                          segment: [{
                                            primaryVideoStartTimeMilliseconds: '1000',
                                            counterpartVideoStartTimeMilliseconds: '2000',
                                            durationMilliseconds: '5000'
                                          }]
                                        }
                                      }]
                                    }
                                  }]
                                }
                              }
                            }
                          }
                        }
                      },
                      {
                        tabRenderer: {
                          unselectable: false
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      });

      document.dispatchEvent(nextEvent);

      const result = await getMatchingSong('primary-video');

      expect(result).not.toBeNull();
      expect(result?.counterpartVideoId).toBe('counterpart-video');
      expect(result?.segmentMap).toBeDefined();
      expect(result?.segmentMap?.segment).toHaveLength(1);
      expect(result?.segmentMap?.segment[0].primaryVideoStartTimeMilliseconds).toBe(1000);
    });

    it('should return null after max retries', async () => {
      const matchPromise = getMatchingSong('non-existent', 2);

      jest.advanceTimersByTime(100);

      const result = await matchPromise;

      expect(result).toBeNull();
    });

    it('should handle songs without counterparts', async () => {
      setupRequestSniffer();

      const nextEvent = new CustomEvent('blyrics-send-response', {
        detail: {
          url: 'https://music.youtube.com/youtubei/v1/next',
          requestJson: { videoId: 'solo-video' },
          responseJson: {
            contents: {
              singleColumnMusicWatchNextResultsRenderer: {
                tabbedRenderer: {
                  watchNextTabbedResultsRenderer: {
                    tabs: [
                      {
                        tabRenderer: {
                          content: {
                            musicQueueRenderer: {
                              content: {
                                playlistPanelRenderer: {
                                  contents: [{
                                    playlistPanelVideoRenderer: {
                                      videoId: 'solo-video'
                                    }
                                  }]
                                }
                              }
                            }
                          }
                        }
                      },
                      {
                        tabRenderer: {
                          unselectable: false
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      });

      document.dispatchEvent(nextEvent);

      const result = await getMatchingSong('solo-video');

      expect(result).not.toBeNull();
      expect(result?.counterpartVideoId).toBeNull();
      expect(result?.segmentMap).toBeNull();
    });
  });

  describe('getSongAlbum', () => {
    it('should return album name when available', async () => {
      setupRequestSniffer();

      const nextEvent = new CustomEvent('blyrics-send-response', {
        detail: {
          url: 'https://music.youtube.com/youtubei/v1/next',
          requestJson: { videoId: 'album-video' },
          responseJson: {
            contents: {
              singleColumnMusicWatchNextResultsRenderer: {
                tabbedRenderer: {
                  watchNextTabbedResultsRenderer: {
                    tabs: [
                      {},
                      {
                        tabRenderer: {
                          unselectable: false
                        }
                      }
                    ]
                  }
                }
              }
            },
            playerOverlays: {
              playerOverlayRenderer: {
                browserMediaSession: {
                  browserMediaSessionRenderer: {
                    album: {
                      runs: [{ text: 'Test Album' }]
                    }
                  }
                }
              }
            }
          }
        }
      });

      document.dispatchEvent(nextEvent);

      const album = await getSongAlbum('album-video');

      expect(album).toBe('Test Album');
    });

    it('should wait and retry for album info', async () => {
      setupRequestSniffer();

      const albumPromise = getSongAlbum('delayed-album-video');

      jest.advanceTimersByTime(100);

      const nextEvent = new CustomEvent('blyrics-send-response', {
        detail: {
          url: 'https://music.youtube.com/youtubei/v1/next',
          requestJson: { videoId: 'delayed-album-video' },
          responseJson: {
            contents: {
              singleColumnMusicWatchNextResultsRenderer: {
                tabbedRenderer: {
                  watchNextTabbedResultsRenderer: {
                    tabs: [
                      {},
                      {
                        tabRenderer: {
                          unselectable: false
                        }
                      }
                    ]
                  }
                }
              }
            },
            playerOverlays: {
              playerOverlayRenderer: {
                browserMediaSession: {
                  browserMediaSessionRenderer: {
                    album: {
                      runs: [{ text: 'Delayed Album' }]
                    }
                  }
                }
              }
            }
          }
        }
      });

      document.dispatchEvent(nextEvent);

      jest.advanceTimersByTime(100);

      const album = await albumPromise;

      expect(album).toBe('Delayed Album');
    });

    it('should return undefined after timeout', async () => {
      setupRequestSniffer();

      const albumPromise = getSongAlbum('timeout-video');

      // Advance through all 250 retries * 20ms = 5000ms
      for (let i = 0; i < 250; i++) {
        await jest.advanceTimersByTimeAsync(20);
      }

      const album = await albumPromise;

      expect(album).toBeUndefined();
    });
  });

  describe('setupRequestSniffer', () => {
    it('should initialize without errors', () => {
      expect(() => setupRequestSniffer()).not.toThrow();
    });

    it('should process segment maps correctly', async () => {
      setupRequestSniffer();

      const nextEvent = new CustomEvent('blyrics-send-response', {
        detail: {
          url: 'https://music.youtube.com/youtubei/v1/next',
          requestJson: {},
          responseJson: {
            contents: {
              singleColumnMusicWatchNextResultsRenderer: {
                tabbedRenderer: {
                  watchNextTabbedResultsRenderer: {
                    tabs: [{
                      tabRenderer: {
                        content: {
                          musicQueueRenderer: {
                            content: {
                              playlistPanelRenderer: {
                                contents: [{
                                  playlistPanelVideoWrapperRenderer: {
                                    primaryRenderer: {
                                      playlistPanelVideoRenderer: {
                                        videoId: 'video-a'
                                      }
                                    },
                                    counterpart: [{
                                      counterpartRenderer: {
                                        playlistPanelVideoRenderer: {
                                          videoId: 'video-b'
                                        }
                                      },
                                      segmentMap: {
                                        segment: [{
                                          primaryVideoStartTimeMilliseconds: '1000',
                                          counterpartVideoStartTimeMilliseconds: '2000',
                                          durationMilliseconds: '3000'
                                        }]
                                      }
                                    }]
                                  }
                                }]
                              }
                            }
                          }
                        }
                      }
                    }]
                  }
                }
              }
            }
          }
        }
      });

      document.dispatchEvent(nextEvent);

      const matchA = await getMatchingSong('video-a');
      const matchB = await getMatchingSong('video-b');

      expect(matchA?.counterpartVideoId).toBe('video-b');
      expect(matchB?.counterpartVideoId).toBe('video-a');

      expect(matchA?.segmentMap?.reversed).toBeUndefined();
      expect(matchB?.segmentMap?.reversed).toBe(true);

      expect(matchA?.segmentMap?.segment[0].primaryVideoStartTimeMilliseconds).toBe(1000);
      expect(matchB?.segmentMap?.segment[0].primaryVideoStartTimeMilliseconds).toBe(2000);
    });
  });
});
