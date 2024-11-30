import {$, file} from 'bun';
import { glob } from 'glob'
import { writeFile } from 'fs/promises';
import {relative } from 'path';
import { uniq } from 'lodash';

console.info('Updating Deno tests...');
await $`git submodule update --recursive --init --remote --merge deno`

const testJsonConfigFileText = await file('deno/tests/node_compat/config.jsonc').text();
const jsonConfigFileWithCommentsRemoved = testJsonConfigFileText
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');
const jsonConfigObject = JSON.parse(jsonConfigFileWithCommentsRemoved);

const basePath = 'deno/tests/node_compat/runner/suite/test';
const availableCategoryPaths = await glob('deno/tests/node_compat/runner/suite/test/**/*');
const categories = uniq(availableCategoryPaths.map(path => {
    const relativePath = relative(basePath, path);
    return relativePath.substring(0, relativePath.lastIndexOf('/'))
}));

const finalResult = new Array<any>();
for(const category of categories) {
    if(!category) {
        continue;
    }

    const testsIgnored = jsonConfigObject.ignore[category] || [];
    const testsWindowsIgnored = jsonConfigObject.windowsIgnore[category] || [];
    const testsDarwinIgnored = jsonConfigObject.darwinIgnore[category] || [];
    const testsImplemented = jsonConfigObject.tests[category] || [];
    
    const categoryBasePath = `${basePath}/${category}`;
    const allTestFilePaths = await glob(`${categoryBasePath}/*`);
    const allTestFileNames = allTestFilePaths.map(path => relative(categoryBasePath, path));
    
    console.info('Processing category:', category, allTestFileNames, testsImplemented, testsIgnored.length + testsWindowsIgnored.length + testsDarwinIgnored.length);
    console.info();

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
await writeFile(jsonFilePath, JSON.stringify({
    coverage: finalResult,
    date: new Date().toISOString()
} as TestCoverageReport, null, 1));