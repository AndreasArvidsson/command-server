import { sync as rimrafSync } from "rimraf";
import { getCommunicationDirPath } from "./getCommunicationDirPath";

function main() {
    rimrafSync(getCommunicationDirPath(), { disableGlob: true });
}

main();
