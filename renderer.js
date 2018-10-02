const marked = require('marked');
const { remote, ipcRenderer, shell } = require('electron');
const currentWindow = remote.getCurrentWindow();
const mainProcess = remote.require('./main.js');

const markdownView = document.querySelector('#markdown');
const htmlView = document.querySelector('#html');
const newFileButton = document.querySelector('#new-file');
const openFileButton = document.querySelector('#open-file');
const saveMarkdownButton = document.querySelector('#save-markdown');
const revertButton = document.querySelector('#revert');
const saveHtmlButton = document.querySelector('#save-html');
const showFileButton = document.querySelector('#show-file');
const openInDefaultButton = document.querySelector('#open-in-default');

let filePath = null;
let originalContent = '';

const renderMarkdownToHtml = markdown => {
	markdownView.value = markdown.toString();
	console.log(markdownView);
	htmlView.innerHTML = marked(markdown, { sanitize: true });
};

const updateEditedState = edit => {
	mainProcess.setDocumentEdited(currentWindow, edit);
	console.log(edit, mainProcess.isDocumentEdited(currentWindow));

	// enable buttons for edited state
	saveMarkdownButton.disabled = !edit;
	revertButton.disabled = !edit;

	let title = 'Markdown Editor';
	if (filePath) title += ' ' + filePath;
	if (edit) title += ' (Edited)';
	currentWindow.setTitle(title);
};

function equality(str1, str2) {
	return str1.replace(/[^a-zA-Z]/g, '') === str2.replace(/[^a-zA-Z]/g, '');
}

markdownView.addEventListener('keyup', event => {
	const currentContent = event.target.value;
	renderMarkdownToHtml(currentContent);
	if (!equality(currentContent.trim(), originalContent.trim())) {
		// console.log('Edited');
		updateEditedState(true); //update title bar and change state
	} else {
		// console.log('UnEdited');
		updateEditedState(false); //update title bar and change state
	}
});

openFileButton.addEventListener('click', () => {
	console.log('Open file event triggered');
	mainProcess.openFile(currentWindow, '');
});

newFileButton.addEventListener('click', () => {
	mainProcess.createWindow();
});

saveMarkdownButton.addEventListener('click', () => {
	mainProcess.saveMarkdown(currentWindow, filePath, markdownView.value);
});

showFileButton.addEventListener('click', () => {
	shell.showItemInFolder(filePath);
});

openInDefaultButton.addEventListener('click', () => {
	shell.openItem(filePath);
});

//inter-process communincation for renderer
ipcRenderer.on('file-opened', (event, file, content) => {
	filePath = file;
	originalContent = content.toString();
	renderMarkdownToHtml(originalContent);
	updateEditedState(false);
});

ipcRenderer.on('file-changed', (event, file, content) => {
	filePath = file;
	originalContent = content.toString();
	renderMarkdownToHtml(originalContent);
	updateEditedState(false);
});
