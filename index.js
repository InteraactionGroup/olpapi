const express = require('express');
const natural = require('natural');
const fs = require('fs');
const Dichotomous = require('./dicho').Dichotomous;
const app = express();
const port = 4201;

// utility functions
const read = fileName => fs.readFileSync(fileName, 'utf8');
const json = fileName => JSON.parse(read(fileName));
const dicho = fileName => new Dichotomous(json(fileName));
const sendJson = (r, data) => r.send(JSON.stringify(data));
const has = (h, n) => h.hasOwnProperty(n) ? h[n] : undefined;
const define = (d, s) => (d.get(s) || '[missing definition]');
const size = o => Object.values(o).length;

const dirs = {
	wordnets: 'wordnets/',
	pictograms: 'pictograms/',
	sessions: 'sessions/',
};

// pictogram banks
const pictograms = (() => {
	let pictograms = {};
	let banks = fs.readdirSync(dirs.pictograms);
	for (let b in banks) {
		let bank = banks[b];
		let dir = dirs.pictograms + '/' + bank;
		if (!fs.lstatSync(dir).isDirectory()) continue;
		pictograms[bank] = {
			manifest: json(dir + '/manifest.json'),
			synsets: json(dir + '/synsets.json'),
			counts: json(dir + '/counts.json'),
			names: json(dir + '/names.json'),
		};
	}
	return pictograms;
})();

const toolboxes = (() => {
	let toolboxes = {};
	let wordnets = fs.readdirSync(dirs.wordnets);
	for (let w in wordnets) {
		let lang = wordnets[w];
		let dir = dirs.wordnets + lang;
		if (!fs.lstatSync(dir).isDirectory()) continue;
		let tokName = read(dir + '/tokenizer.txt').split('\n')[0];
		toolboxes[lang] = {
			tokenizer: new natural[tokName](),
			// a map taking a word and returning synsets (potential meanings)
			synsets: dicho(dir + '/synsets.json'),
			// a map taking a word and returning its canonical form
			variations: dicho(dir + '/variations.json'),
			// a map taking a synset and returning a definition
			definitions: dicho(dir + '/definitions.json'),
			stopList: json(dir + '/stop-list.json'),
		};
	}
	return toolboxes;
})();

// SESSION FILES

const sessionId = Date.now().toString();
console.log('session', sessionId);
const sessionPath = dirs.sessions + sessionId;
fs.mkdirSync(sessionPath, { recursive: true });
fs.closeSync(fs.openSync(sessionPath + '/revoked.json', 'w'));
const session = {
	// these are not really JSON files:
	// it's one JSON-encoded object per line per file.
	storage: fs.openSync(sessionPath + '/storage.json', 'w'),
	issues: fs.openSync(sessionPath + '/issues.json', 'w'),
	updates: fs.openSync(sessionPath + '/updates.json', 'w')
};

function getContribution(sessionId, file) {
	let content = [];
	let dir = dirs.sessions + sessionId + '/';
	let revoked = {};
	let revokedFileLines = read(dir + 'revoked.json').split('\n');
	for (let i in revokedFileLines) {
		let [contribFile, timestamp, user] = revokedFileLines[i].split('/');
		if (contribFile === file) {
			revoked[timestamp + user] = true;
		}
	}
	let path = dir + file + '.json';
	if (fs.existsSync(path)) {
		let lines = read(path).split('\n');
		for (let i in lines) {
			let line = lines[i];
			if (!line) continue;
			let contrib = JSON.parse(line);
			if (revoked[contrib.timestamp + contrib.user] === true) contrib.revoked = true;
			content.push(contrib);
		}
	}
	return content;
}

function revokeContribution(sessionId, timestamp, user, file) {
	let path = dirs.sessions + sessionId + '/revoked.json';
	let fd = fs.openSync(path, 'a');
	let line = file + '/' + timestamp + '/' + user;
	fs.writeSync(fd, line + '\n');
	fs.fsyncSync(fd); // flush
	fs.closeSync(fd);
}

// TOOL UPDATING

function setAdd(set, element) {
	if (set.indexOf(element) === -1) set.push(element);
};

function setRem(set, element) {
	let idx = set.indexOf(element);
	if (idx !== -1) set.splice(idx, 1);
};

// ADMIN FUNCTIONS

function processUpdate(u) {
	let a = u.action;
	let toolbox = u.lang ? has(toolboxes, u.lang) : undefined;
	// dichotomous associations
	/**/ if (a == 'set') toolbox[u.tool].set(u.key, u.value);
	else if (a == 'del') toolbox[u.tool].del(u.key);
	// arrays used as sets
	else if (a == 'add') setAdd(toolbox[u.tool], u.value);
	else if (a == 'rem') setRem(toolbox[u.tool], u.value);
}

function summary() {
	let state = {
		banks: {},
		toolboxes: {},
		sessions: [],
	};
	for (let b in pictograms) {
		let bank = pictograms[b];
		state.banks[b] = {
			manifest: bank.manifest,
			names: size(bank.names),
			synsets: size(bank.synsets),
			counts: size(bank.counts),
		};
	}
	for (let lang in toolboxes) {
		let toolbox = toolboxes[lang];
		state.toolboxes[lang] = {
			stopList: size(toolbox.stopList),
			variations: size(toolbox.variations.keys),
			synsets: size(toolbox.synsets.keys),
			definitions: size(toolbox.definitions.keys),
		};
	}
	state.sessions = fs.readdirSync(dirs.sessions).map(svc => parseInt(svc));
	return JSON.stringify(state);
}

// PUBLIC FUNCTIONS

function storeJson(fd, jsonStr, toConcat) {
	try {
		let obj = JSON.parse(jsonStr);
		Object.assign(obj, toConcat);
		fs.writeSync(fd, JSON.stringify(obj) + '\n');
		fs.fsyncSync(fd); // flush
		return 'OK';
	} catch (e) {
		console.error('storeJson', toConcat, e);
		return 'Invalid JSON data'
	}
}

function storeAndApplyUpdate(data) {
	let timestamp = Date.now();
	let json = JSON.stringify(data);
	let ok = storeJson(session.updates, json, { timestamp });
	if (ok === 'OK') processUpdate(data);
	return ok;
}

function synsetsToPictogram(synsetsStr) {
	let synsets = synsetsStr.split('+');
	let results = {};
	for (let b in pictograms) {
		let bank = pictograms[b];
		for (let s in synsets) {
			let sIdx = parseInt(s);
			let corresponding = bank.synsets[synsets[sIdx]];
			if (corresponding === undefined) continue;
			for (let c in corresponding) {
				let i = corresponding[c];
				let p = 'p/' + b + '/' + i.toString();
				if (p in results) {
					results[p].push(sIdx)
				} else {
					let count = bank.counts[i];
					results[p] = [count, sIdx];
				}
			}
		}
	}
	return JSON.stringify(results);
}

function sentenceToSynsets(toolbox, text) {
	let tokenized = toolbox.tokenizer.tokenize(text);
	let tokens = [];
	let definitions = {};
	let stop = 0;
	for (let t in tokenized) {
		let token = tokenized[t];
		let i = text.slice(stop).indexOf(token);
		if (i == -1) console.error('A token was not found in original input:', text, token);
		let start = stop + i;
		stop = start + token.length;
		token = token.toLowerCase();
		let synsets = toolbox.synsets.get(token);
		if (synsets === undefined) {
			token = toolbox.variations.get(token);
			if (token === undefined) continue;
			synsets = toolbox.synsets.get(token);
			if (synsets === undefined) continue;
		}
		if (toolbox.stopList.indexOf(token) != -1) continue;
		tokens.push({ start, stop, synsets });
		for (let s in synsets) {
			let synset = synsets[s];
			definitions[synset] = define(toolbox.definitions, synset);
		}
	}
	return JSON.stringify({ tokens, definitions });
}

function feedTranslationToStorage(user, data) {
	let timestamp = Date.now();
	return storeJson(session.storage, data, { user, timestamp });
}

function storeIssue(user, data) {
	let timestamp = Date.now();
	return storeJson(session.issues, data, { user, timestamp });
}

function getPictogram(b, fileNumber) {
	let path = dirs.pictograms + '/' + b + '/pictograms/' + fileNumber;
	try {
		return fs.readFileSync(path);
	} catch (e) {
		return undefined;
	}
}

// PUBLIC ENDPOINTS

// synsets to pictogram
// example: /s2p/02207206v+07679356n
app.get('/s2p/:synsets', (q, r) => {
	r.send(synsetsToPictogram(q.params.synsets));
});

function appGetToolbox(path, then) {
	app.get(path, (q, r) => {
		let toolbox = has(toolboxes, q.params.lang);
		if (toolbox === undefined) r.status(400).send('Unknown language');
		else then(q, r, toolbox);
	});
}

// sentence to synsets
// example: /t2s/eng/Brian%20is%20in%20the%20kitchen
appGetToolbox('/t2s/:lang/:text', (q, r, t) => r.send(sentenceToSynsets(t, q.params.text)));

// get a pictogram
// example: /p/arasaac/35
app.get('/p/:bank/:file', (q, r) => {
	let b = q.params.bank;
	let f = q.params.file;
	let bank = pictograms[b];
	if (bank === undefined) {
		r.status(400).send('Unknown pictogram bank');
	} else {
		let pictogram = getPictogram(b, f);
		if (pictogram === undefined) {
			r.status(400).send('Unknown pictogram');
		} else {
			r.append('Content-Type', bank.manifest.mime);
			r.send(pictogram);
		}
	}
});

// DIRECT DATA ACCESS

function appGetToolFind(endpoint, tool) {
	appGetToolbox(endpoint + '/:lang/:text', (q, r, t) => {
		return sendJson(r, t[tool].find(q.params.text));
	});
}

function appGetToolGet(endpoint, tool) {
	appGetToolbox(endpoint + '/:lang/:start/:length', (q, r, t) => {
		let start = parseInt(q.params.start);
		let length = parseInt(q.params.length);
		return sendJson(r, t[tool].getRange(start, length));
	});
}

// find something
// ex: /find-word-variation/fra/pom
appGetToolFind('/find-word-variation', 'variations');
appGetToolFind('/find-word-meanings', 'synsets');
appGetToolFind('/find-meaning-definition', 'definitions');

// get a slice of a tool's data
// ex: /words-meanings/fra/580/20
appGetToolGet('/words-variations', 'variations');
appGetToolGet('/words-meanings', 'synsets');
appGetToolGet('/meanings-definitions', 'definitions');

// get stop list
// example: /stop-list/eng
appGetToolbox('/stop-list/:lang', (q, r, t) => sendJson(r, t.stopList));

// AUTHENTICATED ENDPOINTS

function appGetAuth(endpoint, thenStore) {
	app.get(endpoint + '/:key/:data', (q, r) => {
		let user = 'anonymous'; //has(users, q.params.key);
		if (user === undefined) r.status(400).send('Unknown API key');
		else r.send(thenStore(user, q.params.data));
	});
}

// feeding a translation to storage
// example: /feed/execute-order-66/[json data]
appGetAuth('/feed', feedTranslationToStorage);

// report an issue
// example: /issue/execute-order-66/[json data]
appGetAuth('/issue', storeIssue);

// ADMIN ENDPOINTS

function adminGet(path, then) {
	app.get(path, (q, r) => {
		let isAdmin = true;
		if (isAdmin) then(q, r);
		else r.status(403).send('Forbidden');
	});
}

// get a state summary
// example: /summary
adminGet('/summary', (q, r) => r.send(summary()));

adminGet('/updates/:svc', (q, r) => sendJson(r, getContribution(q.params.svc, 'updates')));
adminGet('/issues/:svc', (q, r) => sendJson(r, getContribution(q.params.svc, 'issues')));
adminGet('/storage/:svc', (q, r) => sendJson(r, getContribution(q.params.svc, 'storage')));

function adminRevoker(contrib, file) {
	adminGet('/revoke-' + contrib + '/:svc/:ts/:u', (q, r) => {
		return sendJson(r, revokeContribution(q.params.svc, q.params.ts, q.params.u, file));
	});
}

adminRevoker('update', 'updates');
adminRevoker('issue','issues');
adminRevoker('storage', 'storage');

// get current sessionId
adminGet('/current-session-id', (q, r) => r.send(JSON.stringify(sessionId)));

function adminGetToolbox(path, then) {
	adminGet(path, (q, r) => {
		let toolbox = has(toolboxes, q.params.lang);
		if (toolbox === undefined) r.status(400).send('Unknown language');
		else then(q, r, toolbox);
	});
}

function adminDichoSetter(endpoint, tool, parseValue) {
	adminGetToolbox(endpoint + '/:lang/:key/:value', (q, r, toolbox) => {
		return r.send(storeAndApplyUpdate({
			lang: q.params.lang,
			action: 'set',
			tool,
			key: q.params.key,
			value: parseValue ? q.params.value.split('+') : q.params.value,
			user: 'admin'
		}));
	});
}

adminDichoSetter('/set-word-variation', 'variations', false);
adminDichoSetter('/set-word-synsets', 'synsets', true);
adminDichoSetter('/set-synset-definition', 'definitions', false);

function adminDichoDeleter(endpoint, tool) {
	adminGetToolbox(endpoint + '/:lang/:key', (q, r, toolbox) => {
		return r.send(storeAndApplyUpdate({
			lang: q.params.lang,
			action: 'del',
			tool,
			key: q.params.key,
			user: 'admin'
		}));
	});
}

adminDichoDeleter('/del-word-variation', 'variations');
adminDichoDeleter('/del-word-synsets', 'synsets');
adminDichoDeleter('/del-synset-definition', 'definitions');

adminGetToolbox('/add-stop-word/:lang/:value', (q, r, toolbox) => {
	return r.send(storeAndApplyUpdate({
		lang: q.params.lang,
		action: 'add',
		tool: 'stopList',
		value: q.params.value,
		user: 'admin'
	}));
});

adminGetToolbox('/rem-stop-word/:lang/:value', (q, r, toolbox) => {
	return r.send(storeAndApplyUpdate({
		lang: q.params.lang,
		action: 'rem',
		tool: 'stopList',
		value: q.params.value,
		user: 'admin'
	}));
});

// STATIC ENDPOINT

app.use('', express.static('static'));

// SESSION FILES CREATION

function updatesOpened(err, fd) {
	if (err) throw err;
	session.updates = fd;
	fs.open(session.storage, 'w', storageOpened);
}

function storageOpened(err, fd) {
	if (err) throw err;
	session.storage = fd;
	fs.open(session.issues, 'w', issuesOpened);
}

function issuesOpened(err, fd) {
	if (err) throw err;
	session.issues = fd;
	startServer();
}

// IGNITION

/* load stored updates: */ {
	let sessionDirs = fs.readdirSync(dirs.sessions);
	for (let u in sessionDirs) {
		let sessionUpdates = getContribution(sessionDirs[u], 'updates');
		for (let u in sessionUpdates) {
			let update = sessionUpdates[u];
			if (!update.canceled) processUpdate(update);
		}
	}
}

app.listen(port, () => console.log(`picto-api listening at http://localhost:${port}`));
