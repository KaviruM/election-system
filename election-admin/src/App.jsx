import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const JsonFileUpload = () => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadedData, setUploadedData] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    wsRef.current = new WebSocket('ws://localhost:3001');

    wsRef.current.onopen = () => setConnected(true);
    wsRef.current.onclose = () => setConnected(false);
    wsRef.current.onerror = () => setError('Connection failed');

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'update') {
        setSuccess('Data uploaded successfully!');
        setUploadedData(data.data[data.data.length - 1]);
      } else if (data.type === 'error') {
        setError(data.message);
      }
    };

    return () => wsRef.current?.close();
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setError('Please select a JSON file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        wsRef.current.send(JSON.stringify({
          type: 'json_upload',
          fileName: file.name,
          jsonData
        }));
        setError('');
      } catch {
        setError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className='container'>
      <h2>Election Data Upload</h2>
      
      <div className='status'>
        Status: {connected ? '✅ Connected' : '❌ Disconnected'}
      </div>

      <input
        type="file"
        accept=".json"
        onChange={handleFileUpload}
        disabled={!connected}
        className='file-input'
      />

      {error && <div className='error'>{error}</div>}
      {success && <div className='success'>{success}</div>}

      {uploadedData && (
        <div className='uploaded-data'>
          <h3>Uploaded: {uploadedData.ed_name}</h3>
          <p>Code: {uploadedData.ed_code}</p>
          <p>Valid Votes: {uploadedData.summary?.valid?.toLocaleString()}</p>
          <p>Rejected Votes: {uploadedData.summary?.rejected?.toLocaleString()}</p>
          <p>Total Polled: {uploadedData.summary?.polled?.toLocaleString()}</p>
          <p>Percent Polled: {uploadedData.summary?.percent_polled}%</p>
          <p>Parties: {uploadedData.by_party?.length}</p>

          <div className='party-results'>
            <h4>Party Results:</h4>
            <ul>
              {uploadedData.by_party?.map((party) => (
                <li key={party.party_name}>
                  {party.candidate}: {party.votes.toLocaleString()} votes ({party.percent}%)
                </li>
              ))}
            </ul>
          </div>
        </div>
        
      )}
    </div>
  );
};

export default JsonFileUpload;