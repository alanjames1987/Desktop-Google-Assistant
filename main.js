var electron = require('electron');
var path = require('path');
var url = require('url');

var app = electron.app;
var globalShortcut = electron.globalShortcut;
var ipcMain = electron.ipcMain;

var BrowserWindow = electron.BrowserWindow;
var Menu = electron.Menu;
var Tray = electron.Tray;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var win;
var tray;

var windowEventEmiter;

ipcMain.on('register', function(event) {
	windowEventEmiter = event.sender;
});

app.on('ready', function createWindow() {

	globalShortcut.register('Control+Space', function() {
		windowEventEmiter.send('shortcut');
	});

	var width = 350;
	var height = 400;

	win = new BrowserWindow({
		width: width,
		height: height,
		maxWidth: width,
		minWidth: height,
		maxHeight: width,
		minHeight: height,
		// frame: false,
	});

	win.loadURL(url.format({
		pathname: path.join(__dirname, 'app.html'),
		protocol: 'file:',
		slashes: true
	}));

	win.webContents.openDevTools();

	win.on('closed', function() {
		win = null;
	});

	var template = [{
		label: 'Edit',
		submenu: [{
			role: 'undo'
		}, {
			role: 'redo'
		}, {
			type: 'separator'
		}, {
			role: 'cut'
		}, {
			role: 'copy'
		}, {
			role: 'paste'
		}]
	}, {
		role: 'window',
		submenu: [{
			role: 'minimize'
		}, {
			role: 'close'
		}]
	}, ];

	if (process.platform === 'darwin') {
		template.unshift({
			label: app.getName(),
			submenu: [{
				role: 'about'
			}, {
				type: 'separator'
			}, {
				role: 'hide'
			}, {
				role: 'hideothers'
			}, {
				role: 'unhide'
			}, {
				type: 'separator'
			}, {
				role: 'quit'
			}]
		});

		// Window menu
		template[2].submenu = [{
			role: 'close'
		}, {
			role: 'minimize'
		}, {
			role: 'zoom'
		}, {
			type: 'separator'
		}, {
			role: 'front'
		}];
	}

	var menu = Menu.buildFromTemplate(template);

	Menu.setApplicationMenu(menu);

});

app.on('window-all-closed', function() {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', function() {
	if (win === null) {
		createWindow();
	}
});