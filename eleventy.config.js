const { DateTime } = require('luxon');

module.exports = function(eleventyConfig) {
	
	eleventyConfig.addFilter('asPostDate', date => {
		return DateTime.fromJSDate(date).toLocaleString(DateTime.DATE_MED);
	});

    return {
        dir: {
            includes: './_includes',
            layouts: './_layouts',
            data: './_data'
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
