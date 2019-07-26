import "colors";
import * as FS from 'fs';

function __error()
{
    try
    {
        throw Error('');
    }
    catch (err)
    {
        return err;
    }
}

export let Logger = {
    setLogFile(filename: string)
    {
        __logFilename = filename;
    },

    print: function (msg: string | any)
    {
        let str = msg + "";
        _log(str);
    },

    debug: function (msg: string | any)
    {
        let error = __error();
        let stack = error.stack.split("\n");
        _log("[Debug] " + msg, stack[3].trim(), "debug");
    },

    info: function (msg: string | any)
    {
        let error = __error();
        let stack = error.stack.split("\n");
        _log("[Info] " + msg, stack[3].trim(), "info");
    },

    warn: function (msg: string | any)
    {
        let error = __error();
        let stack = error.stack.split("\n");
        console.log(("[Warn] " + msg).magenta + " <= " + stack[3].trim());
    },

    error: function (msg: string | any, value?: any)
    {
        let error = __error();
        let stack = error.stack.split("\n");
        let stackStr = "";
        for (let i = 5; i < stack.length; ++i)
        {
            stackStr += "\n" + stack[i];
        }
        _log("[ERROR] " + msg, stack[3].trim() + stackStr, "error");

        if (value) return value;
        return false;
    },

    stack: function (msg: string | any)
    {
        let error = __error();
        _log("[Stack] " + msg, error.stack, "debug");
    },

    dump: function (obj: any)
    {
        let msg = JSON.stringify(obj);
        let error = __error();
        let stack = error.stack.split("\n");
        _log("[Dump] " + msg, stack[3].trim(), "debug");
    },

    dumpArray: function (obj: any)
    {
        let msg = "";
        if (obj.length)
        {
            for (let i = 0; i < obj.length; ++i)
            {
                msg += "\n(" + i + ") : " + JSON.stringify(obj[i]);
            }
        }
        else msg = JSON.stringify(obj);

        let error = __error();
        let stack = error.stack.split("\n");
        _log("[Dump] " + msg + " <= " + stack[3].trim());
    }
};

let __logFilename: string = null;

function _log(str: string, stack?: string, type?: string)
{
    //是否要写入文件
    if (__logFilename)
        FS.appendFileSync(__logFilename, str + (stack ? " @ " + stack : "") + "\n");

    switch (type)
    {
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

