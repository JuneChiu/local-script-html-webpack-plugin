'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var babel = require('babel-core');
var UglifyJS = require('uglify-js');

var process = function process(compilation, htmlPluginData) {
	return new Promise(function (resolve) {
		var bodyRegExp = /(<\/body>)/i;
		var str = '{\n\t\t\t// 检测当前是否为隐私模式\n\t\t\tlet isPrivate = false;\n\n\t\t\ttry {\n\t\t\t\twindow.localStorage.test = 1;\n\t\t\t}\n\t\t\tcatch (e) {\n\t\t\t\tisPrivate = true;\n\t\t\t}\n\n\t\t\t// 避免暴露到全局中\n\t\t\tconst scriptKeyPrefix = \'STORE_SCRIPT_' + compilation.hash + '\';\t\n\t\t\tlet current = 0;\n\t\t\tconst clearCached = () => {\n\t\t\t\tconst localStorageKeys = Object.keys(window.localStorage);\n\t\t\t\tlocalStorageKeys.forEach(name => {\n\t\t\t\t\tif (name.indexOf(scriptKeyPrefix) === 0) {\n\t\t\t\t\t\twindow.localStorage.removeItem(name);\n\t\t\t\t\t}\n\t\t\t\t});\n\t\t\t};\n\n\t\t\tconst execScript = (url, script, index, isCached) => {\n\t\t\t\tconst type = url.split(\'.\').pop().split(\'?\').shift();\n\t\t\t\tif (index > current) {\n\t\t\t\t\tisCached ? execScript(url, script, index) : setTimeout(function(){\n\t\t\t\t\t\texecScript(url, script, index);\n\t\t\t\t\t});\n\t\t\t\t}\n\t\t\t\telse {\n\t\t\t\t\tif (type === \'css\') {\n\t\t\t\t\t\tconst style =  document.createElement(\'style\');\n\t\t\t\t\t\tstyle.innerHTML = script;\n\n\t\t\t\t\t\tdocument.querySelector(\'head\').appendChild(style);\n\t\t\t\t\t}\n\t\t\t\t\telse {\n\t\t\t\t\t\teval.call(window, script);\n\t\t\t\t\t}\n\n\t\t\t\t\tcurrent = index + 1;\n\n\t\t\t\t\tif (!isPrivate) {\n\t\t\t\t\t\ttry {\n\t\t\t\t\t\t\t// 存储脚本到本地存储中\n\t\t\t\t\t\t\t// 容错：避免容量不足\n\t\t\t\t\t\t\twindow.localStorage.setItem(scriptKeyPrefix + url, script);\n\t\t\t\t\t\t}\n\t\t\t\t\t\tcatch (e) {\n\t\t\t\t\t\t\tclearCached();\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t};\n\n\t\t\tconst fetchSource = (url, index) => {\n\t\t\t\tif (!isPrivate) {\n\t\t\t\t\tconst cachedData = window.localStorage.getItem(scriptKeyPrefix + url);\n\t\t\t\t\tif (cachedData) {\n\t\t\t\t\t\treturn execScript(url, cachedData, index, true);\n\t\t\t\t\t}\n\t\t\t\t}\n\n\t\t\t\tconst request = new XMLHttpRequest();\n\t\t\t\trequest.open(\'GET\', url, true);\n\t\t\t\trequest.onreadystatechange = () => {\n\t\t\t\t\tif (request.readyState === 4) {\n\t\t\t\t\t\trequest.status === 200 ? execScript(url, request.responseText, index) : console.error(request);\n\t\t\t\t\t}\n\t\t\t\t};\n\t\t\t\trequest.send();\n\t\t\t};\n\n\n\t\t\tif (!isPrivate && window.localStorage.getItem(\'SCRIPTKEYPREFIX\') !== scriptKeyPrefix) {\n\t\t\t\t//清空历史缓存\n\t\t\t\tclearCached();\n\t\t\t\twindow.localStorage.setItem(\'SCRIPTKEYPREFIX\', scriptKeyPrefix);\n\t\t\t}\n\t\t\t\n\t\t\t' + JSON.stringify(htmlPluginData.assets.css) + '.forEach(fetchSource);\n\n\t\t\t' + JSON.stringify(htmlPluginData.assets.js) + '.forEach((url, index) => {\n\t\t\t\tfetchSource(url, index + ' + htmlPluginData.assets.css.length + ');\n\t\t\t});\n\t\t}';

		var es5Code = babel.transform(str, { 'presets': ['es2015'] }).code;
		var compressCode = UglifyJS.minify(es5Code, { fromString: true }).code;
		var insertTxt = '<script>' + compressCode + '</script>';

		htmlPluginData.html = htmlPluginData.html.replace(bodyRegExp, function (match) {
			return insertTxt + match;
		});

		htmlPluginData.plugin.options.inject = false;

		resolve();
	});
};

var LocalScriptHtmlPlugin = function () {
	function LocalScriptHtmlPlugin() {
		_classCallCheck(this, LocalScriptHtmlPlugin);
	}

	_createClass(LocalScriptHtmlPlugin, [{
		key: 'apply',
		value: function apply(compiler) {
			compiler.plugin('compilation', function (compilation) {
				compilation.plugin('html-webpack-plugin-before-html-processing', function (htmlPluginData, callback) {
					process(compilation, htmlPluginData).then(callback).catch(callback);
				});
			});
		}
	}]);

	return LocalScriptHtmlPlugin;
}();

exports.default = LocalScriptHtmlPlugin;
module.exports = exports['default'];