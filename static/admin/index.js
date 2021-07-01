let tableRows;
let state;
let language = 'eng';
let actions;
let back = history.back.bind(history);
let currentData;
let statusBar;

const pictogramUrlValid = /p\/[a-zA-Z0-9_-]+\/\d+/;
const api = new PictoApi();

let contexts = {
	'banks': [showBanks, {}],
	'uploads': [showUploads, {
		'A': ['Download All', downloadAllUploads],
		'D': ['Download', downloadUploads],
		'R': ['Revoke', revokeContrib],
		'N': ['Next Session', nextSession],
		'P': ['Prev. Session', prevSession],
	}],
	'reports': [showReports, {
		'R': ['Revoke', revokeContrib],
		'N': ['Next Session', nextSession],
		'P': ['Prev. Session', prevSession],
	}],
	'updates': [showUpdates, {
		'R': ['Revoke', revokeContrib],
		'N': ['Next Session', nextSession],
		'P': ['Prev. Session', prevSession],
	}],
	'wordnets': [showWordnets, {
		'S': ['StopList', () => navigate({ v: 'stop-list', l: language })],
		'V': ['Variations', () => navigate({ v: 'word-variations', l: language })],
		'W': ['Words', () => navigate({ v: 'word-meanings', l: language })],
		'M': ['Meanings', () => navigate({ v: 'meanings-definitions', l: language })],
	}],
	'word-variations': [showVariations, {
		'F': ['Find', searchVariation],
		'N': ['Next Page', nextPage],
		'P': ['Prev. Page', prevPage],
		'A': ['Set/Add', addVariation],
		'D': ['Delete', delVariation],
	}],
	'stop-list': [showStopList, {
		'A': ['Add', addToStopList],
		'R': ['Remove', remFromStopList],
	}],
	'word-meanings': [showWordMeanings, {
		'F': ['Find', searchWordMeanings],
		'N': ['Next Page', nextPage],
		'P': ['Prev. Page', prevPage],
		'A': ['Set/Add', addWordMeanings],
		'D': ['Delete', delWordMeanings],
	}],
	'meanings-definitions': [showMeanings, {
		'F': ['Find', searchMeaning],
		'N': ['Next Page', nextPage],
		'P': ['Prev. Page', prevPage],
		'A': ['Set/Add', addMeaning],
		'D': ['Delete', delMeaning],
	}],
};
let context;
let contextActions;

function status(text) {
	statusBar.innerText = text;
}

function indexOf(haystack, needle) {
	return Array.prototype.indexOf.call(haystack, needle);
}

function create(tagName) {
	return document.createElement(tagName);
}

function getFocused() {
	let focused = document.getElementsByClassName('focus')[0];
	return focused !== undefined ? path.bind(focused) : undefined;
}

function setFocused(element, reClick) {
	let focused = document.getElementsByClassName('focus')[0];
	if (focused !== undefined) focused.classList.remove('focus');
	if (element) element.classList.add('focus');
	if (reClick) element.click();
}

function navigate(route) {
	let params = [];
	for (let i in route) {
		params.push(i + '=' + encodeURIComponent(route[i]));
	}
	window.location.search = '?' + params.join('&');
}

function onKeyDown(e) {
	let key = e.key;
	let action = contextActions[key.toUpperCase()];
	if (action !== undefined) action[1]();
	else if (key == 'ArrowDown' || key == 'ArrowUp') {
		let diff = (key == 'ArrowUp') ? -1 : 1;
		let focused = document.querySelector('.focus');
		let i = indexOf(tableRows.children, focused) + diff;
		let newFocused = tableRows.children[i];
		if (i < 0 || newFocused === undefined) return;
		setFocused(newFocused, true);
	}
}

function onClick(e) {
	let target = e.target;
	while (target.parentElement != tableRows) {
		target = target.parentElement;
		if (target == document.body) return setFocused(false, false);
	}
	let i = indexOf(tableRows.children, target);
	setFocused(i >= 0 ? target : false, false);
}

function getParams() {
	let query = window.location.search.split('?')[1];
	let params = {};
	if (query !== undefined) {
		query = query.split('&').map((a) => a.split('='));
		for (let q in query) {
			let [key, val] = query[q];
			params[key] = isFinite(val) ? parseInt(val) : val;
		}
	}
	return params;
}

function onBodyLoad() {
	document.addEventListener('keydown', onKeyDown);
	document.addEventListener('mousedown', onClick);
	tableRows = document.getElementById('table-rows');
	actions = document.getElementById('actions');
	statusBar = document.getElementById('status');
	let btnUploads = document.getElementById('btn-uploads');
	let btnReports = document.getElementById('btn-reports');
	let btnUpdates = document.getElementById('btn-updates');
	let btnPictograms = document.getElementById('btn-pictograms');
	let btnWordnets = document.getElementById('btn-wordnets');
	btnUploads.addEventListener('click', () => navigate({ v: 'uploads' }));
	btnReports.addEventListener('click', () => navigate({ v: 'reports' }));
	btnUpdates.addEventListener('click', () => navigate({ v: 'updates' }));
	btnPictograms.addEventListener('click', () => navigate({ v: 'banks' }));
	btnWordnets.addEventListener('click', () => navigate({ v: 'wordnets' }));

	let params = getParams();
	let view = 'uploads';
	let arg1 = null;
	let arg2 = null;
	for (let key in params) {
		let value = params[key];
		/**/ if (key === 'v') view = value;
		else if (key === 'a') arg1 = value;
		else if (key === 'b') arg2 = value;
		else if (key === 'l') language = value;
	}
	contexts[view][0](arg1, arg2);
}

// returns the child specified by the function's arguments
function path() {
	let e = this;
	for (let i in arguments) {
		e = e.children[arguments[i]];
	}
	return e;
}

function switchContext(ctx) {
	actions.textContent = '';
	context = ctx;
	contextActions = contexts[ctx][1];
	for (let keyCap in contextActions) {
		let [name, callback] = contextActions[keyCap];
		let row = create('div');
		row.id = 'action-' + keyCap;
		row.appendChild(create('span'));
		row.appendChild(create('div'));
		row.appendChild(create('span'));
		row.addEventListener('click', () => callback());
		row.classList.add('flex-x');
		actions.appendChild(row);
		row = path.bind(row);
		row(0).innerText = name;
		row(1).classList.add('spacer');
		row(2).innerText = keyCap;
	}
	tableRows.textContent = '';
	let currentHeader = document.getElementsByClassName('current-header')[0];
	if (currentHeader) currentHeader.classList.remove('current-header');
	let header = document.getElementById(ctx + '-header');
	header.classList.add('current-header');
	let template = document.getElementById(ctx + '-template');
	return [path.bind(header), template];
}

function timestampToString(timestamp) {
	let date = new Date(parseInt(timestamp));
	let text = date.getDate();
	text += '/' + (date.getMonth() + 1);
	text += '/' + date.getFullYear();
	text += ' ' + date.getHours();
	text += ':' + ('0' + date.getMinutes()).slice(-2);
	return text;
}

function nextSession() {
	api.summary((state) => {
		let params = getParams();
		let i = state.sessions.indexOf(params.a);
		if ((i + 1) >= state.sessions.length) return alert('This is the last page');
		params.a = state.sessions[i + 1];
		navigate(params);
	});
}

function prevSession() {
	api.summary((state) => {
		let params = getParams();
		let i = state.sessions.indexOf(params.a);
		if (i == 0) return alert('This is the first page');
		params.a = state.sessions[i - 1];
		navigate(params);
	});
}

function showUploads(sessionId) {
	if (sessionId === null) {
		api.currentSessionId((sessionId) => {
			navigate({ v: 'uploads', a: sessionId });
		});
	} else {
		let [header, template] = switchContext('uploads');
		status('Session: ' + timestampToString(sessionId));
		api.uploads(sessionId, (uploads) => {
			currentData = uploads;
			for (let u in uploads) {
				let upload = uploads[u];
				let instance = path.bind(template.cloneNode(true));
				tableRows.appendChild(instance());
				instance().id = u;
				if (upload.revoked) {
					instance().classList.add('revoked');
					instance().title = 'Canceled';
				}
				instance(0, 0).innerText = upload.sentence;
				for (let p in upload.pictograms) {
					let [synset, pictogram] = upload.pictograms[p];
					if (pictogramUrlValid.test(pictogram)) {
						instance(0, 1).appendChild(create('img'));
						instance(0, 1, p).src = '/' + pictogram;
					}
				}
			}
		});
	}
}

function showReports(sessionId) {
	if (sessionId === null) {
		api.currentSessionId((sessionId) => {
			navigate({ v: 'reports', a: sessionId });
		});
	} else {
		let [header, template] = switchContext('reports');
		status('Session: ' + timestampToString(sessionId));
		api.issues(sessionId, (issues) => {
			currentData = issues;
			for (let i in issues) {
				let issue = issues[i];
				let instance = path.bind(template.cloneNode(true));
				tableRows.appendChild(instance());
				instance().id = i;
				if (issue.revoked) {
					instance().classList.add('revoked');
					instance().title = 'Canceled';
				}
				instance(0, 0).innerText = issue.sentence;
				instance(0, 1).innerText = '(' + issue.language + ')';
				instance(1, 0).innerText = 'missing ' + issue.issue;
				instance(1, 1).innerText = 'comment: ' + issue.comment;
			}
		});
	}
}

function showUpdates(sessionId) {
	if (sessionId === null) {
		api.currentSessionId((sessionId) => {
			navigate({ v: 'updates', a: sessionId });
		});
	} else {
		let [header, template] = switchContext('updates');
		status('Session: ' + timestampToString(sessionId));
		api.updates(sessionId, (updates) => {
			currentData = updates;
			for (let i in updates) {
				let update = updates[i];
				let instance = path.bind(template.cloneNode(true));
				tableRows.appendChild(instance());
				instance().id = i;
				if (update.revoked) {
					instance().classList.add('revoked');
					instance().title = 'Canceled';
				}
				let item = update.lang + ' / ' + update.tool;
				let action = update.action;
				if (update.key) item += ' / ' + update.key;
				if (update.value) action += ': ' + update.value;
				instance(0, 0).innerText = item;
				instance(1, 0).innerText = action;
			}
		});
	}
}

function showBanks() {
	let [header, template] = switchContext('banks');
	status('Pictogram Banks');
	api.summary((state) => {
		currentData = state;
		for (let b in state.banks) {
			let bank = state.banks[b];
			let instance = path.bind(template.cloneNode(true));
			tableRows.appendChild(instance());
			instance().id = b;
			instance(0).innerText = b;
			instance(1, 0).innerText = bank.manifest.contact;
			instance(1, 0).href = 'mailto:' + bank.manifest.contact;
			instance(2, 0).innerText = bank.names;
			instance(2, 1).innerText = bank.manifest.format;
		}
	});
}

function addToStopList() {
	let row = getFocused();
	let value = prompt('Word:');
	if (value !== null) {
		api.addStopWord(value, language, (start) => {
			if (start === undefined) alert('Error');
			else showStopList();
		});
	}
}

function remFromStopList() {
	let row = getFocused();
	let value = prompt('Word:', row ? row(0, 0).innerText : '');
	if (value !== null) {
		api.remStopWord(value, language, (start) => {
			if (start === undefined) alert('Error');
			else showStopList();
		});
	}
}

function showStopList() {
	let [header, template] = switchContext('stop-list');
	status('StopList');
	api.stopList(language, (stopList) => {
		currentData = stopList;
		for (let b in stopList) {
			let word = stopList[b];
			let instance = path.bind(template.cloneNode(true));
			tableRows.appendChild(instance());
			instance().id = b;
			instance(0, 0).innerText = word;
		}
	});
}

function showWordnets() {
	let [header, template] = switchContext('wordnets');
	status('Supported Languages');
	api.summary((state) => {
		currentData = state;
		for (let l in state.toolboxes) {
			let toolbox = state.toolboxes[l];
			let instance = path.bind(template.cloneNode(true));
			tableRows.appendChild(instance());
			instance().id = l;
			instance().addEventListener('click', () => { language = l; });
			instance(0).innerText = l;
			instance(1, 0).innerText = toolbox.variations;
			instance(1, 1).innerText = toolbox.stopList;
			instance(2, 0).innerText = toolbox.synsets;
			instance(2, 1).innerText = toolbox.definitions;
		}
	});
}

function addVariation() {
	let row = getFocused();
	let key = prompt('Variant:', row ? row(0, 0).innerText : '');
	let value = key === null ? null : prompt('Canonical form:', row ? row(1, 0).innerText : '');
	if (value !== null) {
		api.setWordVariation(key, value, language, (start) => {
			if (start === undefined) alert('Error');
			else searchVariation(key);
		});
	}
}

function delVariation() {
	let row = getFocused();
	let key = prompt('Variant:', row ? row(0, 0).innerText : '');
	if (key !== null) {
		api.delWordVariation(key, language, (start) => {
			if (start === undefined) alert('Error');
			else searchVariation(key);
		});
	}
}

function searchVariation(term) {
	term = term ? term : prompt();
	if (term) api.findWordVariation(term, language, (start) => {
		if (start === undefined) alert('Error');
		navigate({ v: 'word-variations', a: start, l: language });
	});
}

function showVariations(start, length) {
	start = start === null ? 0 : start;
	length = length === null ? 10 : length;
	let [header, template] = switchContext('word-variations');
	status('Variations (' + language + ')');
	api.wordsVariations(start, length, language, (result) => {
		currentData = result;
		for (let i in result.keys) {
			let instance = path.bind(template.cloneNode(true));
			tableRows.appendChild(instance());
			let key = result.keys[i];
			instance().id = i;
			instance(0, 0).innerText = key;
			instance(1, 0).innerText = result.values[i];
		}
	});
}

function addWordMeanings() {
	let row = getFocused();
	let key = prompt('Word:', row ? row(0, 0).innerText : '');
	let value = key === null ? null : prompt('Synsets, comma-separated:', row ? row(1, 0).innerText : '');
	if (value !== null) {
		value = value.split(' ').join('').split('-').join('').split(',');
		api.setWordMeanings(key, value, language, (start) => {
			if (start === undefined) alert('Error');
			else searchWordMeanings(key);
		});
	}
}

function delWordMeanings() {
	let row = getFocused();
	let key = prompt('Word:', row ? row(0, 0).innerText : '');
	if (key !== null) {
		api.delWordMeanings(key, language, (start) => {
			if (start === undefined) alert('Error');
			else searchWordMeanings(key);
		});
	}
}

function searchWordMeanings(term) {
	term = term ? term : prompt();
	if (term) api.findWordMeanings(term, language, (start) => {
		if (start === undefined) alert('Error');
		navigate({ v: 'word-meanings', a: start, l: language });
	});
}

function showWordMeanings(start, length) {
	start = start === null ? 0 : start;
	length = length === null ? 10 : length;
	let [header, template] = switchContext('word-meanings');
	status('Word Meanings (' + language + ')');
	api.wordsMeanings(start, length, language, (result) => {
		currentData = result;
		for (let i in result.keys) {
			let instance = path.bind(template.cloneNode(true));
			tableRows.appendChild(instance());
			let key = result.keys[i];
			instance().id = i;
			instance(0, 0).innerText = key;
			instance(1, 0).innerText = result.values[i];
		}
	});
}

function addMeaning() {
	let row = getFocused();
	let key = prompt('Synset:', row ? row(0, 0).innerText : '');
	let value = key === null ? null : prompt('Definition:', row ? row(1, 0).innerText : '');
	if (value !== null) {
		api.setMeaningDefinition(key, value, language, (start) => {
			if (start === undefined) alert('Error');
			else searchMeaning(key);
		});
	}
}

function delMeaning() {
	let row = getFocused();
	let key = prompt('Synset:', row ? row(0, 0).innerText : '');
	if (key !== null) {
		api.delMeaningDefinition(key, language, (start) => {
			if (start === undefined) alert('Error');
			else searchMeaning(key);
		});
	}
}

function searchMeaning(term) {
	term = term ? term : prompt();
	if (term) api.findMeaningDefinition(term, language, (start) => {
		if (start === undefined) alert('Error');
		navigate({ v: 'meanings-definitions', a: start, l: language });
	});
}

function showMeanings(start, length) {
	start = start === null ? 0 : start;
	length = length === null ? 10 : length;
	let [header, template] = switchContext('meanings-definitions');
	status('Meanings (' + language + ')');
	api.meaningsDefinitions(start, length, language, (result) => {
		currentData = result;
		for (let i in result.keys) {
			let instance = path.bind(template.cloneNode(true));
			tableRows.appendChild(instance());
			let key = result.keys[i];
			instance().id = i;
			instance(0, 0).innerText = key;
			instance(1, 0).innerText = result.values[i];
		}
	});
}

function prevPage() {
	let params = getParams();
	if (params.a === undefined) params.a = 0;
	if (params.b === undefined) params.b = 10;
	params.a -= params.b;
	if (params.a >= 0) navigate(params);
	else alert('This is the first page.');
}

function nextPage() {
	let params = getParams();
	if (params.a === undefined) params.a = 0;
	if (params.b === undefined) params.b = 10;
	params.a += params.b;
	navigate(params);
}

function revokeContrib() {
	let focused = getFocused();
	if (focused !== undefined) {
		let revoked = () => focused().classList.add('revoked');
		let i = parseInt(focused().id);
		let item = currentData[i];
		item.revoked = true;
		let params = getParams();
		let view = params.v;
		let session = params.a;
		/*__*/ if (view === 'uploads') {
			api.revokeUpload(session, item.timestamp, item.user, revoked);
		} else if (view === 'reports') {
			api.revokeIssue(session, item.timestamp, item.user, revoked);
		} else if (view === 'updates') {
			api.revokeUpdate(session, item.timestamp, item.user, revoked);
		}
		status('Revoked item n°' + (i + 1));
	} else alert('Please select something.');
}

function download(data, filename, type) {
    let file = new Blob([data], {type: type});
	let anchor = document.createElement('a');
	let url = URL.createObjectURL(file);
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	setTimeout(() => {
		document.body.removeChild(anchor);
		URL.revokeObjectURL(url);  
	}, 0);
}

function downloadUploads() {
	let params = getParams();
	download(JSON.stringify(currentData), 'uploads-' + params.a + '.json', 'application/json');
	status('Downloaded session #' + params.a);
}

function downloadAllUploads() {
	api.summary((state) => {
		let uploads = [];
		let remaining = state.sessions.length;
		state.sessions.sort();
		for (let i in state.sessions) {
			let sessionId = state.sessions[i];
			api.uploads(sessionId, (data) => {
				status('Preparing session #' + sessionId);
				uploads = uploads.concat(data);
				remaining--;
			});
		}
		let scheduler;
		scheduler = setInterval(() => {
			if (remaining === 0) {
				download(JSON.stringify(uploads), 'all-uploads.json', 'application/json');
				status('Downloaded all uploads');
				clearInterval(scheduler);
			}
		}, 500);
	});
}
