export type TestCoverage = {
    name: string,
    implemented: boolean
}

export type TestCoverageReport = {
    date: string,
    coverage: TestCoverage[]
}