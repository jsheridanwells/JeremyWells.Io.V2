/**
 TODO:
 - [] Icon at top of code block (like ms docs)
    - [] ??? Or at least just fix the position of the icon
 - [] See about moving this to a new feature in eleventy-gist
 */

(function () {
    const allPres = document.querySelectorAll('pre:not(.eleventy-gist-raw-content)');
    if (allPres) {
        allPres.forEach(p => addCopyIconToElement(p));
    }
    const copyIcons = document.querySelectorAll('.code-copy-icon');
    if (copyIcons) {
        copyIcons.forEach(i => addCopyEventToIcon(i));
    }
})();

/**
 * Adds the following to element (el)
 * <div class=" .. iconContainerClass ..">
 *     <i class="far fa-copy ..iconClass.. " aria-hidden="true"></i>
 * </div>
 */
function addCopyIconToElement(el, iconClass = 'code-copy-icon', iconContainerClass = 'code-copy-container') {
    const hasCopyText = el.nextElementSibling.classList.contains('eleventy-gist-raw-content');
    if (!hasCopyText) {
        return el;
    }
    const copyDiv = createFullIconElements(iconClass, iconContainerClass)
    const code = el.firstChild;
    el.insertBefore(copyDiv, code);
    return el;
}

/**
 * Adds the copy event to the specified icon.
 * The following structure is how code blocks generated via the eleventy-gist plugin are rendered....
 * <pre>
 *     <div>
 *         <i> <--- click event here....
 *     </div>
 * </pre>
 * <pre>
 *     <code></code> <---- ...will add the text from here to the clipboard.
 * </pre>
 * The click event on <i> will copy the innerText in <code>.
 */
function addCopyEventToIcon(icon, codeSelectorName = 'code') {
    icon.addEventListener('click', e => {
        e.preventDefault();
        const parent = icon.parentNode.parentNode;
        const next = parent.nextElementSibling;
        const hidden = next.querySelector(codeSelectorName);
        console.log('parent', parent, 'next', next, 'hidden', hidden);
        if (!hidden) {
            return;
        }
        const text = getTextToCopy(hidden);
        navigator.clipboard.write(text);
    });
}

/**
 * Returns HTML element in the following form:
 * <div class="..iconContainerClass..">
 *     <i class="far fa-copy ..iconClass.." aria-hidden="true"></i>
 * </div>
 */
function createFullIconElements(iconClass, iconContainerClass) {
    const icon = document.createElement('i');
    icon.classList.add('far', 'fa-copy', iconClass);
    const copyDiv = document.createElement('div');
    copyDiv.classList.add(iconContainerClass);
    copyDiv.appendChild(icon);
    return copyDiv;
}

/**
 * Return text from HTML element as plaintext
 */
function getTextToCopy(el) {
    const text = el.innerHTML;
    const type = 'text/plain';
    const blob = new Blob([text], {type});
    const data = [new ClipboardItem({[type]: blob})];
    return data;
}
