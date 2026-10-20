import joplin from 'api';
import { ContentScriptType, ToolbarButtonLocation, MenuItemLocation } from 'api/types';
import { parseTable, serializeTable } from './tableUtils';

const contentScriptId = 'tableEditorContentScript';

function esc(s: string) {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

joplin.plugins.register({
	onStart: async function () {
		await joplin.contentScripts.register(
			ContentScriptType.CodeMirrorPlugin,
			contentScriptId,
			'./contentScript.js'
		);

		const dialogs = joplin.views.dialogs;
		const handle = await dialogs.create('tableEditorDialog');
		await dialogs.setFitToContent(handle, false);
		await dialogs.addScript(handle, './webview.css');
		await dialogs.addScript(handle, './webview.js');
		await dialogs.setButtons(handle, [
			{ id: 'apply', title: 'Applica' },
			{ id: 'cancel', title: 'Annulla' },
		]);

		await joplin.commands.register({
			name: 'tableEditor.open',
			label: 'Modifica tabella',
			iconName: 'fas fa-edit',
			execute: async () => {
				const info: any = await joplin.commands.execute('editor.execCommand', {
					name: 'tableEditor.getTable',
				});
				if (!info || typeof info.text !== 'string') {
					await dialogs.showMessageBox('Nessuna tabella trovata sotto il cursore.');
					return;
				}

				const table = parseTable(info.text);
				if (!table) {
					await dialogs.showMessageBox('Il testo sotto il cursore non è una tabella Markdown valida.');
					return;
				}

				await dialogs.setHtml(
					handle,
					`<form name="f">
						<input type="hidden" name="data" id="data" value="${esc(JSON.stringify(table))}" />
						<div id="grid"></div>
					</form>`
				);

				const result = await dialogs.open(handle);
				if (result.id !== 'apply') return;

				const edited = JSON.parse(result.formData.f.data);
				await joplin.commands.execute('editor.execCommand', {
					name: 'tableEditor.replaceRange',
					args: [info.from, info.to, serializeTable(edited)],
				});
			},
		});

		await joplin.views.toolbarButtons.create(
			'tableEditorButton',
			'tableEditor.open',
			ToolbarButtonLocation.EditorToolbar
		);
		await joplin.views.menuItems.create(
			'tableEditorMenu',
			'tableEditor.open',
			MenuItemLocation.Tools
		);
	},
});