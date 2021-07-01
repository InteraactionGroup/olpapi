# Open Language Processing and Pictogram API
This repository contains the source code for a RESTful API offering language processing services related to pictogram annotation.
It is to be used in conjunction with pictogram databases such as ARASAAC or Mulberry.

# Usage
## Cloning
In a console, on linux:
```sh
git clone https://github.com/getalp/olpapi/
cd olpapi
```

## Dependencies
This API was built to run on [NodeJS](https://nodejs.org/). Install the dependencies with the `npm` tool:
```sh
npm install
```

## Running
To start the API's server script:
```sh
node index.js
```

# Using with ARASAAC / Mulberry
This repository includes a script which you can use to use this API with ARASAAC or Mulberry
## ARASAAC
ARASAAC has around 13000 pictograms in PNG format, weighting around 630MB.
```sh
git clone https://github.com/getalp/olpapi-arasaac/ pictograms/arasaac
```

## Mulberry
Mulberry has around 3500 pictograms in SVG format, weighting around 15MB.
```sh
git clone https://github.com/getalp/olpapi-mulberry/ pictograms/mulberry
```

# References
This work is derived from the results of other research:
* Word variations were extracted from [Dbnary](http://kaiko.getalp.org/about-dbnary/).
* Sense keys and their corresponding words were extracted from [The Extended Open Multilingual Wordnet](http://compling.hss.ntu.edu.sg/omw/summx.html).
* Semantically tagged glosses were obtained from [Princeton University's WordNet](https://wordnetcode.princeton.edu/glosstag.shtml)
* This API was developped for use with pictograms from [Mulberry Symbols](https://mulberrysymbols.org/) and [ARASAAC](https://arasaac.org/).
