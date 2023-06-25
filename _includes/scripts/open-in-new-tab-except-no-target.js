(function(){
   let postBody = document.getElementsByClassName('post');
    if (postBody && postBody.length > 0) {
        const links = postBody[0].querySelectorAll('a');
        links.forEach(l => {
            if (l.className !== 'no-target')
                l.setAttribute('target', '_blank')
        });
    }
})();