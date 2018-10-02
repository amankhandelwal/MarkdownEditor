const { app, BrowserWindow, dialog, Menu } = require('electron');
const fs = require('fs');

const windows = new Set(); // Kinda like an array except duplicates are not allowed
const fileWatchers = new Map(); // While an object can have string keys only, a map can have any any object key

const createWindow = file => {
	let newWindow = new BrowserWindow({
		width: 800,
		height: 600,
		show: false
	});
	windows.add(newWindow);
	// require('devtron').install();
	newWindow.loadURL(`file://${__dirname}/index.html`);
	newWindow.setTitle('Markdown Editor');
	newWindow.edited = false;
	newWindow.once('ready-to-show', () => {
		if (file) openFile(newWindow, file);
		newWindow.show();
	});
	//PS: Triggered just before closing the window
	newWindow.on('close', event => {
		//Cannot use native isDocumentEdited and setDocumentEdited as it works on MAC but not on Windows
		console.log('Close event triggered', isDocumentEdited(newWindow));
		if (isDocumentEdited(newWindow)) {
			console.log('Unsaved Changes');
			//are there unsaved changes ?
			event.preventDefault();
			const result = dialog.showMessageBox(newWindow, {
				type: 'warning',
				title: 'Quit with unsaved changes',
				message: 'Your changes will be lost',
				buttons: ['Quit Anyway', 'Cancel'],
				defaultId: 0,
				cancelId: 1
			});

			if (result === 0) {
				newWindow.destroy(); // close the window totally skipping 'closed' event
			}
		}
	});
	// Ready for garbage collection once the app is closed. PS: App is closed
	newWindow.on('closed', () => {
		stopWatchingFile(newWindow);
		windows.delete(newWindow);
		newWindow = null;
	});
};

app.on('ready', () => {
	//Create a custom menu
	const template = [
		{
			label: 'Super Awesome Menu',
			submenu: [
				{
					label: 'Yolo',
					click(item, focusedWindow) {
						console.log('You only live once');
					} /*or you can add a role like role:'cut' */,
					accelerator: 'CommandOrControl+L'
				}
			]
		}
	];
	//MacOSX has the first menu Item default to App name. So we need to make a useless menu item
	if (process.platform === 'darwin' /*OSX's name*/) {
		template.unshift({ label: "You can't see me" });
	}
	//Build menu from template
	const applicationMenu = Menu.buildFromTemplate(template);
	/* //This will set this as the app menu and we do not want that happening
	Menu.setApplicationMenu(applicationMenu);
	*/

	//create a new window
	createWindow();
});

app.on('will-finish-launching', () => {
	app.on('open-file', (event, filePath) => {
		createWindow(filePath);
	});
});

const showFilePicker = targetWindow => {
	const files = dialog.showOpenDialog(/*optional first arg for OSX animation*/ targetWindow, {
		properties: ['openFile'],
		filters: [
			{
				name: 'All Files',
				extensions: ['txt', 'md', 'text', 'markdown']
			},
			{ name: 'Text Files', extensions: ['txt', 'text'] },
			{ name: 'Markdown Files', extensions: ['md', 'markdown'] }
		]
	});
	console.log(files);
	if (!files) return;
	return files[0];
};

const openFile = (targetWindow, filepath = '') => {
	console.log('Open file called');
	const file = filepath || showFilePicker(targetWindow);
	const content = fs.readFileSync(file).toString();
	//Add to recent documents
	app.addRecentDocument(file);
	startWatchingFile(targetWindow, file);
	// webcontents - Properties of main window.
	targetWindow.webContents.send('file-opened', file, content);
	targetWindow.setRepresentedFilename(file); // Mac OS thing for file history or something
};

const saveMarkdown = (win, file, content) => {
	if (!file) {
		// when you're creating a new file
		file = dialog.showSaveDialog(win, {
			title: 'Save Markdown',
			defaultPath: app.getPath('documents'),
			filters: [{ name: 'Markdown Files', extensions: ['md', 'markdown'] }]
		});
	}

	if (!file) return; // User clicked Cancel and didnt name the file

	fs.writeFileSync(file, content);
	win.webContents.send('file-opened', file, content);
};

const startWatchingFile = (targetWindow, file) => {
	stopWatchingFile(targetWindow);
	const watcher = fs.watch(file, event => {
		if (event === 'change') {
			const content = fs.readFileSync(file).toString();
			targetWindow.webContents.send('file-changed', file, content);
		}
	});
	fileWatchers.set(targetWindow, watcher);
};

const stopWatchingFile = targetWindow => {
	if (fileWatchers.has(targetWindow)) {
		fileWatchers.get(targetWindow).close();
		fileWatchers.delete(targetWindow);
	}
};

const setDocumentEdited = (win, edited) => {
	win.edited = edited;
};
const isDocumentEdited = win => {
	return win.edited;
};

exports.openFile = openFile;
exports.createWindow = createWindow;
exports.setDocumentEdited = setDocumentEdited;
exports.isDocumentEdited = isDocumentEdited;
exports.saveMarkdown = saveMarkdown;
