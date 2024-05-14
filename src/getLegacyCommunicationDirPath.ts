import * as os from "os";
import * as path from "path";

export function getLegacyCommunicationDirPath() {
    const info = os.userInfo();

    // NB: On Windows, uid < 0, and the tmpdir is user-specific, so we don't
    // bother with a suffix
    const suffix = info.uid >= 0 ? `-${info.uid}` : "";

    return path.join(os.tmpdir(), `vscode-command-server${suffix}`);
}
