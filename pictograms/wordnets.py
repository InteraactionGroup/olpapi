import json

_base = '../wordnets/'

class WordNet:
	def __init__(self, lang):
		file = open(_base + lang + '/synsets.json')
		self.synsets = json.load(file)
		file.close()
		file = open(_base + lang + '/variations.json')
		self.variations = json.load(file)
		file.close()

	# reference algorithm: index.js:sentenceToSynsets
	def get_synsets(self, word):
		token = word.lower()
		if token in self.synsets:
			return self.synsets[token]
		elif token in self.variations:
			token = self.variations[token]
			if token in self.synsets:
				return self.synsets[token]
		return []
