import { execSync } from "child_process";

const extensionId = process.env.EXTENSION_ID;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const refreshToken = process.env.REFRESH_TOKEN;
const zipPath = "./dist/better-lyrics-chrome.zip";

if (!extensionId || !clientId || !clientSecret || !refreshToken) {
  console.error("Missing environment variables for Chrome Web Store publishing.");
  process.exit(1);
}

try {
  execSync("npm install -g chrome-webstore-upload-cli");
  execSync(
    `chrome-webstore-upload upload --source ${zipPath} --extension-id ${extensionId} --client-id ${clientId} --client-secret ${clientSecret} --refresh-token ${refreshToken}`,
    { stdio: "inherit" }
  );
  execSync(
    `chrome-webstore-upload publish --extension-id ${extensionId} --client-id ${clientId} --client-secret ${clientSecret} --refresh-token ${refreshToken}`,
    { stdio: "inherit" }
  );
  console.log("Successfully published to Chrome Web Store.");
} catch (error) {
  console.error("Failed to publish to Chrome Web Store:", error);
  process.exit(0); // Exit gracefully as in the original script
}
