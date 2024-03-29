"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process = require("child_process");
const iconv_lite = require("iconv-lite");
const _log = require("./log");
let log = _log.Logger;
function execFile(filename, param) {
    let paramStr = param ? (" " + param.join(" ")) : "";
    log.debug("[Execute] " + filename + paramStr);
    if (!fs.existsSync(filename)) {
        log.error("Cannot find file : " + filename);
        return;
    }
    let dir = path.dirname(filename);
    try {
        let output = child_process.execSync(filename + paramStr, {
            cwd: dir,
            stdio: ['pipe']
        });
        let outputText = iconv_lite.decode(output, "GBK");
        return outputText.toString();
    }
    catch (ex) {
        log.error(ex.message);
    }
    return null;
}
function execCmd(cmd, dir) {
    if (!dir)
        dir = process.cwd(); //如果没有传入，取执行路径
    log.debug("[Execute] " + cmd + " at " + dir);
    if (!fs.existsSync(dir)) {
        log.error("Cannot find dir : " + dir);
        return;
    }
    try {
        let output = child_process.execSync(cmd, {
            cwd: dir,
            stdio: [0, 1, 2]
        });
        if (output) {
            let outputText = iconv_lite.decode(output, "GBK");
            return outputText.toString();
        }
    }
    catch (ex) {
        log.error(ex.message);
    }
    return null;
}
class VSTask {
    constructor(projectFile) {
        this.projectName = null;
        this.configName = "Debug";
        this.parms = [];
        this.properties = {};
        this.projectFile = projectFile;
    }
    build() {
        let projectPath = path.dirname(this.projectFile);
        log.debug("[Build] " + this.projectFile);
        //xbuild "/Users/larlf/Documents/project/war/dev1/server/cs/Server.sln" /t:ChatServer /p:Configurtion=Debug
        let cmdList = [os.platform() == "win32" ? "msbuild.exe" : "msbuild"];
        cmdList.push("\"" + this.projectFile + "\"");
        cmdList.push("\/p:Configuration=" + this.configName);
        if (this.projectName)
            cmdList.push("\/t:" + this.projectName);
        if (this.parms && this.parms.length > 0) {
            cmdList = cmdList.concat(this.parms);
        }
        for (let pKey in this.properties) {
            cmdList.push("\/property:" + pKey + "=" + this.properties[pKey]);
        }
        let cmd = cmdList.join(" ");
        log.debug(cmd);
        try {
            child_process.execSync(cmd, {
                cwd: projectPath,
                stdio: ['inherit', 'inherit', 'inherit']
            });
        }
        catch (e) {
            log.error(e.message);
            return false;
        }
        return true;
    }
}
class UnityTask {
    constructor(projectPath) {
        this.projectPath = projectPath;
    }
    build() {
        //转换成绝对路径
        if (!path.isAbsolute(this.projectPath))
            this.projectPath = path.resolve(this.projectPath);
        //Unity.exe -projectPath "D:\project\test\Unity1" -executeMethod Unity1Tools.BuildUnity1 -quit -batchmode
        let cmdList = [];
        if (UnityTask.UnityExecutePath) {
            if (UnityTask.UnityExecutePath.indexOf(' ') > 0)
                cmdList.push("\"" + UnityTask.UnityExecutePath + "\"");
            else
                cmdList.push(UnityTask.UnityExecutePath);
        }
        else {
            //不同平台Unity的路径不一样
            if (os.platform() == "win32")
                cmdList.push("Unity.exe");
            else
                cmdList.push("/Applications/Unity/Unity.app/Contents/MacOS/Unity");
        }
        cmdList.push("-projectPath");
        cmdList.push('"' + this.projectPath + '"');
        cmdList.push("-executeMethod");
        cmdList.push(this.executeMethod);
        cmdList.push("-logFile out.log");
        cmdList.push("-quit");
        cmdList.push("-batchmode");
        if (this.buildTarget)
            cmdList.push("-buildTarget " + this.buildTarget);
        let cmd = cmdList.join(" ");
        log.debug("[Build] " + cmd);
        try {
            let text = child_process.execSync(cmd, {
                cwd: this.projectPath,
                stdio: [0, 1, 2]
            });
        }
        catch (e) {
            log.error("Unity Error : " + e.message);
            //出错时处理一下Log文件
            let logfilename = path.resolve(this.projectPath, "out.log");
            if (fs.existsSync(logfilename)) {
                let lines = fs.readFileSync(logfilename).toString().split("\n");
                for (let index in lines) {
                    let line = lines[index].trim();
                    if (line.toLowerCase().indexOf("error") >= 0) {
                        log.info(line);
                    }
                }
            }
        }
        // if (text)
        // {
        // 	text = iconv_lite.decode(text, "GBK");
        // 	console.log(text.toString());
        // 	return text.toString();
        // }
        return null;
    }
}
//Unity可执行文件的路径
UnityTask.UnityExecutePath = null;
exports.default = {
    execCmd,
    execFile,
    VSTask,
    UnityTask
};
