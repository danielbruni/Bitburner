/**
 * Clear all data files and create fresh default files
 * @param {NS} ns - NetScript API
 */
export async function clearDataFolder(ns) {
  try {
    // Get list of data files
    const dataFiles = ns.ls("home", "/data/");

    // If the directory is empty or doesn't exist, create default structure
    if (dataFiles.length === 0) {
      ns.tprint("Creating default data files...");
    } else {
      // Delete all files in the data directory
      ns.tprint("Removing existing data files...");
      for (const file of dataFiles) {
        ns.rm(file);
      }
    }

    // Create default empty data files
    await ns.write(
      "/data/servers.json",
      JSON.stringify({ available: [], targets: [] }),
      "w"
    );
    await ns.write("/data/targets.json", JSON.stringify({ targets: [] }), "w");
    await ns.write(
      "/data/process-health.json",
      JSON.stringify({ processes: [] }),
      "w"
    );

    // Brief delay to ensure files are written
    await ns.sleep(100);

    return true;
  } catch (error) {
    ns.tprint(`ERROR clearing data folder: ${error}`);
    return false;
  }
}
