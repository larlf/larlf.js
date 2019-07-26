import * as fs from "fs";
import log from "./log";

export function format(str: string, ...argv: string[]): string
{
	for (let i = 0; i < argv.length; ++i)
	{
		let reg = new RegExp("\\{" + (i) + "\\}", "g");
		str = str.replace(reg, argv[i]);
	}

	return str;
}

export function templet(str: string, values: { [key: string]: string }): string
{
	for (let key in values)
	{
		let reg = new RegExp("\\{" + (key) + "\\}", "g");
		str = str.replace(reg, values[key]);
	}

	return str;
}

//替换文件中的一块内容
export function replaceBlock(text: string, startReg: RegExp, endReg: RegExp, data: string | string[], indent?: string): string
{
	let lines = text.split("\n");
	let startLine = -1;
	let endLine = -1;
	let dataLines: string[] = null;

	//处理不同参数
	if (typeof (data) === "string")
	{
		dataLines = (<string>data).split("\n");
	}
	else
	{
		dataLines = [];
		for (let i = 0; i < data.length; ++i)
		{
			dataLines[i] = (<string[]>data)[i];
		}
	}

	//查找开始和结束的位置
	for (let i = 0; i < lines.length; ++i)
	{
		if (startLine < 0 && lines[i].match(startReg)) startLine = i;
		if (endLine < 0 && lines[i].match(endReg)) endLine = i;
	}

	//替换内容
	if (startLine >= 0 && endLine >= 0 && endLine > startLine)
	{
		//如果没有设置缩进，就用第一个标签的缩进
		if (!indent)
		{
			let startLineText = lines[startLine];
			let startLineIndentPos = startLineText.indexOf(startLineText.trim());
			indent = startLineText.substr(0, startLineIndentPos);
		}

		//处理indent
		if (indent)
		{
			for (let i in dataLines)
			{
				dataLines[i] = indent + dataLines[i];
			}
		}

		lines.splice(startLine + 1, endLine - startLine - 1, dataLines.join("\n"));
	}
	else log.error("Cannot find replace block : (" + startLine + "," + endLine + ") with rules : " + startReg + "," + endReg);

	return lines.join("\n");
};

/**
 * 替换文件中的文本块
 * @param filename 文件名称
 * @param key 关键字，开始的地方会在前面加Start，结束会加End
 * @param data 要替换成的数据
 * @param indent 缩进，为null的时候自动处理
 * @param notRewrite 不重写文件，只是把结果返回
 */
export function replaceFileBlock(filename: string, key: string, data: string | string[], indent?: string, notRewrite?: boolean): string
{
	if (!fs.existsSync(filename))
	{
		log.error("Cannot find file : " + filename);
		return null;
	}

	let text = fs.readFileSync(filename).toString();
	text = replaceBlock(text, new RegExp(key + "\s?Start"), new RegExp(key + "\s?End"), data, indent);

	//写入文件
	if (!notRewrite)
	{
		log.debug("Write : " + filename);
		fs.writeFileSync(filename, text);
	}

	return text;
}
