type TestCoverage = {
    name: string,
    implemented: boolean
}

type TestCoverageReport = {
    date: string,
    coverage: TestCoverage[]
}