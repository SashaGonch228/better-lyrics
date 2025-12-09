module.exports = {
  dev: {
    browser: "chrome",
  },
  config: (config) => {
    config.devtool = "source-map";
    return config;
  },
  browser: {
    chrome: {
      preferences: { theme: "dark" },
      excludeBrowserFlags: [ // this appears to not work
        '--hide-scrollbars', // Allow scrollbars to be visible
        '--mute-audio', // Allow audio to play
        '--disable-component-extensions-with-background-pages' // Allow component extensions to load
      ],
      browserFlags: [
        "--remote-debugging-port",
        "9222",
        "https://music.youtube.com/watch?v=D_3nlLlPMxA&list=RDAMVMEmq17wn71jA",
      ],
      profile: "dist/chrome-profile",
    },
    firefox: {
      preferences: { theme: "dark" },
      excludeBrowserFlags: [
        '--hide-scrollbars', // Allow scrollbars to be visible
        '--disable-component-extensions-with-background-pages' // Allow component extensions to load
      ],
      browserFlags: [
        "https://music.youtube.com/watch?v=Emq17wn71jA&list=RDAMVMxe9j9hPn6Bc",
      ],
      profile: "dist/firefox-profile",
    },
  },
  output: {
    publicPath: "chrome-extension://effdbpeggelllpfkjppbokhmmiinhlmg/",
  },
};
