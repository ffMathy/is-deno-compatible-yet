import {$, file} from 'bun';
import { glob } from 'glob'
import { writeFile } from 'fs/promises';

// get latest deno
await $`git submodule update --remote --merge deno`

const testJsonConfigFileText = await file('deno/tests/node_compat/config.jsonc').text();
const jsonConfigFileWithCommentsRemoved = testJsonConfigFileText
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');
const jsonConfigObject = JSON.parse(jsonConfigFileWithCommentsRemoved);
const categories = Object.keys(jsonConfigObject.tests);

const finalResult = new Array<any>();
for(const category of categories) {
    const testsImplemented = jsonConfigObject.tests[category];
    const allTestFilePaths = await glob(`deno/tests/node_compat/test/${category}/*`);
    const allTestFileNames = allTestFilePaths.map(path => path.split('/').pop());

    finalResult.push(...allTestFileNames.map(testFileName => {
        return {
            name: category + "/" + testFileName,
            implemented: testsImplemented.includes(testFileName)
        }
    }));
}

// persist to a JSON file in the react app public folder
const jsonFilePath = `app/public/tests.json`;
await writeFile(jsonFilePath, JSON.stringify(finalResult, null, 1));