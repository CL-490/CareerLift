const { app, BrowserWindow, ipcMain, protocol } = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs')

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit()
}

// Environment configuration
const isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged
const FRONTEND_URL = process.env.ELECTRON_START_URL || 'http://localhost:3000'

let mainWindow

// Register file protocol before app is ready
app.whenReady().then(() => {
  // Register protocol to serve local files
  protocol.registerFileProtocol('file', (request, callback) => {
    const pathname = decodeURI(request.url.replace('file:///', ''))
    callback(pathname)
  })
})

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    title: 'CareerLift',
    titleBarStyle: 'default',
    show: false, // Don't show until ready
    icon: path.join(__dirname, 'icon.png'), // Optional: add app icon
  })

  // Load the app
  if (isDevelopment) {
    // In development, load from the Next.js dev server
    console.log('Loading development server:', FRONTEND_URL)
    mainWindow.loadURL(FRONTEND_URL)
    mainWindow.webContents.openDevTools()
  } else {
    // In production, load from built Next.js static export
    const indexPath = path.join(__dirname, '../frontend/out/index.html')

    if (fs.existsSync(indexPath)) {
      console.log('Loading production build from:', indexPath)
      mainWindow.loadFile(indexPath)
    } else {
      console.error('Production build not found. Please run: cd frontend && npm run build')
      // Fallback to development server
      mainWindow.loadURL('http://localhost:3000')
    }
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Handle navigation
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)

    // Only allow navigation to same origin in production
    if (!isDevelopment && parsedUrl.origin !== 'file://') {
      event.preventDefault()
    }
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// App event handlers
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers for communication between main and renderer processes
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-app-path', () => {
  return app.getPath('userData')
})

// Handle any unhandled errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error)
})
