import {$, file} from 'bun';
import { glob } from 'glob'
import { writeFile } from 'fs/promises';

console.info('Updating Deno tests...');
await $`git submodule update --recursive --init --remote --merge deno`

const testJsonConfigFileText = await file('deno/tests/node_compat/config.jsonc').text();
const jsonConfigFileWithCommentsRemoved = testJsonConfigFileText
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');
const jsonConfigObject = JSON.parse(jsonConfigFileWithCommentsRemoved);

const availableCategoryPaths = await glob('deno/tests/node_compat/runner/suite/test/*');
const categories = availableCategoryPaths.map(path => path.split('/').pop()!);

const finalResult = new Array<any>();
for(const category of categories) {
    console.info('Processing category:', category);

    const testsIgnored = jsonConfigObject.ignore[category] || [];
    const testsWindowsIgnored = jsonConfigObject.windowsIgnore[category] || [];
    const testsDarwinIgnored = jsonConfigObject.darwinIgnore[category] || [];
    const testsImplemented = jsonConfigObject.tests[category] || [];
    const allTestFilePaths = await glob(`deno/tests/node_compat/test/${category}/*`);
    const allTestFileNames = allTestFilePaths.map(path => path.split('/').pop());

    finalResult.push(...allTestFileNames.map(testFileName => {
        return {
            name: category + "/" + testFileName,
            implemented: 
                testsImplemented.includes(testFileName) && 
                !testsIgnored.includes(testFileName) &&
                !testsWindowsIgnored.includes(testFileName) &&
                !testsDarwinIgnored.includes(testFileName)
        } as TestCoverage;
    }));
}

// persist to a JSON file in the react app public folder
const jsonFilePath = `app/public/tests.json`;
await writeFile(jsonFilePath, JSON.stringify(finalResult, null, 1));