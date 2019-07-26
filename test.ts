import * as larlf_log from './log';
import * as larlf_file from './file';

let log = larlf_log.Logger;

test1();

function test1()
{
	let filename = "D:/project/games/fish/trunk/dev/client/native/android/fish_hunter/android_studio/app/build.gradle.bak";
	let file = new larlf_file.LinesFile(filename);
	log.debug(file.text);

	file.findAndReplaceLine(/(minSdkVersion\s+)([0-9]+)/, (line, r) =>
	{
		line = line.replace(r[0], "minSdkVersion 18");
		return line;
	});

	if (file.findLine(/abiFilters\s\'armeabi-v7a\'/) < 0)
	{
		let n = file.findLine(/versionName\s/g);
		if (n >= 0)
		{
			file.insertAfter(n, `
	ndk {
		abiFilters 'armeabi-v7a'
	}		
			`);
		}
	}

	if (file.findLine(/flatDir/) < 0)
	{
		let n = file.findLine(/dependencies\s+\{/);
		if (n >= 0)
		{
			file.insertBefore(n, `
repositories {
	flatDir{
		dirs 'libs','support','ads'
	}
}	
			`);
		}
	}

	if (file.findLine(/支持库/) < 0)
	{
		let n = file.findLine(/com\.android\.support\:appcompat\-/g);
		if (n >= 0)
		{
			file.replace(n, 1, `
	// 支持库
	api(name: 'UPAdsSdk_LayaJs_3.0.07.4_dex', ext: 'aar')
	api(name: 'animated-vector-drawable-26.1.0', ext: 'aar')
	api(name: 'appcompat-v7-26.1.0', ext: 'aar')
	api(name: 'common-1.0.0', ext: 'jar')
	api(name: 'customtabs-26.1.0', ext: 'aar')
	api(name: 'gson-2.7', ext: 'jar')
	api(name: 'recyclerview-v7-26.1.0', ext: 'aar')
	api(name: 'runtime-1.0.0', ext: 'aar')
	api(name: 'support-annotations-26.1.0', ext: 'jar')
	api(name: 'support-compat-26.1.0', ext: 'aar')
	api(name: 'support-core-ui-26.1.0', ext: 'aar')
	api(name: 'support-core-utils-26.1.0', ext: 'aar')
	api(name: 'support-fragment-26.1.0', ext: 'aar')
	api(name: 'support-media-compat-26.1.0', ext: 'aar')
	api(name: 'support-v4-26.1.0', ext: 'aar')
	api(name: 'support-vector-drawable-26.1.0', ext: 'aar')
	api(name: 'supprot-common-1.0.0', ext: 'jar')

	//广告
	api(name: 'android-gif-drawable', ext: 'aar')
	api(name: 'baidu_ads', ext: 'aar')
	api(name: 'gdt_ads', ext: 'aar')
	api(name: 'mintegral_ads', ext: 'aar')
	api(name: 'oneway_ads', ext: 'aar')
	api(name: 'playable_ads', ext: 'aar')
	api(name: 'sigmob_ads', ext: 'aar')
	api(name: 'toutiao_ads', ext: 'aar')
	api(name: 'vungle_ads', ext: 'aar')
			`);
		}
	}


	log.debug(file.text);
	file.save(filename + ".bak");
}
