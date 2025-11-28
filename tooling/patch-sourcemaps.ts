import fs from "fs";
import path from "path";

const browser = process.argv[2];
if (!browser) {
  console.error("Browser argument is missing.");
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
const version = packageJson.version;

function findFiles(dir: string, extension: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findFiles(filePath, extension, fileList);
    } else if (path.extname(file) === extension) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

const jsFiles = findFiles(`./dist/${browser}`, ".js");

jsFiles.forEach(file => {
  const fileName = path.basename(file);
  const sourceMappingURL = `\n//# sourceMappingURL=https://blyrics-sourcemaps.dacubeking.com/${browser}/v${version}/${fileName}.map`;
  fs.appendFileSync(file, sourceMappingURL);
});
