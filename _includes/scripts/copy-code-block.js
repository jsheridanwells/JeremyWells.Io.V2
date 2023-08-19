(function () {
    const allPres = document.querySelectorAll('pre:not(.eleventy-gist-raw-content)');
    allPres.forEach(p => addCopyIconToCodeBlock(p));

    const copyIcons = document.querySelectorAll('.code-copy-icon');
    copyIcons.forEach(i => addCopyEventToIcon(i));
})();

function addCopyIconToCodeBlock(codeBlock, iconClass = 'code-copy-icon', iconContainerClass = 'code-copy-container') {
    const icon = document.createElement('i');
    icon.classList.add('far', 'fa-copy', iconClass, 'this-worked');
    const copyDiv = document.createElement('div');
    copyDiv.classList.add(iconContainerClass);
    copyDiv.appendChild(icon);
    const code = codeBlock.firstChild;
    codeBlock.insertBefore(copyDiv, code);
    return codeBlock;
}

function addCopyEventToIcon(icon, codeSelectorName = 'code') {
    icon.addEventListener('click', e => {
        e.preventDefault();
        const parent = icon.parentNode.parentNode;
        const next = parent.nextElementSibling;
        const hidden = next.querySelector(codeSelectorName);
        const text = hidden.innerText;
        navigator.clipboard.writeText(text);
    });
}