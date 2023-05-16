const https = require('https');


/**
 * Wraps Node.js https request for easier testing
 * @param {https.RequestOptions} options
 * @returns {any}
 */
module.exports = async function request(options) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error('API error: statusCode = ' + res.statusCode));
            }
            let body = [];
            res.on('data', d => body.push(d));
            res.on('end', () => {
                body = JSON.parse(Buffer.concat(body).toString());
                resolve(body);
            })
        });
        req.on('error', e => reject(e.message));
        req.end();
    });
}