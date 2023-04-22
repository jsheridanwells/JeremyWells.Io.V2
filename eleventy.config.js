const { DateTime } = require('luxon');

module.exports = function(eleventyConfig) {
	
    eleventyConfig.setServerOptions({
		watch: ['./_site/assets/css/**/*.css']
	});

	eleventyConfig.addFilter('asPostDate', date => {
		return DateTime.fromJSDate(date).toLocaleString(DateTime.DATE_MED);
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
