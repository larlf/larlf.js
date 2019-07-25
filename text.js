"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const iconv_lite = require("iconv-lite");
const log_1 = require("./log");
function format(str, ...argv) {
    for (let i = 0; i < argv.length; ++i) {
        let reg = new RegExp("\\{" + (i) + "\\}", "g");
        str = str.replace(reg, argv[i]);
    }
    return str;
}
function templet(str, values) {
    for (let key in values) {
        let reg = new RegExp("\\{" + (key) + "\\}", "g");
        str = str.replace(reg, values[key]);
    }
    return str;
}
//替换文件中的一块内容
function replaceBlock(text, startReg, endReg, data, indent) {
    let lines = text.split("\n");
    let startLine = -1;
    let endLine = -1;
    let dataLines = null;
    //处理不同参数
    if (typeof (data) === "string") {
        dataLines = data.split("\n");
    }
    else {
        dataLines = [];
        for (let i = 0; i < data.length; ++i) {
            dataLines[i] = data[i];
        }
    }
    //处理indent
    if (indent) {
        for (let i in dataLines) {
            dataLines[i] = indent + dataLines[i];
        }
    }
    //查找开始和结束的位置
    for (let i = 0; i < lines.length; ++i) {
        if (startLine < 0 && lines[i].match(startReg))
            startLine = i;
        if (endLine < 0 && lines[i].match(endReg))
            endLine = i;
    }
    //替换内容
    if (startLine >= 0 && endLine >= 0 && endLine > startLine) {
        lines.splice(startLine + 1, endLine - startLine - 1, dataLines.join("\n"));
    }
    else
        log_1.default.error("Cannot find replace block : (" + startLine + "," + endLine + ") with rules : " + startReg + "," + endReg);
    return lines.join("\n");
}
;
/**
 * GBK转码成UTF8
 * 通常需要传进来Buffer才行，因为String已经被处理过了
 */
function gbk2utf8(str) {
    if (str) {
        str = iconv_lite.decode(str, "GBK");
    }
    return str;
}
;
exports.default = {
    format,
    templet,
    replaceBlock,
    gbk2utf8
};
