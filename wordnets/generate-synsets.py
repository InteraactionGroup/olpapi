import json

# using files from http://compling.hss.ntu.edu.sg/omw/summx.html

def conv(lang):
	tab_file = open('wikt/wn-wikt-' + lang + '.tab')
	lines = tab_file.read().split('\n')
	tab_file.close()

	output = {}

	for line in lines:
		parts = line.split('\t')
		if len(parts) != 3: continue
		synset, word = parts[0].replace('-', ''), parts[2]
		if word in output: output[word].append(synset)
		else: output[word] = [synset]

	json_file = open('json/' + lang + '.json', 'w')
	json.dump(output, json_file)
	json_file.close()

tab_file = open('wikt.txt')
lines = tab_file.read().split('\n')
tab_file.close()

for line in lines: conv(line)
exit()