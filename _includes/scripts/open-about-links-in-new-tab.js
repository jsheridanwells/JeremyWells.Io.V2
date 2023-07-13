(function () {
    const about = /about/;
    const path = window.location.pathname;
    if (about.test(path)) {
        const links = document.querySelector('.about-page').querySelectorAll('a');
        links.forEach(l => {
            if (l.className !== 'no-target')
                l.setAttribute('target', '_blank')
        });
    }
})();