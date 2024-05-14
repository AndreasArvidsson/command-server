import * as os from "os";
import * as path from "path";

export function getCommunicationDirPath() {
    // NB: See https://github.com/talonhub/community/issues/966 for lots of
    // discussion about this path
    if (process.platform === "linux" || process.platform === "darwin") {
        return path.join(os.homedir(), ".talon/.comms/vscode-command-server");
    } else if (process.platform === "win32") {
        return path.join(
            os.homedir(),
            "\\AppData\\Roaming\\talon\\.comms\\vscode-command-server"
        );
    } else {
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
}
