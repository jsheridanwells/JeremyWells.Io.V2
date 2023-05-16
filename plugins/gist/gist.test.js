jest.mock('./requestWrapper');
const request = require('./requestWrapper');
const { gist } = require('./gist');

const createAPIResponse = (fileName, contentText) =>
    ((copyFileName, copyContentText) => {
        let fileName = copyFileName;
        let contentText = copyContentText;
        return {
            getResponse() {
                return {
                    files: { [fileName]: { content: contentText } }
                };
            },

            addFileToResponse(fileName, contentText) {
                const response = this.getResponse();
                response.files[fileName] = { content: contentText };
                return response;
            }
        }
    })(fileName, contentText);

const createOpts = () => {
    return { authToken: '12345', userAgent: 'dave grohl' };
};

describe('gist() : ', () => {
    test('if called w/o authToken or userAgent does not call github API', async () => {
        const testObj = createAPIResponse('01.sh', ' echo hello > myfile.txt ').getResponse();
        request.mockResolvedValue(testObj);
        const opts = null;
        const result = await gist('', '', opts);
        expect(request).not.toHaveBeenCalled();
        expect(result).toBe('');
    });

    test('if github not verified, returns empty string', async () => {
        request.mockRejectedValue(new Error('API error: statusCode = 401'));
        const opts = createOpts();
        const result = await gist('', '', opts);
        expect(result).toBe('');
    });

    test('extracts content if response contains data', async () => {
        const testObj = createAPIResponse('01.sh', ' echo hello > myfile.txt ').getResponse();
        request.mockResolvedValue(testObj);
        const opts = createOpts();
        const result = await gist('12345', '01.sh', opts);
        expect(result).toContain(testObj.files['01.sh'].content);
    });

    test('extracts content if response contains files', async () => {
        const testObj = createAPIResponse('01.sh', ' echo hello > myfile.txt ').getResponse();
        request.mockResolvedValue(testObj);
        const opts = createOpts();
        const result = await gist('12345', '01.sh', opts);
        expect(result).toContain(testObj.files['01.sh'].content);
    });

    test('extracts expected file from two files', async () => {
        const apiResponse = createAPIResponse('01.sh', ' echo hello > myfile.txt ');
        const testObj = apiResponse.addFileToResponse('02.sh', ' echo goodbye > myOtherFile.txt ')
        request.mockResolvedValue(testObj);
        const opts = createOpts();
        const result = await gist('12345', '02.sh', opts);
        expect(result).toContain(testObj.files['02.sh'].content);
    });

    test('throws error if expected file not found', async () => {
        const testObj = createAPIResponse('01.sh', ' echo hello > myfile.txt ').getResponse();
        request.mockResolvedValue(testObj);
        const opts = createOpts();
        const result = await gist('12345', 'i_dont_exist.rb', opts);
        expect(result).toContain('');
    });

    test('builds expected string to include in Markdown file', async () => {
        const expected = '```bash \n echo hello > myfile.txt \n```';
        const testObj = createAPIResponse('01.sh', ' echo hello > myfile.txt ').getResponse();
        request.mockResolvedValue(testObj);
        const opts = createOpts();
        const result = await gist('12345', '01.sh', opts);
        expect(result.replace(/\s/g, '')).toBe(expected.replace(/\s/g, ''));
    });

    test('looks up expected language type', async () => {
        const testObj = createAPIResponse('01.sh', ' echo hello > myfile.txt ').getResponse();
        request.mockResolvedValue(testObj);
        const opts = createOpts();
        const result = await gist('12345', '01.sh', opts);
        expect(result).toContain('bash');
    });

    test('returns content w/ empty language type if not found', async () => {
        const testObj = createAPIResponse('01.docx', ' echo hello > myfile.txt ').getResponse();
        request.mockResolvedValue(testObj);
        const opts = createOpts();
        const result = await gist('12345', '01.docx', opts);
        expect(result).not.toContain('docs');
    });
});
