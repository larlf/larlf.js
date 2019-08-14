"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const _log = require("./log");
let log = _log.Logger;
function format(str, ...argv) {
    for (let i = 0; i < argv.length; ++i) {
        let reg = new RegExp("\\{" + (i) + "\\}", "g");
        str = str.replace(reg, argv[i]);
    }
    return str;
}
exports.format = format;
function templet(str, values) {
    for (let key in values) {
        let reg = new RegExp("\\{" + (key) + "\\}", "g");
        str = str.replace(reg, values[key]);
    }
    return str;
}
exports.templet = templet;
/**
 * 替换指定的值
 * @param text
 * @param reg
 * @param value
 */
function replaceValue(name, text, reg, value) {
    let r = reg.exec(text);
    if (!r) {
        log.error("Cannot find text : " + reg + " in " + name);
        return text;
    }
    let toStr = value;
    if (r.length > 2) {
        toStr = r[1] + value;
        if (r.length > 3)
            toStr += r[3];
    }
    log.debug("[Replace] " + name + "\nFrom : " + r[0] + "\n To  : " + toStr);
    text = text.replace(r[0], toStr);
    return text;
}
exports.replaceValue = replaceValue;
/**
 * 替换文件中的一块内容
 */
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
    //查找开始和结束的位置
    for (let i = 0; i < lines.length; ++i) {
        if (startLine < 0 && lines[i].match(startReg))
            startLine = i;
        if (endLine < 0 && lines[i].match(endReg))
            endLine = i;
    }
    //替换内容
    if (startLine >= 0 && endLine >= 0 && endLine > startLine) {
        //如果没有设置缩进，就用第一个标签的缩进
        if (!indent) {
            let startLineText = lines[startLine];
            let startLineIndentPos = startLineText.indexOf(startLineText.trim());
            indent = startLineText.substr(0, startLineIndentPos);
        }
        //处理indent
        if (indent) {
            for (let i in dataLines) {
                dataLines[i] = indent + dataLines[i];
            }
        }
        lines.splice(startLine + 1, endLine - startLine - 1, dataLines.join("\n"));
    }
    else
        log.error("Cannot find replace block : (" + startLine + "," + endLine + ") with rules : " + startReg + "," + endReg);
    return lines.join("\n");
}
exports.replaceBlock = replaceBlock;
;
/**
 * 替换文件中的文本块
 * @param filename 文件名称
 * @param key 关键字，开始的地方会在前面加Start，结束会加End
 * @param data 要替换成的数据
 * @param indent 缩进，为null的时候自动处理
 * @param notRewrite 不重写文件，只是把结果返回
 */
function replaceFileBlock(filename, key, data, indent, notRewrite) {
    if (!fs.existsSync(filename)) {
        log.error("Cannot find file : " + filename);
        return null;
    }
    let text = fs.readFileSync(filename).toString();
    text = replaceBlock(text, new RegExp(key + "\s?Start"), new RegExp(key + "\s?End"), data, indent);
    //写入文件
    if (!notRewrite) {
        log.debug("Write : " + filename);
        fs.writeFileSync(filename, text);
    }
    return text;
}
exports.replaceFileBlock = replaceFileBlock;
