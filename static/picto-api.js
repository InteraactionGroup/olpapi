/*
PUBLIC ENDPOINTS
	tokenize(sentence, language);
	pictograms(synsets);

direct data search
	findWordVariation(word, language);                   (nouveau)
	findWordMeanings(word, language);                    (nouveau)
	findMeaningDefinition(word, language);               (nouveau)

direct data access
	wordsVariations(start, length, language);            (nouveau)
	wordsMeanings(start, length, language);              (nouveau)
	meaningsDefinitions(start, length, language);        (nouveau)

AUTHENTICATED ENDPOINTS
	feed(mobile, language, sentence, alt, pictograms);
	report(issue, language, sentence, comment);

ADMIN ENDPOINTS
	summary();

direct data management - setting
	setWordVariation(variant, canonical, language);      (nouveau)
	setWordMeanings(word, synsets, language);             (nouveau)
	setSynsetDefinition(synset, definition, language);   (nouveau)

direct data management - deleting
	delWordVariation(variant, language);      (nouveau)
	delWordMeanings(word, language);             (nouveau)
	delSynsetDefinition(synset, language);   (nouveau)

*/

class PictoApi {
	constructor(home = '/') {
		this.home = home;
	}
	_phoneHome(path, callback, error) {
		if (error === undefined) error = callback;
		let xhr = new XMLHttpRequest();
		xhr.responseType = 'json';
		xhr.addEventListener('load', (e) => {
			let xhr = e.target;
			if (xhr.status == 200) callback(xhr.response);
			else error(undefined, xhr.response);
		});
		xhr.open('GET', this.home + path.join('/'));
		xhr.send();
	}
	_encode(text) {
		return encodeURIComponent(text);
	}
	// PUBLIC ENDPOINTS
	tokenize(sentence, language, callback, error) {
		let path = ['t2s', language, this._encode(sentence)];
		this._phoneHome(path, callback, error);
	}
	pictograms(synsets, callback, error) {
		let path = ['s2p', synsets.map(encodeURIComponent).join('+')];
		this._phoneHome(path, callback, error);
	}
	// DIRECT DATA SEARCH
	findWordVariation(word, language, callback, error) {
		let path = ['find-word-variation', language, this._encode(word)];
		this._phoneHome(path, callback, error);
	}
	findWordMeanings(word, language, callback, error) {
		let path = ['find-word-meanings', language, this._encode(word)];
		this._phoneHome(path, callback, error);
	}
	findMeaningDefinition(word, language, callback, error) {
		let path = ['find-meaning-definition', language, this._encode(word)];
		this._phoneHome(path, callback, error);
	}
	// DIRECT DATA ACCESS
	wordsVariations(start, length, language, callback, error) {
		let path = ['words-variations', language, start, length];
		this._phoneHome(path, callback, error);
	}
	wordsMeanings(start, length, language, callback, error) {
		let path = ['words-meanings', language, start, length];
		this._phoneHome(path, callback, error);
	}
	meaningsDefinitions(start, length, language, callback, error) {
		let path = ['meanings-definitions', language, start, length];
		this._phoneHome(path, callback, error);
	}
	stopList(language, callback, error) {
		let path = ['stop-list', language];
		this._phoneHome(path, callback, error);
	}
	// AUTHENTICATED ENDPOINTS
	feed(mobile, language, sentence, alt, pictograms, callback, error) {
		let data = { mobile, language, sentence, alt, pictograms };
		let path = ['feed', 'anonymous', this._encode(JSON.stringify(data))];
		this._phoneHome(path, callback, error);
	}
	report(issue, language, sentence, comment, callback, error) {
		let data = { issue, language, sentence, comment };
		let path = ['issue', 'anonymous', this._encode(JSON.stringify(data))];
		this._phoneHome(path, callback, error);
	}
	// ADMIN ENDPOINTS
	summary(callback, error) {
		let path = ['summary'];
		this._phoneHome(path, callback, error);
	}
	// set
	setWordVariation(variant, canonical, language, callback, error) {
		let [key, value] = [this._encode(variant), this._encode(canonical)];
		let path = ['set-word-variation', language, key, value];
		this._phoneHome(path, callback, error);
	}
	setWordMeanings(word, synsets, language, callback, error) {
		let [key, value] = [this._encode(word), this._encode(synsets.join('+'))];
		let path = ['set-word-synsets', language, key, value];
		this._phoneHome(path, callback, error);
	}
	setMeaningDefinition(synset, definition, language, callback, error) {
		let [key, value] = [this._encode(synset), this._encode(definition)];
		let path = ['set-synset-definition', language, key, value];
		this._phoneHome(path, callback, error);
	}
	addStopWord(word, language, callback, error) {
		let path = ['add-stop-word', language, this._encode(word)];
		this._phoneHome(path, callback, error);
	}
	// del
	delWordVariation(variant, language, callback, error) {
		let path = ['del-word-variation', language, this._encode(variant)];
		this._phoneHome(path, callback, error);
	}
	delWordMeanings(word, language, callback, error) {
		let path = ['del-word-synsets', language, this._encode(word)];
		this._phoneHome(path, callback, error);
	}
	delMeaningDefinition(synset, language, callback, error) {
		let path = ['del-synset-definition', language, this._encode(synset)];
		this._phoneHome(path, callback, error);
	}
	remStopWord(word, language, callback, error) {
		let path = ['rem-stop-word', language, this._encode(word)];
		this._phoneHome(path, callback, error);
	}
	// SESSIONS
	currentSessionId(callback, error) {
		let path = ['current-session-id'];
		this._phoneHome(path, callback, error);
	}
	// contributions
	uploads(sessionId, callback, error) {
		let path = ['storage', sessionId];
		this._phoneHome(path, callback, error);
	}
	issues(sessionId, callback, error) {
		let path = ['issues', sessionId];
		this._phoneHome(path, callback, error);
	}
	updates(sessionId, callback, error) {
		let path = ['updates', sessionId];
		this._phoneHome(path, callback, error);
	}
	revokeUpload(sessionId, timestamp, user, callback, error) {
		let path = ['revoke-storage', sessionId, timestamp, user];
		this._phoneHome(path, callback, error);
	}
	revokeUpdate(sessionId, timestamp, user, callback, error) {
		let path = ['revoke-update', sessionId, timestamp, user];
		this._phoneHome(path, callback, error);
	}
	revokeIssue(sessionId, timestamp, user, callback, error) {
		let path = ['revoke-issue', sessionId, timestamp, user];
		this._phoneHome(path, callback, error);
	}
}
