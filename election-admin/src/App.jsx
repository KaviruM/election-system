import React, { useState, useEffect, useRef } from 'react';

const JsonFileUpload = () => {
  const [jsonData, setJsonData] = useState(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [serverResponse, setServerResponse] = useState('');
  const [electoralData, setElectoralData] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
// websocket connection setup
    wsRef.current = new WebSocket('ws://localhost:3001');

    wsRef.current.onopen = () => {
      console.log('Connected to WebSocket server');
      setConnected(true);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        setServerResponse(`Server: ${response.message}`);
        
        if (response.type === 'electoral_data') {
          setElectoralData(response.data);
        }
      } catch (error) {
        setServerResponse(`Server: ${event.data}`);
      }
    };

    wsRef.current.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setConnected(false);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Failed to connect to server');
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    
    if (!file) return;

    // Check if file is JSON
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setError('Please select a valid JSON file');
      return;
    }

    setError('');
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parsedJson = JSON.parse(content);
        setJsonData(parsedJson);
        setError('');

        // Send JSON data to WebSocket server
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const message = {
            type: 'json_upload',
            fileName: file.name,
            jsonData: parsedJson
          };
          wsRef.current.send(JSON.stringify(message));
        } else {
          setError('WebSocket connection not available');
        }

      } catch (err) {
        setError('Invalid JSON format');
        setJsonData(null);
      }
    };

    reader.onerror = () => {
      setError('Error reading file');
    };

    reader.readAsText(file);
  };

  return (
    <div>
      <div>
        Connection Status: {connected ? '✅ Connected' : '❌ Disconnected'}
      </div>
      
      <input
        type="file"
        accept=".json,application/json"
        onChange={handleFileUpload}
        disabled={!connected}
      />
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {serverResponse && (
        <p style={{ color: 'green' }}>{serverResponse}</p>
      )}
      
      {electoralData && (
        <div>
          <h3>Electoral Data:</h3>
          <div>
            <h4>District Info:</h4>
            <p>Code: {electoralData.ed_code}</p>
            <p>Name: {electoralData.ed_name}</p>
          </div>
          
          <div>
            <h4>Summary:</h4>
            <p>Valid Votes: {electoralData.summary && electoralData.summary.valid ? electoralData.summary.valid.toLocaleString() : 'N/A'}</p>
            <p>Rejected Votes: {electoralData.summary && electoralData.summary.rejected ? electoralData.summary.rejected.toLocaleString() : 'N/A'}</p>
            <p>Total Polled: {electoralData.summary && electoralData.summary.polled ? electoralData.summary.polled.toLocaleString() : 'N/A'}</p>
            <p>Total Electors: {electoralData.summary && electoralData.summary.electors ? electoralData.summary.electors.toLocaleString() : 'N/A'}</p>
            <p>Turnout: {electoralData.summary && electoralData.summary.percent_polled ? electoralData.summary.percent_polled + '%' : 'N/A'}</p>
          </div>

          <div>
            <h4>Party Results:</h4>
            <table border="1" style={{borderCollapse: 'collapse', width: '100%'}}>
              <thead>
                <tr>
                  <th>Party</th>
                  <th>Candidate</th>
                  <th>Votes</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {electoralData.by_party && electoralData.by_party.map((party, index) => (
                  <tr key={index}>
                    <td>{party.party_name || 'N/A'}</td>
                    <td>{party.candidate || 'N/A'}</td>
                    <td>{party.votes ? party.votes.toLocaleString() : 'N/A'}</td>
                    <td>{party.percentage ? party.percentage + '%' : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonFileUpload;