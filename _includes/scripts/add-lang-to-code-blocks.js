(function(){
    document.querySelectorAll('pre').forEach(el => {
        if (!el.hasAttribute('class')) {
            el.setAttribute('class', 'language-bash');
        }
    });
})();