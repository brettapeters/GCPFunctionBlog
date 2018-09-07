const https = require('https');
const querystring = require('querystring');

const owner = 'brettapeters';
const repo = 'GCPFunctionBlog';
const branch = 'gh-pages';
const apiBase = 'api.github.com';
const filename = 'index.html';
const endpoint = `/repos/${owner}/${repo}/contents/${filename}`;
const contentURL = 'https://us-central1-static-site-gen-215704.cloudfunctions.net/function-4';

exports.deployToGHPages = (req, res) => {
    Promise.all([getPage(contentURL), getSHA()])
        .then((res) => commitChanges(...res))
        .then((info) => {
            res.set('Content-Type', 'application/json; charset=utf-8');
            res.status(200).send(info);
        })
        .catch((err) => {
            res.status(500).send(err);
        });
};

function getSHA() {
    const params = querystring.stringify({ ref: branch });
    return new Promise((resolve, reject) => {
        https.get({
            hostname: apiBase,
            path: `${endpoint}?${params}`,
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
                    const fileInfo = JSON.parse(data);
                    resolve(fileInfo.sha);
                } catch(err) {
                    reject(err);
                }
            });
        }).on("error", (err) => {
            reject(err);
        });
    });
}

function getPage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (resp) => {
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

function commitChanges(content, sha) {
    const data = JSON.stringify({
        branch,
        content: Buffer.from(content).toString('base64'),
        message: `Automatic build - ${(new Date()).toLocaleString()}`,
        sha,
    });
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: apiBase,
            path: endpoint,
            method: 'PUT',
            headers: {
                'Authorization': `token ${process.env.GITHUB_API_TOKEN}`,
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': Buffer.byteLength(data),
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
                    const info = JSON.parse(data);
                    resolve(info);
                } catch(err) {
                    reject(err);
                }
            });
        });
        req.on("error", (err) => {
            reject(err);
        });
        req.write(data);
        req.end();
    });
}
