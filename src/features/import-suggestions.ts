export class ImportSuggestions {

    constructor() {
    }

    public getImportSuggestions(client: any, buffer: any, pos: any, symbol: any, callback = this.useFirst) : void {

        const file = buffer.getPath();

        const req = {
            typehint: 'ImportSuggestionsReq',
            file: file,
            point: pos,
            names: [symbol],
            maxResults: 10
        };

        client.post(req, callback);
    }

    private useFirst = (res) => {
        //# TODO: Add ui for selection
        const name = res.symLists[0][0].name;
    };

}