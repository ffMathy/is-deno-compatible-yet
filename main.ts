import { getDenoTests, getNodeTests } from "./deno/tests/node_compat/runner/setup.ts";
import { TestCoverage, TestCoverageReport } from './types.ts';

const nodeTests = await getNodeTests();
const portedTests = await getDenoTests();

const finalResult = new Array<TestCoverage>();
finalResult.push(...nodeTests.map(testFileName => {
    return {
        name: testFileName,
        implemented: portedTests.includes(testFileName)
    } as TestCoverage;
}));

// persist to a JSON file in the react app public folder
const jsonFilePath = `app/public/tests.json`;
await Deno.writeTextFile(jsonFilePath, JSON.stringify({
    coverage: finalResult,
    date: new Date().toISOString()
} as TestCoverageReport, null, 1));