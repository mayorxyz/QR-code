import { useEffect, useState } from 'react';
import { runDiagnostic } from '../lib/diagnostic';

export function DiagnosticPage() {
  const [results, setResults] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    runDiagnosticTest();
  }, []);

  const runDiagnosticTest = async () => {
    setRunning(true);
    console.log('Starting diagnostic...');
    const results = await runDiagnostic();
    console.log('Diagnostic complete:', results);
    setResults(results);
    setRunning(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">QR Tile Export Diagnostic</h1>
      
      {running && (
        <div className="mb-4 p-4 bg-yellow-100 border-2 border-yellow-500 rounded">
          Running diagnostic tests...
        </div>
      )}
      
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Results Summary</h2>
          <table className="w-full border-collapse border-2 border-black">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-left">Test</th>
                <th className="border border-black p-2 text-center">Pass</th>
                <th className="border border-black p-2 text-left">Decoded</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, i) => (
                <tr key={i} className={result.pass ? 'bg-green-50' : 'bg-red-50'}>
                  <td className="border border-black p-2">{result.test}</td>
                  <td className="border border-black p-2 text-center">
                    {result.pass ? '✓' : '✗'}
                  </td>
                  <td className="border border-black p-2 font-mono text-sm">
                    {result.decoded || 'null'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-500 rounded">
            <h3 className="font-bold mb-2">Check Browser Console</h3>
            <p>Full diagnostic output with details is in the browser console (F12).</p>
          </div>
        </div>
      )}
    </div>
  );
}
