require('dotenv').config();
const { DateTime } = require('luxon');
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const bundlerPlugin = require("@11ty/eleventy-plugin-bundle");
const gist = require('eleventy-gist');

module.exports = function (eleventyConfig) {
	eleventyConfig.addPlugin(syntaxHighlight);

	eleventyConfig.addPlugin(bundlerPlugin);

	eleventyConfig.setServerOptions({
		watch: ['./_site/assets/css/**/*.css']
	});

	/**
	 * Recreating Jekyll's post_url as best I can. 
	 * This was really helpful: 
	 * https://github.com/11ty/eleventy/issues/813#issuecomment-1037874929
	 */
	eleventyConfig.addShortcode('post_url', function(path) {
		// find the posts collection in this.ctx for nunjucks, this.context.environments for liquid
		const collections = this.ctx?.collections || this.context?.environments.collections | {};
		const posts = collections?.posts || [];
		const post = posts.find(p => p.url === `/posts/${ path }/`);
		if (post) {
			return post.url;
		}
		throw `post_url :: The URL for ${ path } was not found`;
	});

	eleventyConfig.addFilter('asPostDate', date => {
		return DateTime.fromJSDate(date).toLocaleString(DateTime.DATE_MED);
	});

	eleventyConfig.addPlugin(gist, {
		authToken: process.env.github_access_token,
		userAgent: process.env.github_user_agent
	});

	eleventyConfig.addPassthroughCopy('./assets/**/*');

	return {
		dir: {
			input: './content',
			includes: '../_includes',
			layouts: '../_layouts',
			data: '../_data'
		},
		templateFormats: [
			"md",
			"njk",
			"html",
			"liquid",
		],
		markdownTemplateEngine: "njk",
		htmlTemplateEngine: "njk"
	}
}
