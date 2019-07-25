"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const log_1 = require("./log");
const text_1 = require("./text");
const SourceMapSupport = require("source-map-support");
const log_2 = require("./log");
const crc = require("crc");
SourceMapSupport.install();
/**
 * 用于生成OP的任务
 */
class OPTask {
    constructor(filename) {
        this.ops = [];
        let text = fs.readFileSync(filename).toString();
        let lines = text.split('\n');
        let reg = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\=\s*([0-9]+)\;?(\s*\/\/(.*))?/;
        lines.forEach((line) => {
            line = line.trim();
            line = line.replace(/\r/g, "");
            line = line.replace(/\t/g, " ");
            //注释
            if (line.length <= 0 || line.startsWith("//") || line.startsWith("/*"))
                return;
            let v = reg.exec(line);
            if (!v) {
                log_1.default.error("Bad op desc : " + line);
                return;
            }
            else {
                //log.debug(v);
                let name = v[1];
                let value = parseInt(v[2]);
                let comment = v[4];
                let op = new OPValue(name, value, comment);
                this.ops.push(op);
            }
        });
    }
    toCSConstCode() {
        let lines = [];
        this.ops.forEach(it => {
            lines.push(it.toCSConstCode());
        });
        return lines;
    }
    toCSInitCode() {
        let lines = [];
        this.ops.forEach(it => {
            lines.push(it.toCSInitCode());
        });
        return lines;
    }
}
class OPValue {
    constructor(name, value, comment) {
        this.name = name;
        this.value = value;
        this.comment = comment;
    }
    toCSConstCode() {
        return text_1.default.format("public const int {0} = {1};", this.name, this.value + "");
    }
    toCSInitCode() {
        //OP.Values[1] = "name";
        return text_1.default.format("OP.Values[{0}] = \"{1}\";", this.value + "", this.name);
    }
}
//___________________________________________________________________________
let CSTypeMap = {};
/**
 * 用于生成Entity的任务
 */
class DataObjTask {
    constructor(filename) {
        this.objs = [];
        this.filename = filename;
        if (!fs.existsSync) {
            log_2.default.error("Cannot find entities define : " + filename);
        }
        else {
            let text = fs.readFileSync(filename).toString();
            this._parseText(text);
        }
    }
    _parseText(text) {
        if (!text)
            return;
        let idRule = "([a-zA-Z_][a-zA-Z_0-9]*)";
        let commentRule = "(\s*\/\/(.*))?";
        let classRule = new RegExp("class\\s+" + idRule + "\\s*(\\:\\s*([a-zA-Z_0-9]+)\\s*)?(\\(([a-zA-Z_0-9]+)\\)\\s*)?(\\/\\/(.*))?(\\s*\\{([a-zA-Z_0-9]+)\\})?");
        let valueRule = new RegExp(idRule + "\\s+" + idRule + "\\;?" + commentRule);
        let arrayRule = new RegExp("array\<" + idRule + "\>\\s+" + idRule + "\\;?" + commentRule);
        let mapRule = new RegExp("map\<" + idRule + "\>\\s+" + idRule + "\\;?" + commentRule);
        let currentObj;
        let currentVal;
        let tempComment;
        let lines = text.split("\n");
        for (let i = 0; i < lines.length; ++i) {
            let line = lines[i].trim();
            if (!line || line == "{" || line == "}" || line.startsWith("\/*")) {
                tempComment = null;
                continue;
            }
            if (line.startsWith("\/\/")) //单行注释
             {
                tempComment = line.substr(2).trim();
            }
            else if (line.startsWith("class")) //处理class的开始
             {
                //当前的保存一下
                if (currentObj) {
                    this.objs.push(currentObj);
                    currentObj = null;
                }
                let r = classRule.exec(line);
                if (!r) {
                    log_1.default.error("Bad class define : " + line);
                    currentObj = null;
                    continue;
                }
                let name = r[1];
                let code = r[5];
                let keys = r[9];
                currentObj = new DataObj(name, code, keys, tempComment);
            }
            else if (line.startsWith("array<")) {
                let r = arrayRule.exec(line);
                if (!r) {
                    log_1.default.error("Bad array define : " + line);
                    continue;
                }
                let type = r[1];
                let name = r[2];
                let comment = r[4];
                currentVal = new DataArrayVal(name, type, comment);
            }
            else if (line.startsWith("map<")) {
                let r = mapRule.exec(line);
                if (!r) {
                    log_1.default.error("Bad map define : " + line);
                    continue;
                }
                let type = r[1];
                let name = r[2];
                let comment = r[4];
                currentVal = new DataMapVal(name, type, comment);
            }
            else //普通字段
             {
                let r = valueRule.exec(line);
                if (!r) {
                    log_1.default.error("Bad value define : " + line);
                    continue;
                }
                let type = r[1];
                let name = r[2];
                let comment = r[4];
                currentVal = new DataSimpleVal(name, type, comment);
            }
            //添加到对象
            if (currentVal) {
                if (currentObj)
                    currentObj.vals.push(currentVal);
                currentVal = null;
            }
        }
        if (currentObj)
            this.objs.push(currentObj);
    }
    toString() {
        let str = "";
        this.objs.forEach(it => {
            if (str)
                str += "\n";
            str += it.toString();
        });
        return str;
    }
}
/**
 * 数据对象
 */
class DataObj {
    constructor(name, code, keys, comment) {
        this.vals = [];
        this.name = name;
        this.code = code;
        this.keys = keys;
        this.comment = comment;
        //log.debug("[class] " + name);
    }
    toString() {
        let str = "class " + this.name + "";
        this.vals.forEach(it => {
            str += "\n\t";
            str += it.toString();
        });
        return str;
    }
    isEntity() {
        return true;
    }
    version() {
        let num = crc.crc32(this.versionString()) - 0x80000000;
        if (num == 0)
            num = -0x80000000;
        return num;
    }
    versionString() {
        let strs = [];
        strs.push(this.name);
        if (this.code)
            strs.push(this.code);
        this.vals.forEach(it => {
            strs.push(it.versionString());
        });
        return strs.join(",");
    }
}
/**
 * 数据对象的字段
 */
class DataVal {
    constructor(name, type, comment) {
        this.name = name;
        this.type = type;
        this.comment = comment;
    }
    toString() {
        return this.name + " : " + this.type;
    }
    isBasicType() {
        return true;
    }
    csName() {
        return this.name.toUpperCase().substring(0, 1) + this.name.substring(1);
    }
    csType() {
        return this.type;
    }
    csDefaultValue() {
        switch (this.type) {
            case "string":
                return "\"\"";
            case "int":
            case "uint":
            case "float":
            case "double":
            case "long":
            case "byte":
                return "0";
            case "bool":
                return "false";
        }
        return "null";
    }
    versionString() {
        return this.name + ":" + this.type;
    }
}
class DataSimpleVal extends DataVal {
    constructor(name, type, comment) {
        super(name, type, comment);
    }
}
class DataArrayVal extends DataVal {
    constructor(name, type, comment) {
        super(name, type, comment);
    }
    isBasicType() {
        return false;
    }
    csType() {
        return "List<" + this.type + ">";
    }
    versionString() {
        return this.name + ":" + this.type + "[]";
    }
}
class DataMapVal extends DataVal {
    constructor(name, type, comment) {
        super(name, type, comment);
    }
    isBasicType() {
        return false;
    }
    csType() {
        return "Dictionary<string, " + this.type + ">";
    }
    versionString() {
        return this.name + ":{" + this.type + "}";
    }
}
//_________________________________________________________________
exports.default = {
    OPTask,
    DataObjTask
};
