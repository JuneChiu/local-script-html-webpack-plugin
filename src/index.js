const babel = require('babel-core');
const UglifyJS = require('uglify-js');

const process = (compilation, htmlPluginData) => {
	return new Promise((resolve) => {
		const bodyRegExp = /(<\/body>)/i;
		const str = `{
			// Detetc iPhone private mode
			let isPrivate = false;

			try {
				window.localStorage.test = 1;
			}
			catch (e) {
				isPrivate = true;
			}

			const scriptKeyPrefix = 'STORE_SCRIPT_${compilation.hash}';	

			let current = 0;

			// Clear the script cached
			const clearCached = () => {
				const localStorageKeys = Object.keys(window.localStorage);
				localStorageKeys.forEach(name => {
					if (name.indexOf(scriptKeyPrefix) === 0) {
						window.localStorage.removeItem(name);
					}
				});
			};

			const execScript = (url, script, index, isCached) => {
				const type = url.split('.').pop().split('?').shift();
				if (index > current) {
					isCached ? execScript(url, script, index) : setTimeout(function(){
						execScript(url, script, index);
					});
				}
				else {
					if (type === 'css') {
						const style =  document.createElement('style');
						style.innerHTML = script;

						document.querySelector('head').appendChild(style);
					}
					else {
						eval.call(window, script);
					}

					current = index + 1;

					if (!isPrivate) {
						setTimeout(() => {
							try {
								// prevent the storage is not large enough
								window.localStorage.setItem(scriptKeyPrefix + url, script);
							}
							catch (e) {
								clearCached();
							}
						});
					}
				}
			};

			const fetchSource = (url, index) => {
				if (!isPrivate) {
					const cachedData = window.localStorage.getItem(scriptKeyPrefix + url);
					if (cachedData) {
						return execScript(url, cachedData, index, true);
					}
				}

				const request = new XMLHttpRequest();
				request.open('GET', url, true);
				request.onreadystatechange = () => {
					if (request.readyState === 4) {
						request.status === 200 ? execScript(url, request.responseText, index) : console.error(request);
					}
				};
				request.send();
			};

			// Refresh local data
			if (!isPrivate && window.localStorage.getItem('SCRIPTKEYPREFIX') !== scriptKeyPrefix) {
				clearCached();
				window.localStorage.setItem('SCRIPTKEYPREFIX', scriptKeyPrefix);
			}
			
			${JSON.stringify(htmlPluginData.assets.css)}.forEach(fetchSource);

			${JSON.stringify(htmlPluginData.assets.js)}.forEach((url, index) => {
				fetchSource(url, index + ${htmlPluginData.assets.css.length});
			});
		}`;

		const es5Code = babel.transform(str, {'presets': ['es2015']}).code;
		const compressCode = UglifyJS.minify(es5Code, {fromString: true}).code;
		const insertTxt = '<script>' + compressCode + '</script>';

		htmlPluginData.html = htmlPluginData.html.replace(bodyRegExp, match => {
			return insertTxt + match;
		});

		htmlPluginData.plugin.options.inject = false;

		resolve();
	});
};


export default class LocalScriptHtmlPlugin {
	constructor() {

	}
	
	apply(compiler) {
		compiler.plugin('compilation', compilation => {
			compilation.plugin('html-webpack-plugin-before-html-processing', (htmlPluginData, callback) => {
				process(compilation, htmlPluginData).then(callback).catch(callback);
			});
		});
	}
}