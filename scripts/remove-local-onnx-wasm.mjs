import { readdir, rm } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("out");

const removeWasmFiles = async (directory) => {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await removeWasmFiles(entryPath);
    } else if (entry.isFile() && entry.name.endsWith(".wasm")) {
      await rm(entryPath);
      console.log(`Removed local WASM asset from Pages export: ${path.relative(outputDirectory, entryPath)}`);
    }
  }));
};

await removeWasmFiles(outputDirectory);
