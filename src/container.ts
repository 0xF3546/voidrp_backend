import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { container } from "tsyringe";

export async function containerSetup() {
  const basePath = path.resolve("./src");

  const directoriesToRegister = [
    "api/controllers",
    "core/services"
  ];

  for (const directory of directoriesToRegister) {
    const fullDirectoryPath = path.join(basePath, directory);
    console.log("reading", fullDirectoryPath);

    if (!fs.existsSync(fullDirectoryPath)) {
      console.warn(`Directory not found: ${fullDirectoryPath}`);
      continue;
    }

    const files = fs.readdirSync(fullDirectoryPath);

    for (const file of files) {
      const ext = path.extname(file);
      if (![".js", ".ts"].includes(ext)) continue;

      const filePath = path.join(fullDirectoryPath, file);
      console.log("file", file);

// ...existing code...
      console.log("Importiere Datei:", filePath);
      try {
console.log("Vor Import:", filePath);
const importPromise = import(pathToFileURL(filePath).href);
const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout beim Import")), 5000));
const module = await Promise.race([importPromise, timeout]);
console.log("Nach Import:", filePath);
        // ...existing code...
        let foundClass = false;
        for (const exp of Object.values(module)) {
          if (typeof exp === "function" && /^\s*class\s/.test(exp.toString())) {
            container.register(exp as new (...args: any[]) => any, { useClass: exp as new (...args: any[]) => any });
            console.log(`✅ Registered class: ${exp.name}`);
            foundClass = true;
          }
        }

        if (!foundClass) {
          console.warn(`⚠️ No valid class exported from ${file}`);
        }
      } catch (error) {
        console.error(`❌ Error loading file ${file}:`, error);
      }
    }
  }
}
