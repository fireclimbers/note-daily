/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import fs from 'fs';

import { dateToString, stringToDate } from '../renderer/funcs.tsx';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;


let dir = app.getPath('userData')+'/notedata';
//console.log(dir);
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

ipcMain.on('ipc-write', async (event, arg) => {
  //console.log(arg);
  try { 
    fs.writeFileSync(app.getPath('userData')+'/notedata/'+arg[0]+'.txt', arg[1] || '', 'utf-8'); 
    fs.writeFileSync(app.getPath('userData')+'/notedata/'+arg[0]+'.title', arg[2] || '', 'utf-8');
    event.reply('ipc-update-title', [arg[0],arg[2] || '']);
  } catch(e) { 
    //console.log('Failed to save the file !', e); 
  }
});

ipcMain.on('ipc-load', async (event, arg) => {
  // read from [arg].txt
  event.reply('ipc-setday', arg);

  let data = '';
  let title = '';
  try {
    title = fs.readFileSync(app.getPath('userData')+'/notedata/'+arg+'.title',{encoding:'utf8', flag:'r'});
  } catch(err) {}

  try {
    data = fs.readFileSync(app.getPath('userData')+'/notedata/'+arg+'.txt',{encoding:'utf8', flag:'r'});
  } catch(err) {}

  event.reply('ipc-load',[data,title]);
  
  /*
  fs.readFile(app.getPath('userData')+'/notedata/'+arg+'.txt', 'utf-8', (err, data) => {
    if(err){
      //alert("An error ocurred reading the file :" + err.message);
      //return;
      event.reply('ipc-load', '');
    } else {
      event.reply('ipc-load', data);
    }
  });
  */
  
});


ipcMain.on('ipc-load-dates', async (event, arg) => {

  const daysStr = ['s','m','t','w','t','f','s'];
  const monthsStr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  try {
    //console.log('loadddddddddddd');
    let dates = [];
    let d = stringToDate(arg);
    //console.log(d);
    //d = new Date(d.setDate(d.getDate()-14));
    d.setDate(d.getDate()-14);
    //console.log(d);
    for (let i=0;i<5;i++) {
      let week = {title:'',days:[]};
      let monday = d.getDate() - d.getDay();
      d.setDate(monday);

      for (let j=0;j<5;j++) {
        //console.log(monday, j);
        //console.log('==========')
        //console.log(d);
        d.setDate(d.getDate()+1);
        //console.log(monday+j);
        //console.log(d);
        //let day = new Date(d.setDate(monday+j));
        //console.log(day);
        //console.log('======');
        let title = '';
        try {
          title = fs.readFileSync(app.getPath('userData')+'/notedata/'+dateToString(d)+'.title',{encoding:'utf8', flag:'r'})
        } catch(errr) {}
        week.days.push({t: title, d: dateToString(d),s: (d.getMonth()+1).toString()+'/'+d.getDate().toString(), i: daysStr[d.getDay()]});
        if (j === 0) week.title = monthsStr[d.getMonth()] +' '+ d.getDate().toString();
      }
      dates.push(week);
      d = new Date(d.setDate(d.getDate()+7));
    }
    //console.log(dates);

    event.reply('ipc-load-dates',dates);
  } catch(err) {
    console.log(err);
    event.reply('ipc-load',[]);
  }
  
  /*
  fs.readFile(app.getPath('userData')+'/notedata/'+arg+'.txt', 'utf-8', (err, data) => {
    if(err){
      //alert("An error ocurred reading the file :" + err.message);
      //return;
      event.reply('ipc-load', '');
    } else {
      event.reply('ipc-load', data);
    }
  });
  */
  
});


if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });
  mainWindow.maximize();

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // TODO use menu.ts as reference
  //const menuBuilder = new MenuBuilder(mainWindow);
  //menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
