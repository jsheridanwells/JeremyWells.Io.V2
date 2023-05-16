const request = require('./requestWrapper');

/**
 * Ensure gist has a Github auth token and user agent before calling the API
 * @param {{ authToken: string, userAgent: string }} opts
 * @returns {void}
 */
function verifyOptions(opts) {
    let message = '';

    if (!opts) {
        message += 'gist is missing a valid options object \n';
    }
    else {
        if (!opts.hasOwnProperty('authToken')) {
            message += 'gist needs a valid Github auth token \n';
        }

        if (!opts.hasOwnProperty('userAgent')) {
            message += 'gist needs a valid User Agent name \n';
        }
    }

    if (message && message.length > 0) {
        throw new Error(message);
    }
}

/**
 * Dictionary to translate file extension to Prism.js language syntax. 
 * Unfortunately, this isn't an exhaustive list. 
 * @param {string} ext
 * @returns {string}
 */
function lookupLanguage(ext) {
    const lookup = {
        'cs': 'csharp',
        'sql': 'sql',
        'js': 'javascript',
        'ts': 'typescript',
        'sh': 'bash',
        'css': 'css',
        'http': 'http',
        'json': 'json',
        'scss': 'scss',
        'nginx': 'nginx',
        'py': 'python',
        'docker': 'docker',
        'rb': 'ruby',
        'yaml': 'yaml'
    };
    return lookup[ext] ? lookup[ext] : ext;
}

/**
 * Call the Github API
 * @param {string} gistId
 * @param {{ authToken: string, userAgent: string }} opts
 * @returns {any} github api data
 */
async function requestGist(gistId, opts) {
    try {
        const options = {
            hostname: 'api.github.com',
            path: `/gists/${ gistId }`,
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Authorization': `Bearer ${ opts.authToken }`,
                'User-Agent': opts.userAgent
            }
        }
        return await request(options);
    }
    catch (e) {
        throw new Error('github api error: ' + e.message);
    }
}

/**
 * Using Github response, finds code snippet by file name and extracts it 
 * @param {any} githubGistResponse
 * @param {string} fileName
 * @returns {string}
 */
async function extractContent(githubGistResponse, fileName) {
    return new Promise((resolve, reject) => {
        if (!githubGistResponse.hasOwnProperty('files')) {
            return reject(new Error('No files contained in githubGistResponse'));
        }

        if (!githubGistResponse.files.hasOwnProperty(fileName)) {
            return reject(new Error(`${fileName} not found in this gist`));
        }

        let content = '';
        if (githubGistResponse.files[fileName].content) {
            content = githubGistResponse.files[fileName].content;
        }
        resolve(content);
    });
}

/**
 * Create a markdown code snippet to output to template 
 * @param {string} fileName
 * @param {string} content
 * @returns {string}
 */
async function buildMdString(fileName, content) {
    return new Promise((resolve, reject) => {
        try {
            let ext = '';
            if (fileName && fileName.hasOwnProperty('length') && fileName.length > 0) {
                ext = fileName.split('.').pop();
                ext = lookupLanguage(ext);
            }

            resolve('```' + ext + '\n' + content + '\n```');
        }
        catch (e) {
            return reject(e);
        }
    });
}

/**
 * Run it all
 * @param {string} gistId
 * @param {string} fileName
 * @param {any} opts
 * @returns {string}
 */
async function run(gistId, fileName, opts) {
    return await requestGist(gistId, opts)
        .then(apiResult => extractContent(apiResult, fileName))
        .then(contentResult => buildMdString(fileName, contentResult));
}

/**
 * Add a code snippet from Github Gists to a markdown template 
 * @param {string} gistId
 * @param {string} fileName
 * @param {{ authToken: string, userAgent: string }} opts
 * @returns {string}
 */
async function gist(gistId, fileName, opts) {
    try {
        verifyOptions(opts);
        const result = await run(gistId, fileName, opts);
        return result;
    }
    catch (e) {
        console.log('gist error: ', e.message);
        return '';
    }
}

module.exports = { gist };
