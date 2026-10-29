export default (_context: { contentScriptId: string }) => {
	return {
		plugin: (codeMirrorWrapper: any) => {
			codeMirrorWrapper.registerCommand('tableEditor.getTable', () => {
				const doc = codeMirrorWrapper.editor.state.doc;
				const pos = codeMirrorWrapper.editor.state.selection.main.head;
				const isRow = (n: number) => doc.line(n).text.includes('|');

				const current = doc.lineAt(pos).number;
				if (!isRow(current)) return null;

				let start = current;
				let end = current;
				while (start > 1 && isRow(start - 1)) start--;
				while (end < doc.lines && isRow(end + 1)) end++;

				const from = doc.line(start).from;
				let to = doc.line(end).to;
				if (end + 2 <= doc.lines && doc.line(end + 1).text.trim() === '' && doc.line(end + 2).text.startsWith('[//]: # (tf:')) {
					to = doc.line(end + 2).to;
				}
				return { from, to, text: doc.sliceString(from, to) };
			});

			codeMirrorWrapper.registerCommand('tableEditor.replaceRange', (from: number, to: number, text: string) => {
				codeMirrorWrapper.editor.dispatch({ changes: { from, to, insert: text } });
			});
		},
	};
};