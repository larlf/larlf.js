"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const FS = require("fs");
function __error() {
    try {
        throw Error('');
    }
    catch (err) {
        return err;
    }
}
let Log = {
    setLogFile(filename) {
        __logFilename = filename;
    },
    print: function (msg) {
        let str = msg + "";
        _log(str);
    },
    debug: function (msg) {
        let error = __error();
        let stack = error.stack.split("\n");
        _log("[Debug] " + msg, stack[3].trim(), "debug");
    },
    info: function (msg) {
        let error = __error();
        let stack = error.stack.split("\n");
        _log("[Info] " + msg, stack[3].trim(), "info");
    },
    warn: function (msg) {
        let error = __error();
        let stack = error.stack.split("\n");
        console.log(("[Warn] " + msg).magenta + " <= " + stack[3].trim());
    },
    error: function (msg, value) {
        let error = __error();
        let stack = error.stack.split("\n");
        let stackStr = "";
        for (let i = 5; i < stack.length; ++i) {
            stackStr += "\n" + stack[i];
        }
        _log("[ERROR] " + msg, stack[3].trim() + stackStr, "error");
        if (value)
            return value;
        return false;
    },
    stack: function (msg) {
        let error = __error();
        _log("[Stack] " + msg, error.stack, "debug");
    },
    dump: function (obj) {
        let msg = JSON.stringify(obj);
        let error = __error();
        let stack = error.stack.split("\n");
        _log("[Dump] " + msg, stack[3].trim(), "debug");
    },
    dumpArray: function (obj) {
        let msg = "";
        if (obj.length) {
            for (let i = 0; i < obj.length; ++i) {
                msg += "\n(" + i + ") : " + JSON.stringify(obj[i]);
            }
        }
        else
            msg = JSON.stringify(obj);
        let error = __error();
        let stack = error.stack.split("\n");
        _log("[Dump] " + msg + " <= " + stack[3].trim());
    }
};
let __logFilename = null;
function _log(str, stack, type) {
    //是否要写入文件
    if (__logFilename)
        FS.appendFileSync(__logFilename, str + (stack ? " @ " + stack : "") + "\n");
    switch (type) {
        case "debug":
            str = str.green;
            break;
        case "info":
            str = str.yellow;
            break;
        case "error":
            str = str.red;
            break;
    }
    console.log(str + (stack ? " @ " + stack : ""));
}
exports.default = Log;
