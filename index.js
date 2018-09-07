const https = require('https');
const path = require('path');
const URL = require('url').URL;

const owner = 'brettapeters';
const repo = 'GCPFunctionBlog';
const ref = 'gh-pages';
const apiBase = 'api.github.com';
const endpoint = `/repos/${owner}/${repo}/contents/posts`;
const params = `?ref=${ref}`;

exports.getHtmlFromGithub = (req, res) => {
  getFilenames()
    .then((fileNames) => fileNames.map(parseFilename))
    .then((parsedNames) => parsedNames.sort(reverseChronological))
    .then((sortedPosts) => sortedPosts.map((post) => post.filename))
    .then((filenames) => Promise.all(filenames.map(getHtml)))
    .then((contents) => {
    	res.setHeader('Content-Type', 'text/html');
      	res.status(200).send(contents.join('\n\n'));
    })
    .catch((err) => {
        res.status(500).send(err.message);
    });
};

function getFilenames() {
    return new Promise((resolve, reject) => {
        https.get({
            hostname: apiBase,
            path: endpoint + params,
            headers: {
                'User-Agent': 'node6',
                accept: 'application/vnd.github.v3+json'
            }
        }, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                try {
                    const contents = JSON.parse(data);
                    const fileNames = contents.map((content) => content.name);
                    resolve(fileNames);
                } catch(err) {
                    reject(err);
                }
            });
        }).on("error", (err) => {
            reject(err);
        });
    })
}

function parseFilename(filename) {
    const basename = path.basename(filename, '.md');
    const [year, month, day, ...title ] = basename.split('-');
    const date = new Date(year, month - 1, day);
    if (!isValidDate(date)) {
        throw new Error(`Invalid Date in filename: ${filename}`);
    }
    return {
        date,
        filename,
        title: title.join(' '),
    };
}

function isValidDate(date) {
    return date instanceof Date && !isNaN(date);
}

function reverseChronological(a, b) {
    return b.date - a.date;
}

function getHtml(filename) {
    return new Promise((resolve, reject) => {
        https.get({
            hostname: apiBase,
            path: path.join(endpoint, filename + params),
            headers: {
                'User-Agent': 'node6',
                accept: 'application/vnd.github.VERSION.html'
            }
        }, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                resolve(data);
            });
        }).on("error", (err) => {
            reject(err);
        });
    });
}
