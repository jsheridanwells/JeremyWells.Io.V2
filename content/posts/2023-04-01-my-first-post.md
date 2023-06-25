---
title: My First Post
published: false
subheading: 'It has been a long time, a truly long time'
tags: 
 - career
 - not 
 - really 
---
Oh yeah, I need content

## First, some Javascript
```js
const { DateTime } = require('luxon');
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const bundlerPlugin = require("@11ty/eleventy-plugin-bundle");

module.exports = function(eleventyConfig) {
	eleventyConfig.addPlugin(syntaxHighlight);
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
```

## Next, some Typescript
```ts
export class MyClass {
    myVar: string;
    myFunc<T>(myArg: MyClass): MyClass {
        return new MyClass();
    }
}
```

## And some C#
```csharp
class Example
{
    public Example()
    {
        
    }
}

class Program
{
    static void Main()
    {
    }
}
```

## And finally, good ol' SQL
```sql
USE MyDb
GO

SELECT TOP 1000
    ColumnOne
    , Col2
FROM MyTable
WHERE
    ColumnOne = 'well well well;
```

```
# And what if there's no lang?
$ sudo apt-get update
$ sudo apt-get install
```