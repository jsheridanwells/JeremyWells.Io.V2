const { gist } = require('./gist');

module.exports = async function(config, opts = {}) {
	config.addShortcode('gist', async (id, file) => await gist(id, file, opts));
}
