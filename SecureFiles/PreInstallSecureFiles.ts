import fs = require('fs');
import Q = require('q');
import path = require('path');
import tl = require('vsts-task-lib/task');
import vsts = require('vso-node-api');

import { ToolRunner } from 'vsts-task-lib/toolrunner';

async function run() {
    try {
        tl.setResourcePath(path.join(__dirname, 'task.json'));

        let secureFileId: string = tl.getInput('secureFileName', true);
        let secureFilePath: string = await downloadSecureFile(secureFileId);

        if (tl.exist(secureFilePath)) {
            tl.cp(secureFilePath, tl.getInput('outputDirectory', true));
        }
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    }
}

async function downloadSecureFile(secureFileId: string) {
    let tempDownloadPath: string = getSecureFileTempDownloadPath(secureFileId);

    tl.debug('Downloading secure file contents to: ' + tempDownloadPath);
    let file = fs.createWriteStream(tempDownloadPath);

    let serverUrl: string = tl.getVariable('System.TeamFoundationCollectionUri');
    let serverCreds: string = tl.getEndpointAuthorizationParameter('SYSTEMVSSCONNECTION', 'ACCESSTOKEN', false);
    let authHandler = vsts.getPersonalAccessTokenHandler(serverCreds);
    let serverConnection: vsts.WebApi = new vsts.WebApi(serverUrl, authHandler);
    let stream = (await serverConnection.getTaskAgentApi().downloadSecureFile(tl.getVariable('SYSTEM.TEAMPROJECT'), secureFileId, tl.getSecureFileTicket(secureFileId), false)).pipe(file);
    let defer = Q.defer();
    stream.on('finish', () => {
        defer.resolve();
    });
    await defer.promise;
    tl.debug('Downloaded secure file contents to: ' + tempDownloadPath);
    return tempDownloadPath;
}

function getSecureFileTempDownloadPath(secureFileId: string) {
    let fileName: string = tl.getSecureFileName(secureFileId);
    let tempDownloadPath: string = tl.resolve(tl.getVariable('Agent.TempDirectory'), fileName);
    return tempDownloadPath;
}

run();
