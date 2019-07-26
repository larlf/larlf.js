import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";
import * as fs_extra from "fs-extra";
import log from "./log";

//复制文件
export function copyFile(srcFile: string, dstFile: string): boolean
{
	if (!fs.existsSync(srcFile))
	{
		log.error("Cannot find src file : " + srcFile);
		return false;
	}

	let srcStat = fs.statSync(srcFile);
	if (srcStat.isFile())  //处理文件
	{
		//如果有目标文件
		if (fs.existsSync(dstFile))
		{
			let dstStat = fs.statSync(dstFile);

			//如果文件是一样的，那就不复制了
			if ((srcStat.size == dstStat.size) && (srcStat.mtime.getTime() == dstStat.mtime.getTime()))
				return false;
		}
		else
		{
			//检查下目录是否存在
			let dstPath = path.dirname(dstFile);
			if (!fs.existsSync(dstPath))
				fs_extra.mkdirsSync(dstPath);

			if (!fs.existsSync(dstPath))
			{
				log.error("Cannot create directory : " + dstPath);
				return false;
			}
		}

		//复制文件
		log.debug("[Copy] " + srcFile + " => " + dstFile);
		fs_extra.copySync(srcFile, dstFile, { preserveTimestamps: true });
		return true;
	}
	else  //处理目录
	{
		if (!fs.existsSync(dstFile))
			fs_extra.mkdirsSync(dstFile);
	}

}

/**
 * 复制多个文件到目标
 * @param srcPath 源的目录
 * @param filename 源文件名，可以用通配符
 * @param dstPath 目标目录
 * @param callback 复制成功后的回调
 */
export function copyFiles(srcPath: string, filename: string, dstPath: string, callback?: (src: string, dest?: string) => void): number
{
	let count = 0;

	let srcFiles = glob.sync(path.resolve(srcPath, filename));
	if (srcFiles)
	{
		for (let i = 0; i < srcFiles.length; ++i)
		{
			let srcFile = srcFiles[i];
			let dstFile = path.resolve(dstPath, path.relative(srcPath, srcFile));
			if (copyFile(srcFile, dstFile))
			{
				count++;

				//复制成功后的回调
				if (callback)
					callback(srcFile, dstFile);
			}
		}
	}

	return count;
}

/**
 * 复制目录
 * @param srcPath 源目录
 * @param dstPath 目标目录
 */
export function copyPath(srcPath: string, dstPath: string, filter?: (src: string, dest?: string) => boolean): number
{
	let count = 0;

	let files = glob.sync(path.resolve(srcPath, "**/*"));
	if (files)
	{
		files.forEach((srcFile) =>
		{
			let dstFile = path.resolve(dstPath, path.relative(srcPath, srcFile));

			//如果有过滤器，判断一下是不是要复制
			if (filter)
			{
				if (!filter(srcFile, dstFile))
					return;
			}

			copyFile(srcFile, dstFile);
		});
	}

	return count;
}

//删除一组文件
export function deleteFiles(srcPath: string, filename: string, filter?: Function): number
{
	let count = 0;

	let srcFiles = glob.sync(path.resolve(srcPath, filename));
	if (srcFiles)
	{
		for (let i = 0; i < srcFiles.length; ++i)
		{
			let srcFile = srcFiles[i];

			if (filter && !filter(srcFile))
				continue;

			if (fs.existsSync(srcFile))
			{
				fs.unlinkSync(srcFile);
				count++;
			}
		}
	}

	return count;
}

/**
 * 用于处理由文本行组成的文件
 */
export class LinesFile
{
	filename: string;

	lines: string[];

	public get text(): string { return this.lines.join("\n"); }

	public constructor(filename: string)
	{
		this.filename = filename;

		//读取文件
		if (fs.existsSync(filename))
		{
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
	public findAndReplaceLine(reg: RegExp, callback: (string, RegExpMatchArray) => string)
	{
		for (let i = 0; i < this.lines.length; ++i)
		{
			let r: RegExpMatchArray = this.lines[i].match(reg);
			if (r && r.length && callback)
			{
				this.lines[i] = callback(this.lines[i], r);
			}
		}
	}
}
