import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { chain } from 'lodash';
import { TestCoverage, TestCoverageReport } from '../../types';

function App() {
  const [testCoverageReport, setTestCoverageReport] = React.useState<TestCoverageReport>();
  useEffect(() => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/is-deno-compatible-yet/tests.json');
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const tests = JSON.parse(xhr.responseText) as TestCoverageReport;
          setTestCoverageReport(tests);
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      } else {
        console.error("Request failed with status " + xhr.status);
      }
    };
    xhr.onerror = () => console.error('Network error');
    xhr.send();
  }, []);

  const tests = useMemo(() => {
    return chain(testCoverageReport?.coverage || [])
      .sortBy(x => !x.implemented)
      .value();
  }, [testCoverageReport]);

  const testsGroupedByPath = useMemo(() => {
    return chain(tests)
      .groupBy(test => test.name.substring(0, test.name.lastIndexOf('/')))
      .value();
  }, [tests])

  const amountImplemented = useMemo(() => {
    return testCoverageReport?.coverage.filter(test => test.implemented).length;
  }, [testCoverageReport]);

  const amountTotal = useMemo(() => {
    return testCoverageReport?.coverage.length;
  }, [testCoverageReport]);

  const percentageCompatible = useMemo(() => {
    if (!amountTotal || !amountImplemented) {
      return 0;
    }

    return Math.round(amountImplemented / amountTotal * 100);
  }, [amountImplemented, amountTotal]);

  if (!testCoverageReport) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <header>
        <h1>Deno 2 is <b>{percentageCompatible}%</b> compatible with the Node.js test suite</h1>
        <p><b>{amountImplemented}</b> tests implemented out of <b>{amountTotal}</b></p>
        <p><i>Last checked: <b>{testCoverageReport.date}</b></i></p>
      </header>
      <main>
        {Object.keys(testsGroupedByPath).map(groupName => {
          const tests = testsGroupedByPath[groupName];
          return <TestCategory key={groupName} categoryName={groupName} tests={tests} />
        })}
      </main>
    </>
  );
}

function TestCategory(props: {
  tests: TestCoverage[],
  categoryName: string
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const tests = props.tests;

  const areAllImplemented = tests.every(x => x.implemented);
  const areAllMissing = tests.every(x => !x.implemented);

  const amountMissing = tests.filter(x => !x.implemented).length;
  const amountImplemented = tests.length - amountMissing;
  const percentageImplemented = Math.round(amountImplemented / tests.length * 100);

  const className = areAllImplemented ? 
    'implemented' : 
    areAllMissing ? 
      'missing' : 
      'partial';

  return (
    <div className={`test-category ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <table>
        <thead>
          <tr className={className} onClick={() => {
              setIsExpanded(!isExpanded);
            }}>
            <th className="status"></th>
            <th className="name"><b>{props.categoryName}</b> <span><b>{percentageImplemented}%</b></span> <span><b>{amountImplemented}</b> of <b>{tests.length}</b></span></th>
          </tr>
        </thead>
        <tbody>
          {tests.map(test => (
            <tr key={test.name} className={`test ${test.implemented ? 'implemented' : 'missing'}`}>
              <td className="status"></td>
              <td className="name">
                {test.name.substring(props.categoryName.length + 1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App;
