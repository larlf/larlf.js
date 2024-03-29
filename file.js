"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const fs_extra = require("fs-extra");
const _log = require("./log");
let log = _log.Logger;
//复制文件
function copyFile(srcFile, dstFile) {
    if (!fs.existsSync(srcFile)) {
        log.error("Cannot find src file : " + srcFile);
        return false;
    }
    let srcStat = fs.statSync(srcFile);
    if (srcStat.isFile()) //处理文件
     {
        //如果有目标文件
        if (fs.existsSync(dstFile)) {
            let dstStat = fs.statSync(dstFile);
            //如果文件是一样的，那就不复制了
            if ((srcStat.size == dstStat.size) && (srcStat.mtime.getTime() == dstStat.mtime.getTime()))
                return false;
        }
        else {
            //检查下目录是否存在
            let dstPath = path.dirname(dstFile);
            if (!fs.existsSync(dstPath))
                fs_extra.mkdirsSync(dstPath);
            if (!fs.existsSync(dstPath)) {
                log.error("Cannot create directory : " + dstPath);
                return false;
            }
        }
        //复制文件
        log.debug("[Copy] " + srcFile + " => " + dstFile);
        fs_extra.copySync(srcFile, dstFile, { preserveTimestamps: true });
        return true;
    }
    else //处理目录
     {
        if (!fs.existsSync(dstFile))
            fs_extra.mkdirsSync(dstFile);
    }
}
exports.copyFile = copyFile;
/**
 * 复制多个文件到目标
 * @param srcPath 源的目录
 * @param filename 源文件名，可以用通配符
 * @param dstPath 目标目录
 * @param callback 复制成功后的回调
 */
function copyFiles(srcPath, filename, dstPath, callback) {
    let count = 0;
    let srcFiles = glob.sync(path.resolve(srcPath, filename));
    if (srcFiles) {
        for (let i = 0; i < srcFiles.length; ++i) {
            let srcFile = srcFiles[i];
            let dstFile = path.resolve(dstPath, path.relative(srcPath, srcFile));
            if (copyFile(srcFile, dstFile)) {
                count++;
                //复制成功后的回调
                if (callback)
                    callback(srcFile, dstFile);
            }
        }
    }
    return count;
}
exports.copyFiles = copyFiles;
/**
 * 复制目录
 * @param srcPath 源目录
 * @param dstPath 目标目录
 */
function copyPath(srcPath, dstPath, filter) {
    let count = 0;
    let files = glob.sync(path.resolve(srcPath, "**/*"));
    if (files) {
        files.forEach((srcFile) => {
            let dstFile = path.resolve(dstPath, path.relative(srcPath, srcFile));
            //如果有过滤器，判断一下是不是要复制
            if (filter) {
                if (!filter(srcFile, dstFile))
                    return;
            }
            copyFile(srcFile, dstFile);
        });
    }
    return count;
}
exports.copyPath = copyPath;
/**
 * 删除一组文件
 */
function deleteFiles(srcPath, filename, filter) {
    let count = 0;
    let srcFiles = glob.sync(path.resolve(srcPath, filename));
    if (srcFiles) {
        for (let i = 0; i < srcFiles.length; ++i) {
            let srcFile = srcFiles[i];
            if (filter && !filter(srcFile))
                continue;
            if (fs.existsSync(srcFile)) {
                fs.unlinkSync(srcFile);
                count++;
            }
        }
    }
    return count;
}
exports.deleteFiles = deleteFiles;
/**
 * 一直重试，直到删除
 * @param path
 * @param retryTime
 */
function blockRemove(path, retryTime) {
    if (!retryTime)
        retryTime = 1000;
    let _t = new Date().getTime() + retryTime;
    while (fs.existsSync(path)) {
        let now = new Date().getTime();
        if (now >= _t) {
            _t = now + retryTime;
            try {
                log.debug("Remove : " + path);
                fs_extra.removeSync(path);
                if (!fs.existsSync(path))
                    break;
            }
            catch (ex) {
                log.error("Remove " + path + " error : " + ex);
            }
        }
    }
}
exports.blockRemove = blockRemove;
//_______________________________________________________________________________________
/**
 * 用于处理由文本行组成的文件
 */
class LinesFile {
    get text() { return this.lines.join("\n"); }
    constructor(filename) {
        this.filename = filename;
        //读取文件
        if (fs.existsSync(filename)) {
            log.debug("Load lines file : " + filename);
            this.lines = fs.readFileSync(filename).toString().split("\n");
        }
        else
            this.lines = [];
    }
    /**
     * 查找并替换一行
     * @param reg
     * @param callback
     */
    findAndReplaceLine(reg, callback) {
        for (let i = 0; i < this.lines.length; ++i) {
            let r = this.lines[i].match(reg);
            if (r && r.length && callback) {
                let str = callback(this.lines[i], r);
                if (str !== null) {
                    log.debug("Replace line " + (i + 1) + " in " + this.filename);
                    log.print("From : " + this.lines[i].trim());
                    log.print(" To  : " + str.trim());
                    this.lines[i] = str;
                }
            }
        }
    }
    /**
     * 查找一行
     * @param reg
     * @param startLine
     */
    findLine(reg, startLine, rule) {
        if (!startLine)
            startLine = 0;
        for (let i = startLine; i < this.lines.length; ++i) {
            let r = this.lines[i].match(reg);
            if (r && r.length) {
                if (rule) {
                    if (rule(this.lines[i]))
                        return i;
                }
                else
                    return i;
            }
        }
        return -1;
    }
    /**
     * 从后向前找一行
     * @param reg
     * @param startLine
     * @param rule
     */
    findLastLine(reg, startLine, rule) {
        if (!startLine)
            startLine = this.lines.length - 1;
        for (let i = startLine; i >= 0; --i) {
            let r = this.lines[i].match(reg);
            if (r && r.length) {
                if (rule) {
                    if (rule(this.lines[i]))
                        return i;
                }
                else
                    return i;
            }
        }
        return -1;
    }
    /**
     * 查找多个条件指向的目标行
     * @param regs
     */
    findTargetLine(regs, startLine) {
        let regIndex = 0;
        if (!startLine)
            startLine = 0;
        for (let i = startLine; i < this.lines.length; ++i) {
            let r = this.lines[i].match(regs[regIndex]);
            if (r && r.length) {
                regIndex++;
                if (regIndex >= regs.length)
                    return i;
            }
        }
        return -1;
    }
    /**
     * 从后向前查找多个条件指向的目标行
     * @param regs
     * @param startLine
     */
    findLastTargetLine(regs, startLine) {
        let regIndex = 0;
        if (!startLine)
            startLine = this.lines.length - 1;
        for (let i = startLine; i >= 0; ++i) {
            let r = this.lines[i].match(regs[regIndex]);
            if (r && r.length) {
                regIndex++;
                if (regIndex >= regs.length)
                    return i;
            }
        }
        return -1;
    }
    /**
     * 反向查找一行
     * @param reg
     * @param startLine
     */
    findListLine(reg, startLine, rule) {
        if (!startLine || startLine < 0)
            startLine = this.lines.length - 1;
        for (let i = startLine; i >= 0; --i) {
            let r = this.lines[i].match(reg);
            if (r && r.length) {
                if (rule) {
                    if (rule(this.lines[i]))
                        return i;
                }
                else
                    return i;
            }
        }
        return -1;
    }
    /**
     * 在指定行之后插入
     * @param n
     * @param str
     */
    insertAfter(n, str) {
        log.debug("Insert after line " + (n + 1) + " in " + this.filename);
        log.print(str);
        let strs = str.split("\n");
        for (let i = 0; i < strs.length; ++i) {
            this.lines.splice(n + i + 1, 0, strs[i]);
        }
    }
    /**
     * 在指定行之前插入
     * @param n
     * @param str
     */
    insertBefore(n, str) {
        log.debug("Insert before line " + (n + 1) + " in " + this.filename);
        log.print(str);
        let strs = str.split("\n");
        for (let i = 0; i < strs.length; ++i) {
            this.lines.splice(n + i, 0, strs[i]);
        }
    }
    insertAfterLine(reg, str, startLine) {
        let pos = this.findLine(reg, startLine);
        if (pos < 0)
            return log.error("Cannot find " + reg + " in " + this.filename);
        this.insertAfter(pos, str);
    }
    insertBeforeLine(reg, str, startLine) {
        let pos = this.findLine(reg, startLine);
        if (pos < 0)
            return log.error("Cannot find " + reg + " in " + this.filename);
        this.insertBefore(pos, str);
    }
    /**
     * 替换一部分内容
     * @param start
     * @param count
     * @param str
     */
    replace(start, count, str) {
        log.debug("Remove " + count + " lines from line " + (start + 1) + " in " + this.filename);
        this.lines.splice(start, count);
        this.insertBefore(start, str);
    }
    /**
     * 替换行中的文字
     * @param reg
     * @param value
     */
    replaceValue(reg, value) {
        for (let i = 0; i < this.lines.length; ++i) {
            let text = this.lines[i];
            let r = reg.exec(text);
            if (r) {
                let toStr = value;
                if (r.length > 2) {
                    toStr = r[1] + value;
                    if (r.length > 3)
                        toStr += r[3];
                }
                log.debug("Replace " + this.filename + " Line:" + (i + 1) + "\nFrom : " + r[0] + "\n To  : " + toStr);
                this.lines[i] = text.replace(r[0], toStr);
            }
        }
    }
    /**
     * 删除一部分内容
     * @param start
     * @param count
     */
    remove(start, count) {
        log.debug("Remove " + count + " lines from line " + (start + 1) + " in " + this.filename);
        this.lines.splice(start, count);
    }
    /**
     * 添加一行
     * @param str
     */
    append(str) {
        this.lines.push(str);
    }
    /**
     * 保存
     */
    save(filename) {
        if (!filename)
            filename = this.filename;
        let text = this.text;
        log.debug("Save : " + filename + ", " + text.length + " bytes");
        fs.writeFileSync(filename, text);
    }
}
exports.LinesFile = LinesFile;
