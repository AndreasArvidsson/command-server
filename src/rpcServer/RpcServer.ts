import * as path from "path";
import { initializeCommunicationDir } from "./initializeCommunicationDir";
import { fileExists, openFile, readRequest, writeResponse } from "./io";
import type { RequestCallbackOptions, RequestLatest } from "./types";
import { upgradeRequest } from "./upgradeRequest";
import { InboundSignal } from "./InboundSignal";

interface CommunicationDir {
    path: string;
    requestJson: string;
    responseJson: string;
    signalsDir: string;
}

export class RpcServer<T> {
    private communicationDirs: CommunicationDir[];
    private activeCommunicationDir?: CommunicationDir;

    constructor(communicationDirPaths: string[]) {
        this.communicationDirs = communicationDirPaths.map(
            (dirPath): CommunicationDir => ({
                path: dirPath,
                requestJson: path.join(dirPath, "request.json"),
                responseJson: path.join(dirPath, "response.json"),
                signalsDir: path.join(dirPath, "signals"),
            })
        );
    }

    initialize() {
        for (const dir of this.communicationDirs) {
            initializeCommunicationDir(dir.path);
        }
    }

    async executeRequest(
        callback: (payload: T, options: RequestCallbackOptions) => unknown
    ) {
        this.updateActiveCommunicationDir();

        const communicationDir = this.getActiveCommunicationDir();

        const responseFile = await openFile(communicationDir.responseJson);

        let request: RequestLatest;

        try {
            request = await this.readCanonicalRequests(
                communicationDir.requestJson
            );
        } catch (err) {
            await responseFile.close();
            throw err;
        }

        const { uuid, returnCommandOutput, waitForFinish, payload } = request;

        const warnings: string[] = [];

        const options: RequestCallbackOptions = {
            warn: (text) => warnings.push(text),
        };

        try {
            // Wrap in promise resolve to handle both sync and async functions
            const commandPromise = Promise.resolve(
                callback(payload as T, options)
            );

            let commandReturnValue = null;

            if (returnCommandOutput) {
                commandReturnValue = await commandPromise;
            } else if (waitForFinish) {
                await commandPromise;
            }

            await writeResponse(responseFile, {
                uuid,
                warnings,
                error: null,
                returnValue: commandReturnValue,
            });
        } catch (err) {
            await writeResponse(responseFile, {
                uuid,
                warnings,
                error: (err as Error).message,
            });
        }

        await responseFile.close();
    }

    getInboundSignal(name: string): InboundSignal {
        const communicationDir = this.getActiveCommunicationDir();
        const signalFilepath = path.join(communicationDir.signalsDir, name);
        return new InboundSignal(signalFilepath);
    }

    private async readCanonicalRequests(
        requestJson: string
    ): Promise<RequestLatest> {
        const requestInput = await readRequest(requestJson);
        return upgradeRequest(requestInput);
    }

    private getActiveCommunicationDir(): CommunicationDir {
        if (this.activeCommunicationDir != null) {
            return this.activeCommunicationDir;
        }
        throw Error("No active communication directory found");
    }

    private updateActiveCommunicationDir() {
        for (const dir of this.communicationDirs) {
            if (fileExists(dir.requestJson)) {
                this.activeCommunicationDir = dir;
            }
        }
        this.activeCommunicationDir = undefined;
    }
}
