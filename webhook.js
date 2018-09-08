const crypto = require('crypto');
const https = require('https');
const path = require('path');
const bufferEq = require('buffer-equal-constant-time');

const postspath = 'posts';
const buildUrl = 'https://us-central1-static-site-gen-215704.cloudfunctions.net/function-5';

exports.helloWebhook = (req, res) => {
    try {
        // Verify the webhook signature.
        if (!verifySecret(req)) {
            throw new Error('Webhook secret verification failed');
        }
        // Don't do anything if there are no commits.
        const payload = req.body;
        if (payload.commits.length == 0) {
          throw new Error('No commits in push');
        }
        // Check if any files under [postspath] were changed.
        const { added, modified, removed } = payload.commits[0];
        const changedFiles = [...added, ...modified, ...removed];
        if (changedFiles.some((filepath) => path.dirname(filepath) === postspath)) {
            // trigger rebuild
            console.log('Triggering rebuild...');
            console.log('Changed files:', changedFiles);
            startBuild(buildUrl).then((info) => {
                console.log('Successful build!');
                console.log(info);
                res.status(200).send();
            }).catch((error) => {
                console.error(error);
                res.status(500).send(error);
            });
        } else {
            console.log('Build not triggered');
            res.status(200).send();
        }
    } catch(err) {
        console.error(err);
        res.status(500).send(err);
    }
};

function verifySecret(req) {
  const signature = req.get('X-Hub-Signature');
  const hash = 'sha1=' + crypto.createHmac('sha1', process.env.WEBHOOK_SECRET)
  					 		   .update(JSON.stringify(req.body)).digest('hex');
  return bufferEq(Buffer.from(signature), Buffer.from(hash));
}

function startBuild(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                if (resp.statusCode > 399) reject(data);
                resolve(data);
            });
        }).on("error", (err) => {
            reject(err);
        });
    });
}