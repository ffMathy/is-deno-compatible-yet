import React, { useEffect, useState } from 'react';
import './App.css';
import { chain } from 'lodash';
import { TestCoverage, TestCoverageReport } from '../../types';
import { format } from 'date-fns';
import { LineChart } from '@mui/x-charts';

function App() {
  const [testCoverageReport, setTestCoverageReport] = React.useState<TestCoverageReport>();
  useEffect(() => {
    async function effect() {
      const response = await fetch('/is-deno-compatible-yet/tests.json');
      const tests = await response.json() as TestCoverageReport;
      setTestCoverageReport(tests);
    }

    effect();
  }, []);

  const [historyDates, setAvailableHistoryDates] = useState<Date[]>([]);
  useEffect(() => {
    async function effect() {
      const response = await fetch('/is-deno-compatible-yet/history/index.txt');
      if (response.status !== 200) {
        console.warn('No history available');
        return;
      }

      const text = await response.text();
      setAvailableHistoryDates(chain(text)
        .split('\n')
        .map(x => x.trim())
        .filter(x => !!x)
        .map(x => new Date(x))
        .filter(x => !isNaN(x.getTime()))
        .uniq()
        .orderBy()
        .value());
    }

    effect();
  }, []);

  const [historyPoints, setHistoryPoints] = useState<{ date: string, percentage: number }[]>([]);
  useEffect(() => {
    async function effect() {
      const promises = historyDates.map(async date => {
        const response = await fetch(`/is-deno-compatible-yet/history/${date.toISOString().replace(/:/g, "_")}.json`);
        const tests = await response.json() as TestCoverageReport;
        return {
          date: date.toISOString(),
          percentage: getPercentageCompatible(tests)
        }
      });

      setHistoryPoints([
        ...await Promise.all(promises),
        testCoverageReport ? 
          {
            date: testCoverageReport?.date ?? '',
            percentage: getPercentageCompatible(testCoverageReport)
          } : 
          undefined
        ]
        .filter(x => !!x)
        .map(x => x!)
      );
    }

    effect();
  }, [historyDates, testCoverageReport]);

  if (!testCoverageReport) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <header>
        <h1>Deno 2 is <b>{getPercentageCompatible(testCoverageReport)}%</b> compatible with the Node.js test suite</h1>
        <p><b>{getAmountImplemented(testCoverageReport)}</b> tests implemented out of <b>{getTotalAmount(testCoverageReport)}</b></p>
        <p><i>Last checked: <b>{testCoverageReport.date}</b></i></p>
      </header>
      <main>
        <section style={{
          marginBottom: '5vh'
        }}>
          <LineChart
            height={200}
            series={[{ data: historyPoints.map(x => x.percentage) }]}
            xAxis={[{ data: historyPoints.map(x => format(x.date, 'MMM do yyyy')), scaleType: 'band', label: 'Date' }]}
            yAxis={[{ scaleType: 'linear', label: '% compatibility', max: 100, min: 0 }]}
          />
        </section>
        <section>
          {Object.keys(getTestsGroupedByPath(testCoverageReport)).map(groupName => {
            const tests = getTestsGroupedByPath(testCoverageReport)[groupName];
            return <TestCategory key={groupName} categoryName={groupName} tests={tests} />
          })}
        </section>
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

function getAmountImplemented(testCoverageReport: TestCoverageReport | undefined) {
  return testCoverageReport?.coverage.filter(test => test.implemented).length ?? 0;
};

function getTests(testCoverageReport: TestCoverageReport | undefined) {
  return chain(testCoverageReport?.coverage || [])
    .sortBy(x => !x.implemented)
    .value();
}

function getTestsGroupedByPath(testCoverageReport: TestCoverageReport | undefined) {
  return chain(getTests(testCoverageReport))
    .groupBy(test => test.name.substring(0, test.name.lastIndexOf('/')))
    .value();
}

function getTotalAmount(testCoverageReport: TestCoverageReport | undefined) {
  return testCoverageReport?.coverage.length ?? 0;
}

function getPercentageCompatible(testCoverageReport: TestCoverageReport | undefined) {
  if (!getTotalAmount || !testCoverageReport) {
    return 0;
  }

  return Math.round(getAmountImplemented(testCoverageReport) / getTotalAmount(testCoverageReport) * 100);
}