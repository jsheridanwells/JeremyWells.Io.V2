require('dotenv').config();
const { DateTime } = require('luxon');
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const bundlerPlugin = require("@11ty/eleventy-plugin-bundle");
const gist = require('eleventy-gist');

module.exports = function(eleventyConfig) {

	eleventyConfig.addPlugin(syntaxHighlight);

	eleventyConfig.addPlugin(bundlerPlugin);
	
    eleventyConfig.setServerOptions({
		watch: ['./_site/assets/css/**/*.css']
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
