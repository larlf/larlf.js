import * as fs from 'fs';
import log from "./log";
import text from "./text";
import * as SourceMapSupport from 'source-map-support';
import Log from './log';
import * as crc from 'crc';

SourceMapSupport.install();

/**
 * 用于生成OP的任务
 */
class OPTask
{
	ops: OPValue[] = [];

	constructor(filename: string)
	{
		let text = fs.readFileSync(filename).toString();
		let lines = text.split('\n');
		let reg: RegExp = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\=\s*([0-9]+)\;?(\s*\/\/(.*))?/;
		lines.forEach((line) =>
		{
			line = line.trim();
			line = line.replace(/\r/g, "");
			line = line.replace(/\t/g, " ");

			//注释
			if (line.length <= 0 || line.startsWith("//") || line.startsWith("/*"))
				return;

			let v = reg.exec(line);
			if (!v)
			{
				log.error("Bad op desc : " + line);
				return;
			}
			else
			{
				//log.debug(v);
				let name = v[1];
				let value = parseInt(v[2]);
				let comment = v[4];
				let op = new OPValue(name, value, comment);
				this.ops.push(op);
			}
		});
	}

	toCSConstCode(): string[]
	{
		let lines: string[] = [];
		this.ops.forEach(it =>
		{
			lines.push(it.toCSConstCode());
		});

		return lines;
	}

	toCSInitCode(): string[]
	{
		let lines: string[] = [];
		this.ops.forEach(it =>
		{
			lines.push(it.toCSInitCode());
		});

		return lines;
	}
}

class OPValue
{
	name: string;
	value: number;
	comment: string;

	constructor(name: string, value: number, comment: string)
	{
		this.name = name;
		this.value = value;
		this.comment = comment;
	}

	toCSConstCode(): string
	{
		return text.format("public const int {0} = {1};", this.name, this.value + "");
	}

	toCSInitCode(): string
	{
		//OP.Values[1] = "name";
		return text.format("OP.Values[{0}] = \"{1}\";", this.value + "", this.name);
	}
}

//___________________________________________________________________________

let CSTypeMap = {
};

/**
 * 用于生成Entity的任务
 */
class DataObjTask
{
	filename: string;
	objs: DataObj[] = [];

	constructor(filename: string)
	{
		this.filename = filename;
		if (!fs.existsSync)
		{
			Log.error("Cannot find entities define : " + filename);
		}
		else
		{
			let text = fs.readFileSync(filename).toString();
			this._parseText(text);
		}

	}

	_parseText(text: string)
	{
		if (!text)
			return;

		let idRule = "([a-zA-Z_][a-zA-Z_0-9]*)";
		let commentRule = "(\s*\/\/(.*))?";
		let classRule: RegExp = new RegExp("class\\s+" + idRule + "\\s*(\\:\\s*([a-zA-Z_0-9]+)\\s*)?(\\(([a-zA-Z_0-9]+)\\)\\s*)?(\\/\\/(.*))?(\\s*\\{([a-zA-Z_0-9]+)\\})?");
		let valueRule: RegExp = new RegExp(idRule + "\\s+" + idRule + "\\;?" + commentRule);
		let arrayRule: RegExp = new RegExp("array\<" + idRule + "\>\\s+" + idRule + "\\;?" + commentRule);
		let mapRule: RegExp = new RegExp("map\<" + idRule + "\>\\s+" + idRule + "\\;?" + commentRule);

		let currentObj: DataObj;
		let currentVal: DataVal;
		let tempComment: string;
		let lines = text.split("\n");
		for (let i = 0; i < lines.length; ++i)
		{
			let line = lines[i].trim();

			if (!line || line == "{" || line == "}" || line.startsWith("\/*"))
			{
				tempComment = null;
				continue;
			}

			if (line.startsWith("\/\/"))  //单行注释
			{
				tempComment = line.substr(2).trim();
			}
			else if (line.startsWith("class"))  //处理class的开始
			{
				//当前的保存一下
				if (currentObj)
				{
					this.objs.push(currentObj);
					currentObj = null;
				}

				let r = classRule.exec(line);
				if (!r)
				{
					log.error("Bad class define : " + line);
					currentObj = null;
					continue;
				}

				let name = r[1];
				let code = r[5];
				let keys = r[9];
				currentObj = new DataObj(name, code, keys, tempComment);
			}
			else if (line.startsWith("array<"))
			{
				let r = arrayRule.exec(line);
				if (!r)
				{
					log.error("Bad array define : " + line);
					continue;
				}

				let type = r[1];
				let name = r[2];
				let comment = r[4];

				currentVal = new DataArrayVal(name, type, comment);
			}
			else if (line.startsWith("map<"))
			{
				let r = mapRule.exec(line);
				if (!r)
				{
					log.error("Bad map define : " + line);
					continue;
				}

				let type = r[1];
				let name = r[2];
				let comment = r[4];

				currentVal = new DataMapVal(name, type, comment);
			}
			else  //普通字段
			{
				let r = valueRule.exec(line);
				if (!r)
				{
					log.error("Bad value define : " + line);
					continue;
				}

				let type = r[1];
				let name = r[2];
				let comment = r[4];

				currentVal = new DataSimpleVal(name, type, comment);
			}

			//添加到对象
			if (currentVal)
			{
				if (currentObj)
					currentObj.vals.push(currentVal);

				currentVal = null;
			}
		}

		if (currentObj)
			this.objs.push(currentObj);
	}

	toString(): string
	{
		let str = "";
		this.objs.forEach(it =>
		{
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
class DataObj
{
	name: string;
	code: string;
	keys: string;
	comment: string;
	vals: DataVal[] = [];

	constructor(name: string, code: string, keys: string, comment: string)
	{
		this.name = name;
		this.code = code;
		this.keys = keys;
		this.comment = comment;
		//log.debug("[class] " + name);
	}

	toString(): string
	{
		let str = "class " + this.name + "";
		this.vals.forEach(it =>
		{
			str += "\n\t";
			str += it.toString();
		});
		return str;
	}

	isEntity(): boolean
	{
		return true;
	}

	version(): number
	{
		let num: number = crc.crc32(this.versionString()) - 0x80000000;
		if (num == 0)
			num = -0x80000000;
		return num;
	}

	versionString(): string
	{
		let strs: string[] = [];
		strs.push(this.name);
		if (this.code)
			strs.push(this.code);
		this.vals.forEach(it =>
		{
			strs.push(it.versionString());
		});
		return strs.join(",");
	}
}

/**
 * 数据对象的字段
 */
class DataVal
{
	name: string;
	type: string;
	comment: string;

	constructor(name: string, type: string, comment: string)
	{
		this.name = name;
		this.type = type;
		this.comment = comment;
	}

	toString()
	{
		return this.name + " : " + this.type;
	}

	isBasicType(): boolean
	{
		return true;
	}

	csName(): string
	{
		return this.name.toUpperCase().substring(0, 1) + this.name.substring(1);
	}

	csType(): string
	{
		return this.type;
	}

	csDefaultValue(): string
	{
		switch (this.type)
		{
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

	versionString(): string
	{
		return this.name + ":" + this.type;
	}
}

class DataSimpleVal extends DataVal
{
	constructor(name: string, type: string, comment: string)
	{
		super(name, type, comment);
	}
}

class DataArrayVal extends DataVal
{
	constructor(name: string, type: string, comment: string)
	{
		super(name, type, comment);
	}

	isBasicType(): boolean
	{
		return false;
	}

	csType(): string
	{
		return "List<" + this.type + ">";
	}

	versionString(): string
	{
		return this.name + ":" + this.type + "[]";
	}
}

class DataMapVal extends DataVal
{
	constructor(name: string, type: string, comment: string)
	{
		super(name, type, comment);
	}

	isBasicType(): boolean
	{
		return false;
	}

	csType(): string
	{
		return "Dictionary<string, " + this.type + ">";
	}

	versionString(): string
	{
		return this.name + ":{" + this.type + "}";
	}
}

//_________________________________________________________________

export default {
	OPTask,
	DataObjTask
};


