export default function (app, window) {
    const menu = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Aufgaben konfigurieren',
                    click: () => window.webContents.send('configure')
                },
                {
                    label: 'Konfiguration speichern',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => window.webContents.send('save')
                },
                {
                    label: 'Konfiguration laden',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => window.webContents.send('load')
                },
                {
                    label: 'Abgabe-Verzeichnis wählen',
                    accelerator: 'CmdOrCtrl+D',
                    click: () => window.webContents.send('open-data')
                },
                {
                    label: 'Kompile-Abhängigkeiten wählen',
                    click: () => window.webContents.send('open-compile-deps')
                },
                {
                    label: 'Ausführen',
                    accelerator: 'F5',
                    click: () => window.webContents.send('run')
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'pasteandmatchstyle' },
                { role: 'delete' },
                { role: 'selectall' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forcereload' },
                { role: 'toggledevtools' },
                { type: 'separator' },
                { role: 'resetzoom' },
                { role: 'zoomin' },
                { role: 'zoomout' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            role: 'window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' }
            ]
        },
    ];

    if (process.platform === 'darwin') {
        const name = app.getName();
        menu.unshift({
            label: name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services', submenu: [] },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });
        const windowMenu = menu.find(m => m.role === 'window')
        if (windowMenu) {
            windowMenu.submenu = [
                { role: 'close' },
                { role: 'minimize' },
                { role: 'zoom' },
                { type: 'separator' },
                { role: 'front' }
            ];
        }
    }
    return menu;
}
